import { createFileRoute } from "@tanstack/react-router";
import Firecrawl from "@mendable/firecrawl-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type PharmRow = { id: string; slug: string; name: string; website_url: string | null };
type MedRow = {
  id: string;
  name: string;
  active_ingredient: string;
  presentation: string | null;
  brand_names?: string[] | null;
};
type Extracted = { price: number; currency: string; in_stock: boolean; product_url: string };

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
  if (/\.com\.ve$|farmatodo|farmago|locatel\.com\.ve|cinecitta|farmaciasaas|tufarmaciaactual|maraplus/i.test(host))
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
    if (/\/(lander|search|login|signup|cart|checkout|category|categoria|inicio|home|nosotros|about|contacto|sucursales)(\/|$)/i.test(path)) {
      return false;
    }
    if (path.split("/").filter(Boolean).length < 1) return false;
    return /producto|product|\/p\/|\/p$|-\d+\/p$|\d{5,}|\/shop\//i.test(path);
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

function buildQueryVariants(med: MedRow): string[] {
  const variants = new Set<string>();
  const dose = (med.name.match(/\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|ui)/i)?.[0] ?? "").trim();
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
  return Array.from(variants).filter(Boolean).slice(0, 5);
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
): Promise<Extracted | null> {
  try {
    const res: any = await fc.scrape(url, {
      formats: [{ type: "json", prompt: extractionPrompt } as any] as any,
      onlyMainContent: true,
    } as any);
    const j = res?.json ?? res?.data?.json ?? res?.extract;
    return normalizeExtraction(j, url, host);
  } catch {
    return null;
  }
}

async function scrapeOne(
  fc: Firecrawl,
  med: MedRow,
  pharm: PharmRow,
): Promise<Extracted | null> {
  const host = siteHost(pharm.website_url);
  if (!host || !pharm.website_url) return null;
  const variants = buildQueryVariants(med);

  // 1) For each variant, gather candidate product URLs from search + sitemap-map.
  const seen = new Set<string>();
  const candidates: string[] = [];
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
      if (candidates.length >= 6) break;
    }
    if (candidates.length >= 3) break;
  }
  if (!candidates.length) {
    console.warn(`[scrape:no-candidates] ${pharm.slug} / ${med.name}`);
    return null;
  }

  // 2) Try candidates one by one until we get a valid extraction.
  for (const url of candidates) {
    const norm = await scrapeUrl(fc, url, host);
    if (norm) return norm;
  }
  console.warn(`[scrape:no-extract] ${pharm.slug} / ${med.name} (${candidates.length} urls)`);
  return null;
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

        const fc = new Firecrawl({ apiKey });

        const { data: pharms } = await supabaseAdmin
          .from("pharmacies")
          .select("id,slug,name,website_url");

        let medsQuery = supabaseAdmin
          .from("medications")
          .select("id,name,active_ingredient,presentation")
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
          for (const pharm of pharmList) {
            attempted++;
            byPharmacy[pharm.slug].attempted++;
            const result = await scrapeOne(fc, med, pharm);
            if (!result) {
              byPharmacy[pharm.slug].failed++;
              continue;
            }
            const { error } = await supabaseAdmin.from("medication_prices").insert({
              medication_id: med.id,
              pharmacy_id: pharm.id,
              price: result.price,
              currency: result.currency,
              in_stock: result.in_stock,
              product_url: result.product_url || null,
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

        return Response.json({
          ok: true,
          attempted,
          inserted,
          medications: medList.length,
          pharmacies: pharmList.length,
          byPharmacy: Object.entries(byPharmacy).map(([slug, v]) => ({ slug, ...v })),
          errors: errors.slice(0, 10),
        });
      },
    },
  },
});
