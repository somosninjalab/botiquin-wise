import { createFileRoute } from "@tanstack/react-router";
import { verifyCronAuth } from "@/lib/cron-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Scrape prices via external API (http://18.191.16.43:3001/api/scraper/search).
 * Single source of truth for price scraping: the external API returns
 * products across multiple Venezuelan pharmacies in a single call.
 */

const API_BASE = "http://18.191.16.43:3001/api/scraper/search";

// Map API source slug → our pharmacies.slug
const SOURCE_TO_PHARM: Record<string, string> = {
  farmatodo: "farmatodo",
  locatel: "locatel",
  farmago: "farmago",
  farmaciasaas: "saas",
  tufarmaciaactual: "actual",
  // farmadon → no pharmacy in DB, ignored
};

const PRICE_RANGES = {
  VES: { min: 30, max: 5_000_000 },
  USD: { min: 0.1, max: 10_000 },
};

type ApiProduct = {
  name: string;
  brand?: string;
  price?: string | number;
  priceUSD?: string | number;
  originalPrice?: string | number;
  status?: string;
  image?: string;
  url?: string;
  source: string;
};

type ApiResponse = {
  product: string;
  sources: string[];
  count: number;
  products: ApiProduct[];
};

type MedRow = {
  id: string;
  name: string;
  active_ingredient: string;
  presentation: string | null;
  brand_names?: string[] | null;
  image_url?: string | null;
};

type PharmRow = { id: string; slug: string };

function parsePrice(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw > 0 ? raw : null;
  if (typeof raw !== "string") return null;
  let s = raw.replace(/[\s\u00A0]/g, "").replace(/(usd|ves|bs\.?s?|us\$|\$|€)/gi, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    const decimals = s.length - lastComma - 1;
    if (decimals > 0 && decimals <= 2) s = s.slice(0, lastComma).replace(/,/g, "") + "." + s.slice(lastComma + 1);
    else s = s.replace(/,/g, "");
  }
  s = s.replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDose(med: MedRow): string {
  return (med.name.match(/\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|ui)/i)?.[0] ?? "").trim();
}

/** Check if an API product matches the medication. */
function productMatchesMed(p: ApiProduct, med: MedRow): boolean {
  const text = norm(`${p.name} ${p.brand ?? ""}`);
  if (!text) return false;
  // Reject obvious junk URLs (cart, wishlist, search, generic landing pages).
  const url = (p.url ?? "").toLowerCase();
  if (/\/(wishlist|cart|carrito|search|busqueda|categoria|category)(\/|$|\?)/.test(url)) {
    return false;
  }
  const brands = (med.brand_names ?? []).map(norm).filter(Boolean);
  // Require at least one brand-name hit. The active ingredient alone is too
  // broad (e.g. "Bencidamina" matches many products that are not Tantum).
  const brandHit = brands.some((b) => text.includes(b));
  if (!brandHit) return false;
  const dose = norm(extractDose(med));
  if (dose) {
    const doseCompact = dose.replace(/\s+/g, "");
    if (!(text.includes(dose) || text.includes(doseCompact))) return false;
  }
  // Require distinctive tokens from the med name (besides the brand) to match.
  // e.g. "Tantum Verde Spray" → "spray" must appear in the product text.
  const medTokens = norm(med.name)
    .split(" ")
    .filter((t) => t.length >= 4 && !brands.some((b) => b.includes(t)));
  if (medTokens.length) {
    const hits = medTokens.filter((t) => text.includes(t)).length;
    if (hits === 0) return false;
  }
  return true;
}

function buildQuery(med: MedRow): string {
  // Use the medication name as the single API query. The external API
  // already returns the relevant matches; broadening to active_ingredient
  // or every brand pulls in unrelated products.
  return (med.name || med.active_ingredient || "").trim();
}

async function fetchApi(product: string, token: string, sources: string[]): Promise<ApiProduct[]> {
  const url = new URL(API_BASE);
  url.searchParams.set("product", product);
  if (sources.length) url.searchParams.set("sources", sources.join(","));
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 45_000);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    if (!res.ok) {
      console.warn(`[scrape-api] ${url} → HTTP ${res.status}`);
      return [];
    }
    const j = (await res.json()) as ApiResponse;
    return Array.isArray(j?.products) ? j.products : [];
  } catch (err) {
    console.warn(`[scrape-api] fetch failed for "${product}":`, err);
    return [];
  }
}

export const Route = createFileRoute("/api/public/hooks/scrape-prices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = verifyCronAuth(request);
        if (unauthorized) return unauthorized;

        const token = process.env.PRICE_SCRAPER_API_TOKEN;
        if (!token) {
          return Response.json(
            { ok: false, error: "PRICE_SCRAPER_API_TOKEN missing" },
            { status: 500 },
          );
        }

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 0) || 100, 200);
        const medSlug = url.searchParams.get("med");
        const pharmSlug = url.searchParams.get("pharm");

        // Load pharmacies and build slug → id map.
        let pharmQuery = supabaseAdmin.from("pharmacies").select("id,slug");
        if (pharmSlug) pharmQuery = pharmQuery.eq("slug", pharmSlug);
        const { data: pharms } = await pharmQuery;
        const pharmList = (pharms ?? []) as PharmRow[];
        const pharmBySlug = new Map(pharmList.map((p) => [p.slug, p.id]));

        // Sources we'll request from the API are only those that map to a
        // pharmacy in our DB (and respect the optional ?pharm filter).
        const activeSources = Object.entries(SOURCE_TO_PHARM)
          .filter(([, slug]) => pharmBySlug.has(slug))
          .map(([src]) => src);

        if (!activeSources.length) {
          return Response.json({ ok: false, error: "no matching pharmacies" }, { status: 400 });
        }

        // Load medications.
        let medsQuery = supabaseAdmin
          .from("medications")
          .select("id,name,active_ingredient,presentation,brand_names,image_url")
          .order("name");
        if (medSlug) medsQuery = medsQuery.eq("slug", medSlug);
        const { data: meds } = await medsQuery.limit(limit);
        const medList = (meds ?? []) as MedRow[];

        let attempted = 0;
        let inserted = 0;
        const errors: string[] = [];
        const byPharmacy: Record<string, { attempted: number; inserted: number; failed: number }> = {};
        for (const slug of activeSources.map((s) => SOURCE_TO_PHARM[s])) {
          byPharmacy[slug] = { attempted: 0, inserted: 0, failed: 0 };
        }

        for (const med of medList) {
          // 1) Single API call per medication — trust the API's query.
          const q = buildQuery(med);
          if (!q) continue;
          const products = await fetchApi(q, token, activeSources);

          // 2) Safety filter: keep only products that mention the medication
          //    (name, active ingredient, or one of its brands).
          const matched = products.filter((p) => productMatchesMed(p, med));

          // 3) Group by pharmacy and pick the lowest-price in-stock candidate.
          const bestByPharm = new Map<string, { product: ApiProduct; price: number }>();
          for (const p of matched) {
            const pharmSlug2 = SOURCE_TO_PHARM[p.source];
            if (!pharmSlug2 || !pharmBySlug.has(pharmSlug2)) continue;
            const priceVes = parsePrice(p.price);
            if (priceVes === null) continue;
            if (priceVes < PRICE_RANGES.VES.min || priceVes > PRICE_RANGES.VES.max) continue;
            const cur = bestByPharm.get(pharmSlug2);
            // Prefer in-stock; among same stock-state, lower price.
            const pInStock = (p.status ?? "").toLowerCase() !== "no disponible";
            const curInStock = cur ? (cur.product.status ?? "").toLowerCase() !== "no disponible" : false;
            if (!cur || (pInStock && !curInStock) || (pInStock === curInStock && priceVes < cur.price)) {
              bestByPharm.set(pharmSlug2, { product: p, price: priceVes });
            }
          }

          // 4) Insert rows + update medication image if missing.
          let firstImage: string | null = null;
          for (const [slug, { product, price }] of bestByPharm) {
            attempted++;
            byPharmacy[slug].attempted++;
            const pharmId = pharmBySlug.get(slug);
            if (!pharmId) continue;
            const inStock = (product.status ?? "").toLowerCase() !== "no disponible";
            const rows: Array<{ currency: string; price: number }> = [
              { currency: "VES", price },
            ];
            const priceUsd = parsePrice(product.priceUSD);
            if (
              priceUsd !== null &&
              priceUsd >= PRICE_RANGES.USD.min &&
              priceUsd <= PRICE_RANGES.USD.max
            ) {
              rows.push({ currency: "USD", price: priceUsd });
            }
            const { error } = await supabaseAdmin.from("medication_prices").insert(
              rows.map((r) => ({
                medication_id: med.id,
                pharmacy_id: pharmId,
                price: r.price,
                currency: r.currency,
                in_stock: inStock,
                product_url: product.url || null,
              })),
            );
            if (error) {
              errors.push(`${slug}/${med.name}: ${error.message}`);
              byPharmacy[slug].failed++;
            } else {
              inserted += rows.length;
              byPharmacy[slug].inserted += rows.length;
              if (!firstImage && product.image) firstImage = product.image;
            }
          }

          // Track failures for pharmacies with no match.
          for (const slug of Object.keys(byPharmacy)) {
            if (!bestByPharm.has(slug)) {
              attempted++;
              byPharmacy[slug].attempted++;
              byPharmacy[slug].failed++;
            }
          }

          if (firstImage && !med.image_url) {
            await supabaseAdmin
              .from("medications")
              .update({ image_url: firstImage })
              .eq("id", med.id)
              .is("image_url", null);
          }
        }

        // Trigger price alert processing.
        let alerts_inserted = 0;
        try {
          const u = new URL(request.url);
          const r = await fetch(
            `${u.origin}/api/public/hooks/process-price-alerts?threshold=5&hours=72`,
            { method: "POST" },
          );
          const j: any = await r.json().catch(() => ({}));
          alerts_inserted = j?.alerts_inserted ?? 0;
        } catch {
          /* no-op */
        }

        return Response.json({
          ok: true,
          source: "external-api",
          attempted,
          inserted,
          alerts_inserted,
          medications: medList.length,
          pharmacies: Object.keys(byPharmacy).length,
          byPharmacy: Object.entries(byPharmacy).map(([slug, v]) => ({ slug, ...v })),
          errors: errors.slice(0, 10),
        });
      },
    },
  },
});
