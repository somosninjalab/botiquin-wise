import { createFileRoute } from "@tanstack/react-router";
import Firecrawl from "@mendable/firecrawl-js";
import * as cheerio from "cheerio";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type PharmRow = { id: string; slug: string; name: string; website_url: string | null };
type PharmRowWithSearch = PharmRow & { search_url_template: string | null };
type MedRow = {
  id: string;
  name: string;
  active_ingredient: string;
  presentation: string | null;
  brand_names?: string[] | null;
};
type Extracted = { price: number; currency: string; in_stock: boolean; product_url: string };
type ExtractedFull = Extracted & { image_url: string | null };

// Per-currency sanity ranges. Anything outside is rejected — typical retail
// medication prices in Venezuela are between Bs. 50 and Bs. 5,000,000.
const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  VES: { min: 30, max: 5_000_000 },
  USD: { min: 0.3, max: 500 },
  EUR: { min: 0.3, max: 500 },
};

// Hostnames where we know precios published on lander/home pages are noise.
const HOST_BLACKLIST_PATHS: Record<string, RegExp> = {
  "maraplus.com": /^\/(lander|home|inicio)?\/?$/i,
};

// Strip protocol + www to use as a `site:` filter.
function siteHost(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const extractionPrompt = `From this pharmacy product page, extract the medication's actual listed price. Return strict JSON with fields:
- price: numeric or string price exactly as shown (e.g. 242,55, "Bs 1.234,56", "$ 4.99"). Do not invent prices.
- currency: one of "VES", "USD", or the symbol/code seen on the page ("Bs", "Bs.", "Bs.S", "BsS", "$", "USD", "US$"). Empty string if unknown.
- in_stock: true unless explicitly marked out of stock / agotado / sin existencias.
- product_url: canonical URL of the product, or empty string.
- image_url: absolute URL of the main product photo (the medication packaging image). Empty string if none.
Ignore unrelated suggestions, carts, shipping, discounts without a final product price, and search pages with multiple products. If no product price is visible, set price to 0.`;

// --- Normalization helpers --------------------------------------------------

/** Parse a price expressed as number or in many string formats (es-VE, en-US). */
function parsePrice(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw > 0 ? raw : null;
  if (typeof raw !== "string") return null;
  // Strip currency symbols, codes, spaces, NBSPs.
  let s = raw.replace(/[\s\u00A0]/g, "").replace(/(usd|ves|cop|bs\.?s?|us\$|\$|€)/gi, "");
  if (!s) return null;
  // Detect decimal separator: if both "," and "." appear, the LAST one is the decimal.
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    // Only commas: treat last comma as decimal if followed by 1-2 digits, else thousands sep.
    const decimals = s.length - lastComma - 1;
    if (decimals > 0 && decimals <= 2) s = s.slice(0, lastComma).replace(/,/g, "") + "." + s.slice(lastComma + 1);
    else s = s.replace(/,/g, "");
  } else if (lastDot !== -1) {
    const decimals = s.length - lastDot - 1;
    if (decimals === 3 && s.split(".").length > 1) s = s.replace(/\./g, ""); // 1.234 → thousands
  }
  // Drop anything that isn't digits, dot or minus.
  s = s.replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Normaliza la moneda. Para hosts conocidos, el host es AUTORITATIVO
 * porque el LLM frecuentemente confunde "$" o "Bs" y devuelve "USD" por defecto.
 */
function normalizeCurrency(raw: unknown, contextHost?: string | null): string {
  const hostGuess = guessByHost(contextHost);
  // Si conocemos el host con certeza, no confiamos en el LLM.
  if (hostGuess && hostGuess !== "USD") return hostGuess;
  const s = String(raw ?? "").trim().toUpperCase().replace(/\./g, "");
  if (!s) return hostGuess || "USD";
  if (/^VES$|^VEF$|^BS$|^BSS$|BOL[IÍ]VAR/i.test(s)) return "VES";
  if (/^COP$|PESO/i.test(s)) return "COP";
  if (/^EUR$|€/.test(s)) return "EUR";
  if (/USD|US\$|^\$$|^US$/.test(s)) return "USD";
  if (/^[A-Z]{3}$/.test(s)) return s;
  return hostGuess || "USD";
}

function guessByHost(host?: string | null): string {
  if (!host) return "USD";
  if (/\.com\.ve$|farmatodo|farmago|gopharma|locatel\.com\.ve|cinecitta|farmaciasaas|tufarmaciaactual|maraplus/i.test(host))
    return "VES";
  return "USD";
}

function hostsMatch(candidateUrl: string, expectedHost: string | null): boolean {
  if (!expectedHost) return false;
  try {
    const candidateHost = new URL(candidateUrl).host.replace(/^www\./, "");
    return candidateHost === expectedHost.replace(/^www\./, "");
  } catch {
    return false;
  }
}

function isSpecificProductUrl(url: string, host: string | null): boolean {
  if (!hostsMatch(url, host)) return false;
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    if (!path || path === "/") return false;
    // Reject obvious non-product pages.
    if (/\/(lander|search|login|signup|cart|checkout|category|categoria|categorias|categories|inicio|home|nosotros|about|contacto|sucursales|tag|tags|coleccion|collection|catalogo|catalog|brand|marca)(\/|$)/i.test(path)) {
      return false;
    }
    // Reject host-specific noise paths.
    const hostKey = (host ?? "").replace(/^www\./, "");
    const bad = HOST_BLACKLIST_PATHS[hostKey];
    if (bad && bad.test(path)) return false;
    // Reject pages that are clearly listings (no slug detail).
    if (u.search && /[?&](page|order|category|sort|max_price|min_price)=/i.test(u.search)) {
      return false;
    }
    if (path.split("/").filter(Boolean).length < 1) return false;
    return /producto|product|\/p\/|\/p$|-\d+\/p$|\d{5,}|\/shop\/[^/]+/i.test(path);
  } catch {
    return false;
  }
}

function asBool(v: unknown, dflt = true): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["false", "0", "no", "out", "agotado", "sin stock", "unavailable"].includes(s)) return false;
    if (["true", "1", "yes", "in stock", "disponible", "available"].includes(s)) return true;
  }
  return dflt;
}

function asUrl(v: unknown, fallback: string): string {
  const s = String(v ?? "").trim();
  if (!s) return fallback;
  try {
    return new URL(s).toString();
  } catch {
    return fallback;
  }
}

/** Normalize the JSON returned by Firecrawl into our DB shape, or null if unusable. */
function normalizeExtraction(j: any, sourceUrl: string, host: string | null): Extracted | null {
  if (!j || typeof j !== "object") return null;
  // Accept many possible field names from imperfect LLM output.
  const rawPrice =
    j.price ?? j.precio ?? j.lowest_price ?? j.amount ?? j.value ?? j.price_value;
  const rawCurrency =
    j.currency ?? j.moneda ?? j.currency_code ?? j.price_currency ?? "";
  const rawStock =
    j.in_stock ?? j.inStock ?? j.available ?? j.disponible ?? j.stock ?? true;
  const rawUrl = j.product_url ?? j.url ?? j.link ?? "";

  const price = parsePrice(rawPrice);
  if (price === null) return null;
  const currency = normalizeCurrency(rawCurrency, host) || "USD";
  const productUrl = asUrl(rawUrl, sourceUrl);
  if (!isSpecificProductUrl(productUrl, host)) return null;
  return {
    price,
    currency: currency.slice(0, 8),
    in_stock: asBool(rawStock, true),
    product_url: productUrl,
  };
}

function pickImageUrl(j: any, sourceUrl: string): string | null {
  const raw =
    j?.image_url ?? j?.image ?? j?.imageUrl ?? j?.thumbnail ?? j?.photo ?? j?.picture ?? "";
  const s = String(raw ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(s, sourceUrl).toString();
    if (!/^https?:\/\//i.test(u)) return null;
    // skip obvious tracking pixels / sprites
    if (/sprite|pixel|blank|placeholder/i.test(u)) return null;
    return u;
  } catch {
    return null;
  }
}

function extractDose(med: MedRow): string {
  return (med.name.match(/\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|ui)/i)?.[0] ?? "").trim();
}

function buildQueryVariants(med: MedRow): string[] {
  const variants = new Set<string>();
  const dose = extractDose(med);
  const ai = med.active_ingredient.trim();
  if (ai) {
    variants.add(dose ? `${ai} ${dose}` : ai);
    variants.add(ai);
  }
  variants.add(med.name);
  for (const b of med.brand_names ?? []) {
    if (!b) continue;
    variants.add(dose ? `${b} ${dose}` : b);
  }
  return Array.from(variants).filter(Boolean).slice(0, 6);
}

/** Normaliza para matching tolerante: minúsculas, sin tildes, sin signos. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verifica que el contenido de la página realmente corresponda al medicamento
 * buscado. Acepta si menciona principio activo o cualquier marca, y opcionalmente
 * la dosis cuando ésta forma parte del nombre.
 */
function pageMatchesMed(content: string, med: MedRow): boolean {
  const text = norm(content);
  if (!text) return false;
  const ai = norm(med.active_ingredient);
  const brands = (med.brand_names ?? []).map(norm).filter(Boolean);
  const dose = norm(extractDose(med));
  const aiHit = !!ai && text.includes(ai);
  const brandHit = brands.some((b) => !!b && text.includes(b));
  if (!aiHit && !brandHit) return false;
  // Si el med trae dosis, exigir que aparezca para evitar agarrar otra concentración
  // muy distinta. Permisivo: aceptamos si hay AI hit aunque dosis no concuerde,
  // pero solo cuando no haya OTRA dosis del mismo principio activo en la página.
  if (dose) {
    if (text.includes(dose.replace(/\s+/g, ""))) return true;
    if (text.includes(dose)) return true;
    // Dosis no encontrada — aún así aceptamos si hay match de marca + AI.
    return aiHit && brandHit;
  }
  return true;
}

function priceWithinRange(amount: number, currency: string): boolean {
  const r = PRICE_RANGES[currency.toUpperCase()];
  if (!r) return amount > 0;
  return amount >= r.min && amount <= r.max;
}

async function searchCandidates(
  fc: Firecrawl,
  host: string,
  query: string,
  limit = 4,
): Promise<string[]> {
  try {
    const res: any = await fc.search(`site:${host} ${query}`, { limit } as any);
    const items: any[] = res?.web ?? res?.data ?? res?.results?.web ?? [];
    return items
      .map((x) => x?.url)
      .filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u));
  } catch {
    return [];
  }
}

async function mapCandidates(
  fc: Firecrawl,
  websiteUrl: string,
  query: string,
  limit = 6,
): Promise<string[]> {
  try {
    const mapRes: any = await fc.map(websiteUrl, {
      search: query,
      limit,
      includeSubdomains: false,
    } as any);
    const rawLinks: any[] = mapRes?.links ?? mapRes?.data?.links ?? [];
    return rawLinks
      .map((l) => (typeof l === "string" ? l : l?.url))
      .filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u));
  } catch {
    return [];
  }
}

async function scrapeUrl(
  fc: Firecrawl,
  url: string,
  host: string | null,
  med: MedRow,
): Promise<ExtractedFull | null> {
  try {
    const res: any = await fc.scrape(url, {
      formats: ["markdown", { type: "json", prompt: extractionPrompt } as any] as any,
      onlyMainContent: true,
    } as any);
    const j = res?.json ?? res?.data?.json ?? res?.extract;
    const md: string =
      res?.markdown ?? res?.data?.markdown ?? res?.metadata?.title ?? "";
    const norm = normalizeExtraction(j, url, host);
    if (!norm) return null;
    // Validación de contenido: la página debe hablar del medicamento.
    if (!pageMatchesMed(`${md}\n${res?.metadata?.title ?? ""}`, med)) {
      console.warn(`[scrape:mismatch] ${url} no menciona ${med.active_ingredient}`);
      return null;
    }
    // Validación de rango de precio.
    if (!priceWithinRange(norm.price, norm.currency)) {
      console.warn(`[scrape:out-of-range] ${url} ${norm.price} ${norm.currency}`);
      return null;
    }
    const ogImage =
      res?.metadata?.ogImage ?? res?.metadata?.["og:image"] ?? res?.data?.metadata?.ogImage ?? null;
    const image_url = pickImageUrl(j, url) ?? (ogImage ? pickImageUrl({ image_url: ogImage }, url) : null);
    return { ...norm, image_url };
  } catch {
    return null;
  }
}

async function scrapeOne(
  fc: Firecrawl,
  med: MedRow,
  pharm: PharmRowWithSearch,
): Promise<ExtractedFull | null> {
  const host = siteHost(pharm.website_url);
  if (!host || !pharm.website_url) return null;
  const variants = buildQueryVariants(med);

  // 1) PRIMARY: use the pharmacy's own internal search bar.
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const q of variants) {
    const internal = await searchOnPharmacySite(fc, pharm, q, host);
    for (const u of internal) {
      if (seen.has(u)) continue;
      if (!isSpecificProductUrl(u, host)) continue;
      seen.add(u);
      candidates.push(u);
      if (candidates.length >= 5) break;
    }
    if (candidates.length >= 3) break;
  }

  // 2) Fallback if pharmacy search yielded nothing: legacy Google + sitemap.
  if (!candidates.length) {
    for (const q of variants) {
      const [s, m] = await Promise.all([
        searchCandidates(fc, host, q, 4),
        mapCandidates(fc, pharm.website_url, q, 6),
      ]);
      for (const u of [...s, ...m]) {
        if (seen.has(u)) continue;
        if (!isSpecificProductUrl(u, host)) continue;
        seen.add(u);
        candidates.push(u);
        if (candidates.length >= 5) break;
      }
      if (candidates.length >= 3) break;
    }
  }

  if (!candidates.length) {
    console.warn(`[scrape:no-candidates] ${pharm.slug} / ${med.name}`);
    return null;
  }

  // 3) Try candidates one by one until we get a valid extraction.
  for (const url of candidates) {
    const norm = await scrapeUrl(fc, url, host, med);
    if (norm) return norm;
  }
  console.warn(`[scrape:no-extract] ${pharm.slug} / ${med.name} (${candidates.length} urls)`);

  // 4) Fallback gratuito: fetch directo + Cheerio (JSON-LD / OpenGraph) y r.jina.ai.
  for (const url of candidates) {
    const fb = await scrapeFreeFallback(url, host, med);
    if (fb) return fb;
  }
  return null;
}

/**
 * Use the pharmacy's OWN internal search bar to find products. This mirrors
 * what a real customer does: type into the site's search and pick the first
 * matching result. Returns a list of absolute product URLs from the listing.
 */
async function searchOnPharmacySite(
  fc: Firecrawl,
  pharm: PharmRowWithSearch,
  query: string,
  host: string,
): Promise<string[]> {
  const tmpl = pharm.search_url_template;
  if (!tmpl) return [];
  const searchUrl = tmpl.replace("{q}", encodeURIComponent(query));

  // 1) Try free fetch first (works for WooCommerce / static SSR results).
  let html = await fetchHtml(searchUrl);
  if (!html) html = await fetchViaJina(searchUrl);
  let urls = html ? extractProductLinks(html, searchUrl, host) : [];

  // 2) If no links (likely JS-rendered), use Firecrawl scrape which executes JS.
  if (!urls.length) {
    try {
      const res: any = await fc.scrape(searchUrl, {
        formats: ["html", "markdown"],
        onlyMainContent: false,
        waitFor: 2500,
      } as any);
      const renderedHtml: string =
        res?.html ?? res?.data?.html ?? res?.rawHtml ?? res?.data?.rawHtml ?? "";
      if (renderedHtml) urls = extractProductLinks(renderedHtml, searchUrl, host);
      // Also harvest links the LLM saw in markdown.
      const md: string = res?.markdown ?? res?.data?.markdown ?? "";
      if (md) {
        const fromMd = Array.from(md.matchAll(/\((https?:\/\/[^)\s]+)\)/g)).map((m) => m[1]);
        for (const u of fromMd) {
          if (isSpecificProductUrl(u, host) && !urls.includes(u)) urls.push(u);
        }
      }
    } catch {
      /* ignore */
    }
  }

  return urls.slice(0, 8);
}

/** Parse a search-results HTML page and return absolute product URLs. */
function extractProductLinks(html: string, baseUrl: string, host: string): string[] {
  try {
    const $ = cheerio.load(html);
    const out: string[] = [];
    const seen = new Set<string>();
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      let abs: string;
      try {
        abs = new URL(href, baseUrl).toString().split("#")[0];
      } catch {
        return;
      }
      if (seen.has(abs)) return;
      if (!isSpecificProductUrl(abs, host)) return;
      seen.add(abs);
      out.push(abs);
    });
    return out;
  } catch {
    return [];
  }
}

// --- Fallback gratuito: fetch directo + Cheerio + r.jina.ai --------------

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-VE,es;q=0.9,en;q=0.8",
};

async function fetchHtml(url: string, timeoutMs = 12000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!/html|xml|json/i.test(ct)) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchViaJina(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "User-Agent": BROWSER_HEADERS["User-Agent"], "X-Return-Format": "html" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function flattenJsonLd(node: any, out: any[] = []): any[] {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const n of node) flattenJsonLd(n, out);
    return out;
  }
  if (typeof node === "object") {
    out.push(node);
    if (node["@graph"]) flattenJsonLd(node["@graph"], out);
  }
  return out;
}

function extractFromHtml(html: string, url: string): {
  price: number | null;
  currency: string;
  in_stock: boolean;
  image_url: string | null;
  title: string;
  text: string;
} {
  const $ = cheerio.load(html);
  let price: number | null = null;
  let currency = "";
  let in_stock = true;
  let image_url: string | null = null;

  // 1) JSON-LD Product
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).contents().text() || "{}");
      for (const node of flattenJsonLd(json)) {
        const types = ([] as string[]).concat(node["@type"] ?? []);
        if (!types.some((t) => /product/i.test(String(t)))) continue;
        const offers = ([] as any[]).concat(node.offers ?? []);
        for (const off of offers) {
          const p = parsePrice(off?.price ?? off?.lowPrice);
          if (p && price === null) {
            price = p;
            currency = String(off?.priceCurrency ?? "");
            const av = String(off?.availability ?? "").toLowerCase();
            if (av && /outofstock|discontinued|soldout/.test(av)) in_stock = false;
          }
        }
        if (!image_url) {
          const img = node.image;
          const first = Array.isArray(img) ? img[0] : typeof img === "object" ? img?.url : img;
          if (first) image_url = pickImageUrl({ image_url: first }, url);
        }
      }
    } catch {
      /* ignore */
    }
  });

  // 2) OpenGraph / meta fallback
  if (price === null) {
    const ogPrice =
      $('meta[property="product:price:amount"]').attr("content") ??
      $('meta[property="og:price:amount"]').attr("content") ??
      $('meta[itemprop="price"]').attr("content");
    const ogCurrency =
      $('meta[property="product:price:currency"]').attr("content") ??
      $('meta[property="og:price:currency"]').attr("content") ??
      $('meta[itemprop="priceCurrency"]').attr("content");
    const p = parsePrice(ogPrice);
    if (p) {
      price = p;
      currency = String(ogCurrency ?? "");
    }
  }

  if (!image_url) {
    const og = $('meta[property="og:image"]').attr("content");
    if (og) image_url = pickImageUrl({ image_url: og }, url);
  }

  const title = $("title").first().text() || $('meta[property="og:title"]').attr("content") || "";
  const text = `${title}\n${$("body").text().slice(0, 4000)}`;

  return { price, currency, in_stock, image_url, title, text };
}

async function scrapeFreeFallback(
  url: string,
  host: string | null,
  med: MedRow,
): Promise<ExtractedFull | null> {
  let html = await fetchHtml(url);
  if (!html) html = await fetchViaJina(url);
  if (!html) return null;
  const ext = extractFromHtml(html, url);
  if (ext.price === null) return null;
  const currency = normalizeCurrency(ext.currency, host);
  if (!priceWithinRange(ext.price, currency)) return null;
  if (!pageMatchesMed(ext.text, med)) {
    console.warn(`[scrape-free:mismatch] ${url}`);
    return null;
  }
  console.info(`[scrape-free:ok] ${url} ${ext.price} ${currency}`);
  return {
    price: ext.price,
    currency: currency.slice(0, 8),
    in_stock: ext.in_stock,
    product_url: url,
    image_url: ext.image_url,
  };
}

export const Route = createFileRoute("/api/public/hooks/scrape-prices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          return Response.json({ ok: false, error: "FIRECRAWL_API_KEY missing" }, { status: 500 });
        }
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 0) || 100, 100);
        const medSlug = url.searchParams.get("med");
        const pharmSlug = url.searchParams.get("pharm");

        const fc = new Firecrawl({ apiKey });

        let pharmQuery = supabaseAdmin
          .from("pharmacies")
          .select("id,slug,name,website_url");
        if (pharmSlug) pharmQuery = pharmQuery.eq("slug", pharmSlug);
        const { data: pharms } = await pharmQuery;

        let medsQuery = supabaseAdmin
          .from("medications")
          .select("id,name,active_ingredient,presentation,brand_names")
          .order("name");
        if (medSlug) medsQuery = medsQuery.eq("slug", medSlug);
        const { data: meds } = await medsQuery.limit(limit);

        const pharmList = (pharms ?? []) as PharmRow[];
        const medList = (meds ?? []) as MedRow[];

        let inserted = 0;
        let attempted = 0;
        const errors: string[] = [];
        const byPharmacy: Record<string, { name: string; attempted: number; inserted: number; failed: number }> = {};
        for (const p of pharmList) byPharmacy[p.slug] = { name: p.name, attempted: 0, inserted: 0, failed: 0 };

        for (const med of medList) {
          // Procesar farmacias en paralelo: cada una es independiente.
          const results = await Promise.all(
            pharmList.map(async (pharm) => {
              attempted++;
              byPharmacy[pharm.slug].attempted++;
              const r = await scrapeOne(fc, med, pharm);
              return { pharm, r };
            }),
          );
          // Guarda la primera imagen encontrada para este medicamento si aún no tiene.
          const firstImage = results.find((x) => x.r?.image_url)?.r?.image_url ?? null;
          if (firstImage) {
            await supabaseAdmin
              .from("medications")
              .update({ image_url: firstImage })
              .eq("id", med.id)
              .is("image_url", null);
          }
          for (const { pharm, r } of results) {
            if (!r) {
              byPharmacy[pharm.slug].failed++;
              continue;
            }
            const { error } = await supabaseAdmin.from("medication_prices").insert({
              medication_id: med.id,
              pharmacy_id: pharm.id,
              price: r.price,
              currency: r.currency,
              in_stock: r.in_stock,
              product_url: r.product_url || null,
            });
            if (error) {
              errors.push(`${pharm.slug}/${med.name}: ${error.message}`);
              byPharmacy[pharm.slug].failed++;
            } else {
              inserted++;
              byPharmacy[pharm.slug].inserted++;
            }
          }
        }

        // Tras insertar precios, calcula alertas de cambio significativo.
        let alerts_inserted = 0;
        try {
          const u = new URL(request.url);
          const r = await fetch(`${u.origin}/api/public/hooks/process-price-alerts?threshold=5&hours=72`, { method: "POST" });
          const j: any = await r.json().catch(() => ({}));
          alerts_inserted = j?.alerts_inserted ?? 0;
        } catch { /* no-op */ }

        return Response.json({
          ok: true,
          attempted,
          inserted,
          alerts_inserted,
          medications: medList.length,
          pharmacies: pharmList.length,
          byPharmacy: Object.entries(byPharmacy).map(([slug, v]) => ({ slug, ...v })),
          errors: errors.slice(0, 10),
        });
      },
    },
  },
});
