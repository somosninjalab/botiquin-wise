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
  // SAAS publishes prices in USD on its VTEX catalog.
  if (/farmaciasaas/i.test(host)) return "USD";
  // GoPharma also publishes prices in USD.
  if (/gopharma/i.test(host)) return "USD";
  if (/\.com\.ve$|farmatodo|farmago|gopharma|locatel\.com\.ve|cinecitta|tufarmaciaactual|maraplus/i.test(host))
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
  opts: { trusted?: boolean } = {},
): Promise<ExtractedFull | null> {
  try {
    const res: any = await fc.scrape(url, {
      formats: ["markdown", { type: "json", prompt: extractionPrompt } as any] as any,
      onlyMainContent: true,
      waitFor: 2500,
    } as any);
    const j = res?.json ?? res?.data?.json ?? res?.extract;
    const md: string =
      res?.markdown ?? res?.data?.markdown ?? res?.metadata?.title ?? "";
    const norm = normalizeExtraction(j, url, host);
    if (!norm) return null;
    // Validación de contenido: si la URL viene del buscador interno de la
    // farmacia, confiamos en ella y no exigimos pageMatchesMed (los sitios
    // SPA dejan el <body> vacío al servir y el match falla aunque el
    // producto sea correcto). Solo validamos cuando NO es trusted.
    if (!opts.trusted) {
      const urlSlug = (() => {
        try { return decodeURIComponent(new URL(url).pathname).replace(/[-_/]+/g, " "); }
        catch { return ""; }
      })();
      const haystack = `${md}\n${res?.metadata?.title ?? ""}\n${urlSlug}`;
      if (!pageMatchesMed(haystack, med)) {
        console.warn(`[scrape:mismatch] ${url} no menciona ${med.active_ingredient}`);
        return null;
      }
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

  // 0a) Farmatodo Algolia fast-path (Angular SPA, public Algolia creds).
  if (/farmatodo\.com\.ve$/i.test(host)) {
    for (const q of variants) {
      const hit = await searchFarmatodoAlgolia(q, med, host);
      if (hit) return hit;
    }
  }

  // 0b) GoPharma fast-path: Flutter SPA that uses a public REST API.
  if (/gopharma/i.test(host)) {
    for (const q of variants) {
      const hit = await searchGoPharmaApi(q, med, host);
      if (hit) return hit;
    }
  }

  // 0) VTEX fast-path: query the public catalog JSON API directly. Returns
  // price + link + image without burning Firecrawl credits or LLM calls.
  if (pharm.search_url_template?.includes("/api/catalog_system/")) {
    for (const q of variants) {
      const hit = await searchVtexApi(pharm.search_url_template, q, med, host);
      if (hit) return hit;
    }
    // Fall through to legacy if VTEX API returned nothing.
  }

  // 1) PRIMARY: use the pharmacy's own internal search bar.
  const seen = new Set<string>();
  const candidates: string[] = [];
  const trustedSet = new Set<string>();
  for (const q of variants) {
    const internal = await searchOnPharmacySite(fc, pharm, q, host);
    for (const u of internal) {
      if (seen.has(u)) continue;
      if (!isSpecificProductUrl(u, host)) continue;
      seen.add(u);
      candidates.push(u);
      trustedSet.add(u);
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
    const norm = await scrapeUrl(fc, url, host, med, { trusted: trustedSet.has(url) });
    if (norm) return norm;
  }
  console.warn(`[scrape:no-extract] ${pharm.slug} / ${med.name} (${candidates.length} urls)`);

  // 4) Fallback gratuito: fetch directo + Cheerio (JSON-LD / OpenGraph) y r.jina.ai.
  for (const url of candidates) {
    const fb = await scrapeFreeFallback(url, host, med, fc, { trusted: trustedSet.has(url) });
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
  // VTEX API templates are handled in the fast-path; if we still get here
  // (med didn't match), there is no HTML listing to parse.
  if (tmpl.includes("/api/catalog_system/")) return [];
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

// --- VTEX catalog JSON API ------------------------------------------------

// --- Farmatodo Algolia fast-path -----------------------------------------
const FARMATODO_ALGOLIA = {
  appId: "VCOJEYD2PO",
  apiKey: "869a91e98550dd668b8b1dc04bca9011",
  index: "products-venezuela",
};

type AlgoliaHit = {
  item?: number | string;
  url?: string;
  fullPrice?: number;
  offerPrice?: number;
  mediaImageUrl?: string;
  totalStock?: number;
  outofstore?: boolean;
  productName?: string;
  brand?: string;
  largeDescription?: string;
  mediaDescription?: string;
};

async function searchFarmatodoAlgolia(
  query: string,
  med: MedRow,
  host: string | null,
): Promise<ExtractedFull | null> {
  const url = `https://${FARMATODO_ALGOLIA.appId.toLowerCase()}-dsn.algolia.net/1/indexes/${FARMATODO_ALGOLIA.index}/query?x-algolia-application-id=${FARMATODO_ALGOLIA.appId}&x-algolia-api-key=${FARMATODO_ALGOLIA.apiKey}`;
  let hits: AlgoliaHit[] = [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ params: `query=${encodeURIComponent(query)}&hitsPerPage=8` }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      console.warn(`[algolia:bad-status] ${host} ${res.status}`);
      return null;
    }
    const j: any = await res.json();
    hits = (j?.hits ?? []) as AlgoliaHit[];
    console.info(`[algolia:hit] ${host} q="${query}" items=${hits.length}`);
  } catch (e) {
    console.warn(`[algolia:fetch-fail] ${(e as Error).message}`);
    return null;
  }
  for (const h of hits) {
    const haystack = [h.productName, h.brand, h.url, h.mediaDescription, h.largeDescription]
      .filter(Boolean)
      .join(" ");
    if (!pageMatchesMed(haystack, med)) continue;
    const price = h.offerPrice && h.offerPrice > 0 ? h.offerPrice : h.fullPrice ?? 0;
    if (!price || price <= 0) continue;
    const currency = "VES";
    if (!priceWithinRange(price, currency)) continue;
    if (!h.url) continue;
    const link = `https://${host ?? "www.farmatodo.com.ve"}/producto/${h.url}`;
    if (!isSpecificProductUrl(link, host)) continue;
    const image_url = h.mediaImageUrl ? pickImageUrl({ image_url: h.mediaImageUrl }, link) : null;
    const inStock = (h.totalStock ?? 0) > 0 && h.outofstore !== true;
    return { price, currency, in_stock: inStock, product_url: link, image_url };
  }
  console.warn(`[algolia:no-match] ${host} q="${query}"`);
  return null;
}

type VtexItemSeller = {
  commertialOffer?: { Price?: number; ListPrice?: number; AvailableQuantity?: number; IsAvailable?: boolean };
};
type VtexItem = { itemId?: string; images?: { imageUrl?: string }[]; sellers?: VtexItemSeller[] };
type VtexProduct = {
  productName?: string;
  productTitle?: string;
  link?: string;
  linkText?: string;
  items?: VtexItem[];
};

async function searchVtexApi(
  template: string,
  query: string,
  med: MedRow,
  host: string | null,
): Promise<ExtractedFull | null> {
  const url = template.replace("{q}", encodeURIComponent(query));
  let products: VtexProduct[] = [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        Accept: "application/json",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(t);
    if (res.status >= 400) {
      console.warn(`[vtex-api:bad-status] ${url} → ${res.status}`);
      return null;
    }
    products = (await res.json()) as VtexProduct[];
    console.info(`[vtex-api:hit] ${host} q="${query}" items=${products.length}`);
  } catch (e) {
    console.warn(`[vtex-api:fetch-fail] ${url} ${(e as Error).message}`);
    return null;
  }
  if (!Array.isArray(products) || !products.length) return null;

  let inspected = 0, matched = 0;
  for (const p of products) {
    const name = p.productName ?? p.productTitle ?? "";
    if (!name) continue;
    inspected++;
    if (!pageMatchesMed(name, med)) continue;
    matched++;
    const item = (p.items ?? [])[0];
    const offer = item?.sellers?.[0]?.commertialOffer;
    const price = offer?.Price ?? offer?.ListPrice ?? 0;
    if (!price || price <= 0) { console.warn(`[vtex-api:no-price] ${host} "${name}"`); continue; }
    const currency = guessByHost(host); // VTEX VE returns Bs.
    if (!priceWithinRange(price, currency)) { console.warn(`[vtex-api:out-of-range] ${host} ${price} ${currency}`); continue; }
    const link = p.link ?? (p.linkText ? `https://${host}/${p.linkText}/p` : "");
    if (!link || !isSpecificProductUrl(link, host)) { console.warn(`[vtex-api:bad-link] ${link}`); continue; }
    const image_url = pickImageUrl({ image_url: item?.images?.[0]?.imageUrl }, link);
    const inStock =
      offer?.IsAvailable !== false && (offer?.AvailableQuantity ?? 1) > 0;
    return {
      price,
      currency: currency.slice(0, 8),
      in_stock: inStock,
      product_url: link,
      image_url,
    };
  }
  console.warn(`[vtex-api:no-match] ${host} q="${query}" inspected=${inspected} matched=${matched}`);
  return null;
}

// --- GoPharma (Flutter SPA backed by app.gopharma.dev REST API) ----------

type GoPharmaProduct = {
  id?: number;
  name?: string;
  slug?: string;
  price?: number | string;
  stock?: number;
  image_full_url?: string;
  image?: string;
  active_ingredient?: string;
  description?: string;
};

async function searchGoPharmaApi(
  query: string,
  med: MedRow,
  host: string | null,
): Promise<ExtractedFull | null> {
  const url = `https://app.gopharma.dev/api/v1/items/search?name=${encodeURIComponent(
    query,
  )}&type=all&offset=1&limit=20`;
  let products: GoPharmaProduct[] = [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        Accept: "application/json",
        "X-localization": "es",
        // Required headers; GoPharma's API rejects requests without these.
        moduleId: "1",
        zoneId: "[1]",
        latitude: "10.4806",
        longitude: "-66.9036",
        Referer: "https://ec.gopharma.com.ve/",
        Origin: "https://ec.gopharma.com.ve",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(t);
    if (res.status >= 400) {
      console.warn(`[gopharma-api:bad-status] ${url} → ${res.status}`);
      return null;
    }
    const j: any = await res.json();
    products = (j?.products ?? []) as GoPharmaProduct[];
    console.info(`[gopharma-api:hit] ${host} q="${query}" items=${products.length}`);
  } catch (e) {
    console.warn(`[gopharma-api:fetch-fail] ${url} ${(e as Error).message}`);
    return null;
  }
  if (!products.length) return null;

  for (const p of products) {
    const haystack = [p.name, p.active_ingredient, p.description].filter(Boolean).join(" ");
    if (!pageMatchesMed(haystack, med)) continue;
    const price = typeof p.price === "string" ? parseFloat(p.price) : p.price ?? 0;
    if (!price || !Number.isFinite(price) || price <= 0) continue;
    const currency = "USD";
    if (!priceWithinRange(price, currency)) continue;
    const slug = p.slug ?? "";
    const id = p.id;
    if (!slug && !id) continue;
    // ec.gopharma.com.ve is a Flutter SPA; deep-link to the product detail.
    const link = `https://${host ?? "ec.gopharma.com.ve"}/product/${slug || id}`;
    if (!isSpecificProductUrl(link, host)) continue;
    const image_url = p.image_full_url
      ? pickImageUrl({ image_url: p.image_full_url }, link)
      : null;
    const inStock = (p.stock ?? 0) > 0;
    return { price, currency, in_stock: inStock, product_url: link, image_url };
  }
  console.warn(`[gopharma-api:no-match] ${host} q="${query}"`);
  return null;
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

  // 3) Selectores CSS comunes para precio (WooCommerce, Odoo, VTEX, genéricos).
  //    Buscamos el primer nodo cuyo texto parsee a un precio válido. Recorremos
  //    en orden: precio "actual/de oferta" antes que "regular/tachado".
  if (price === null) {
    const SELECTORS = [
      // Específicos de carrito/oferta primero
      ".price ins .woocommerce-Price-amount bdi",
      ".price ins .woocommerce-Price-amount",
      "p.price ins .amount",
      ".price .woocommerce-Price-amount bdi",
      ".price .woocommerce-Price-amount",
      ".woocommerce-Price-amount bdi",
      ".woocommerce-Price-amount",
      // Odoo
      ".product_price .oe_currency_value",
      ".oe_price .oe_currency_value",
      ".oe_price_h4 .oe_currency_value",
      "span.oe_currency_value",
      // VTEX / shopify / generic
      ".vtex-product-price-1-x-sellingPrice",
      ".vtex-product-price-1-x-sellingPriceValue",
      ".price-best-price",
      ".product-price .price",
      ".product__price",
      ".price-now",
      ".current-price",
      ".sale-price",
      ".final-price",
      ".precio-actual",
      ".precio",
      "[itemprop='price']",
      "[data-price]",
      "[class*='sellingPrice']",
      "[class*='product-price']",
      "[class*='price-value']",
      // Odoo extra (Tu Farmacia Actual / Maraplus / Farmago)
      ".product_price h4 .oe_currency_value",
      ".product_price b",
      ".o_we_currency_value",
      "h4.oe_price .oe_currency_value",
      // Selectores muy genéricos por id/atributos
      "[id*='product_price'] .oe_currency_value",
      "[id*='price'] .amount",
      "span.amount",
      "[class*='Price__']",
      "[class*='price__']",
      "[class*='ProductPrice']",
      "[data-product-price]",
      "[data-test*='price']",
      "[data-testid*='price']",
      "[data-qa*='price']",
    ];
    let symbol = "";
    for (const sel of SELECTORS) {
      const nodes = $(sel);
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes.eq(i);
        const txt =
          (el.attr("content") ||
            el.attr("data-price") ||
            el.text() ||
            "").trim();
        if (!txt) continue;
        const p = parsePrice(txt);
        if (p) {
          price = p;
          if (/USD|US\$|\$/.test(txt)) symbol = "USD";
          else if (/Bs|VES|VEF|BOL/i.test(txt)) symbol = "VES";
          else if (/€|EUR/.test(txt)) symbol = "EUR";
          break;
        }
      }
      if (price !== null) break;
    }
    if (price !== null && !currency) currency = symbol;
  }

  const title = $("title").first().text() || $('meta[property="og:title"]').attr("content") || "";
  const text = `${title}\n${$("body").text().slice(0, 4000)}`;

  return { price, currency, in_stock, image_url, title, text };
}

async function scrapeFreeFallback(
  url: string,
  host: string | null,
  med: MedRow,
  fc?: Firecrawl,
  opts: { trusted?: boolean } = {},
): Promise<ExtractedFull | null> {
  // Prioridad: HTML RENDERIZADO (Firecrawl ejecuta JS) → fetch directo → jina.
  // Muchas farmacias (Odoo, VTEX, SPA) tienen el precio dentro de nodos que
  // sólo aparecen tras correr JS; si pedimos el HTML pelado queda vacío.
  let html: string | null = null;
  let rendered = false;
  if (fc) {
    try {
      const res: any = await fc.scrape(url, {
        formats: ["html"],
        onlyMainContent: false,
        waitFor: 3000,
      } as any);
      html =
        res?.html ?? res?.data?.html ?? res?.rawHtml ?? res?.data?.rawHtml ?? "";
      if (html) {
        rendered = true;
        console.info(`[scrape-free:fc-rendered-ok] ${url} (${html.length}b)`);
      }
    } catch (e) {
      console.warn(`[scrape-free:fc-rendered-fail] ${url} ${(e as Error).message}`);
    }
  }
  if (!html) html = await fetchHtml(url);
  if (!html) {
    console.warn(`[scrape-free:fetchHtml-fail] ${url}`);
    html = await fetchViaJina(url);
  }
  if (!html) {
    console.warn(`[scrape-free:no-html] ${url}`);
    return null;
  }
  const ext = extractFromHtml(html, url);
  if (ext.price === null) {
    console.warn(`[scrape-free:no-price] ${url} (html ${html.length}b)`);
    return null;
  }
  const currency = normalizeCurrency(ext.currency, host);
  if (!priceWithinRange(ext.price, currency)) {
    console.warn(`[scrape-free:out-of-range] ${url} ${ext.price} ${currency}`);
    return null;
  }
  // Si la URL viene del buscador interno de la farmacia (trusted) o si el
  // HTML que extrajimos vino RENDERIZADO con JS, saltamos pageMatchesMed:
  // el listado interno ya filtró por el término y el cuerpo renderizado a
  // veces está empaquetado en componentes que no exponen el texto plano.
  if (!opts.trusted && !rendered) {
    const urlSlug = (() => {
      try { return decodeURIComponent(new URL(url).pathname).replace(/[-_/]+/g, " "); }
      catch { return ""; }
    })();
    const haystack = `${ext.text}\n${urlSlug}`;
    if (!pageMatchesMed(haystack, med)) {
      console.warn(`[scrape-free:mismatch] ${url}`);
      return null;
    }
  }
  console.info(
    `[scrape-free:ok] ${url} ${ext.price} ${currency}${rendered ? " (rendered)" : ""}${opts.trusted ? " (trusted)" : ""}`,
  );
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

        // Load search-bar templates and merge.
        const { data: cfgRows } = await supabaseAdmin
          .from("pharmacy_search_config")
          .select("pharmacy_id, search_url_template");
        const cfgByPharm = new Map<string, string>();
        for (const c of (cfgRows ?? []) as { pharmacy_id: string; search_url_template: string }[]) {
          cfgByPharm.set(c.pharmacy_id, c.search_url_template);
        }
        const pharmList: PharmRowWithSearch[] = ((pharms ?? []) as PharmRow[]).map((p) => ({
          ...p,
          search_url_template: cfgByPharm.get(p.id) ?? null,
        }));
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
