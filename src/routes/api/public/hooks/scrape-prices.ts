import { createFileRoute } from "@tanstack/react-router";
import Firecrawl from "@mendable/firecrawl-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type PharmRow = { id: string; slug: string; name: string; website_url: string | null };
type MedRow = { id: string; name: string; active_ingredient: string; presentation: string | null };
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

const extractionPrompt = `From this pharmacy product page or search result, extract the LOWEST listed price for the medication. Return strict JSON with fields:
- price: numeric or string price (e.g. 12.50, "12,50", "Bs 1.234,56", "$ 4.99"). No symbols required.
- currency: one of "USD", "VES", "COP", or the symbol/code seen on the page ("$", "Bs", "Bs.", "Bs.S", "BsS", "COP", "USD", "US$"). Empty string if unknown.
- in_stock: true unless explicitly marked out of stock / agotado / sin existencias.
- product_url: canonical URL of the product, or empty string.
If no price is visible, set price to 0.`;

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

/** Normalize many currency inputs to ISO-3 code. Returns "" if unknown. */
function normalizeCurrency(raw: unknown, contextHost?: string | null): string {
  const s = String(raw ?? "").trim().toUpperCase().replace(/\./g, "");
  if (!s) return guessByHost(contextHost);
  if (/USD|US\$|^\$$|^US$/.test(s)) return "USD";
  if (/^VES$|^VEF$|^BS$|^BSS$|BOL[IÍ]VAR/i.test(s)) return "VES";
  if (/^COP$|PESO/i.test(s)) return "COP";
  if (/^EUR$|€/.test(s)) return "EUR";
  // Already an ISO-3 looking code → keep it.
  if (/^[A-Z]{3}$/.test(s)) return s;
  return guessByHost(contextHost);
}

function guessByHost(host?: string | null): string {
  if (!host) return "USD";
  if (/\.com\.ve$|farmatodo\.com\.ve|farmago\.com\.ve|locatel\.com\.ve|cinecitta|farmaciasaas|tufarmaciaactual|maraplus|xana\.com/i.test(host))
    return "VES";
  if (/\.com\.co$|locatelcolombia/i.test(host)) return "COP";
  return "USD";
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
  return {
    price,
    currency: currency.slice(0, 8),
    in_stock: asBool(rawStock, true),
    product_url: asUrl(rawUrl, sourceUrl),
  };
}

async function scrapeOne(
  fc: Firecrawl,
  med: MedRow,
  pharm: PharmRow
): Promise<Extracted | null> {
  const host = siteHost(pharm.website_url);
  if (!host) return null;
  const query = `${med.name} ${med.active_ingredient}`.trim();
  try {
    const res: any = await fc.search(`site:${host} ${query}`, {
      limit: 1,
      scrapeOptions: {
        formats: [
          { type: "json", prompt: extractionPrompt } as any,
          "markdown",
        ] as any,
        onlyMainContent: true,
      } as any,
    } as any);
    const items: any[] = res?.web ?? res?.data ?? res?.results?.web ?? [];
    const first = items[0];
    if (first) {
      const j = first.json ?? first.extract ?? first.data?.json;
      const norm = normalizeExtraction(j, first.url || pharm.website_url || "", host);
      if (norm) return norm;
    }
    // Fallback: map the site for candidate product URLs, then scrape the best one.
    return await mapAndScrape(fc, med, pharm.website_url!);
  } catch (e) {
    console.error(`[scrape] ${pharm.slug} / ${med.name}`, (e as Error).message);
    try {
      return await mapAndScrape(fc, med, pharm.website_url!);
    } catch (e2) {
      console.error(`[scrape:fallback] ${pharm.slug} / ${med.name}`, (e2 as Error).message);
      return null;
    }
  }
}

async function mapAndScrape(
  fc: Firecrawl,
  med: MedRow,
  websiteUrl: string
): Promise<Extracted | null> {
  // Use medication name as the search term for sitemap-based URL discovery.
  const searchTerm = med.active_ingredient || med.name;
  const host = siteHost(websiteUrl);
  const mapRes: any = await fc.map(websiteUrl, {
    search: searchTerm,
    limit: 5,
    includeSubdomains: false,
  } as any);
  const links: string[] = mapRes?.links ?? mapRes?.data?.links ?? [];
  if (!links.length) return null;
  // Try the top candidate URL only (keep cost low).
  const candidate = links[0];
  const scrapeRes: any = await fc.scrape(candidate, {
    formats: [{ type: "json", prompt: extractionPrompt } as any] as any,
    onlyMainContent: true,
  } as any);
  const j = scrapeRes?.json ?? scrapeRes?.data?.json ?? scrapeRes?.extract;
  return normalizeExtraction(j, candidate, host);
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
