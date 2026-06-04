import { supabase } from "@/integrations/supabase/client";

type ApiProduct = {
  name?: string;
  brand?: string;
  price?: string | number;
  priceUSD?: string | number;
  status?: string;
  image?: string;
  url?: string;
  source?: string;
};

const API_PHARMACIES: Record<string, { id: string; slug: string; name: string }> = {
  farmatodo: { id: "farmatodo", slug: "farmatodo", name: "Farmatodo" },
  locatel: { id: "locatel", slug: "locatel", name: "Locatel" },
  farmago: { id: "farmago", slug: "farmago", name: "Farmago" },
  farmaciasaas: { id: "saas", slug: "saas", name: "SAAS" },
  tufarmaciaactual: { id: "actual", slug: "actual", name: "Tu Farmacia Actual" },
};

const apiPriceCache = new Map<string, PriceRow[]>();

export type MedicationRow = {
  id: string;
  slug: string;
  name: string;
  active_ingredient: string;
  presentation: string | null;
  category: string | null;
  indication: string | null;
  indication_es?: string | null;
  manufacturer: string | null;
  image_url: string | null;
  brand_names?: string[] | null;
};

export type PriceRow = {
  id: string;
  medication_id: string;
  pharmacy_id: string;
  price: number;
  currency: string;
  product_url: string | null;
  in_stock: boolean;
  scraped_at: string;
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h).toString(36);
}

function parsePrice(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw > 0 ? raw : null;
  if (typeof raw !== "string") return null;
  let s = raw.replace(/[\s\u00A0]/g, "").replace(/(usd|ves|bs\.?s?|us\$|\$|€)/gi, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    const decimals = s.length - lastComma - 1;
    s = decimals > 0 && decimals <= 2 ? `${s.slice(0, lastComma).replace(/,/g, "")}.${s.slice(lastComma + 1)}` : s.replace(/,/g, "");
  }
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function searchMedications(q: string, limit = 30) {
  if (!q.trim()) {
    const { data, error } = await supabase
      .from("medications").select("*").order("name").limit(limit);
    if (error) throw error;
    return (data ?? []) as MedicationRow[];
  }
  const term = q.replace(/[,()]/g, " ").trim();
  const res = await fetch(`/api/public/search-prices?q=${encodeURIComponent(term)}&limit=${limit}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { products?: ApiProduct[] };
  const meds = new Map<string, MedicationRow>();
  const priceRows: PriceRow[] = [];
  const now = new Date().toISOString();

  for (const product of json.products ?? []) {
    const source = (product.source ?? "").toLowerCase();
    const pharmacy = API_PHARMACIES[source];
    const name = (product.name ?? "").trim();
    if (!pharmacy || !name) continue;

    const key = norm(`${product.brand ?? ""} ${name}`) || hashString(name);
    const medId = `api-${key}`;
    if (!meds.has(medId)) {
      meds.set(medId, {
        id: medId,
        slug: medId,
        name,
        active_ingredient: (product.brand || name.split(/\s+/)[0] || term).trim(),
        presentation: null,
        category: "Resultados del API",
        indication: null,
        indication_es: null,
        manufacturer: null,
        image_url: product.image || null,
        brand_names: product.brand ? [product.brand] : null,
      });
    }

    const ves = parsePrice(product.price);
    const usd = parsePrice(product.priceUSD);
    const inStock = (product.status ?? "").toLowerCase() !== "no disponible";
    if (ves !== null) {
      priceRows.push({
        id: `${medId}-${source}-ves`,
        medication_id: medId,
        pharmacy_id: pharmacy.id,
        price: ves,
        currency: "VES",
        product_url: product.url || null,
        in_stock: inStock,
        scraped_at: now,
      });
    }
    if (usd !== null) {
      priceRows.push({
        id: `${medId}-${source}-usd`,
        medication_id: medId,
        pharmacy_id: pharmacy.id,
        price: usd,
        currency: "USD",
        product_url: product.url || null,
        in_stock: inStock,
        scraped_at: now,
      });
    }
  }

  const medList = Array.from(meds.values()).slice(0, limit);
  for (const med of medList) {
    apiPriceCache.set(med.id, priceRows.filter((p) => p.medication_id === med.id));
  }
  return medList;
}

export async function getLatestPricesForMedications(medIds: string[]) {
  if (!medIds.length) return [] as PriceRow[];
  if (medIds.every((id) => id.startsWith("api-"))) {
    return medIds.flatMap((id) => apiPriceCache.get(id) ?? []);
  }
  const apiRows = medIds.flatMap((id) => id.startsWith("api-") ? (apiPriceCache.get(id) ?? []) : []);
  const dbIds = medIds.filter((id) => !id.startsWith("api-"));
  if (!dbIds.length) return apiRows;
  const { data, error } = await supabase
    .from("medication_prices")
    .select("*")
    .in("medication_id", dbIds)
    .order("scraped_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return [...apiRows, ...((data ?? []) as PriceRow[])];
}

export function priceToVes(amount: number, currency: string, bcvRate: number | null): number | null {
  if (!Number.isFinite(amount)) return null;
  const c = (currency || "VES").toUpperCase();
  if (c === "VES" || c === "VEF" || c === "BS" || c === "BSS") return amount;
  if (c === "USD" && bcvRate && bcvRate > 0) return amount * bcvRate;
  return null;
}

export function lowestCurrent(prices: PriceRow[], medId: string, bcvRate: number | null = null) {
  const seen = new Set<string>();
  const latestPerPharm: PriceRow[] = [];
  for (const p of prices) {
    if (p.medication_id !== medId) continue;
    const key = p.pharmacy_id;
    if (seen.has(key)) continue;
    seen.add(key);
    latestPerPharm.push(p);
  }
  if (!latestPerPharm.length) return null;
  const comparable = (p: PriceRow) => priceToVes(Number(p.price), p.currency, bcvRate) ?? Number.POSITIVE_INFINITY;
  return latestPerPharm.reduce((min, p) => (comparable(p) < comparable(min) ? p : min), latestPerPharm[0]);
}

export function priorPrice(prices: PriceRow[], medId: string, pharmId: string, currentTs: string) {
  const olderSorted = prices
    .filter((p) => p.medication_id === medId && p.pharmacy_id === pharmId && p.scraped_at < currentTs)
    .sort((a, b) => (a.scraped_at < b.scraped_at ? 1 : -1));
  return olderSorted[0] ?? null;
}

export function formatBs(n: number, currency = "VES") {
  if ((currency || "VES").toUpperCase() === "VES") {
    return `Bs. ${new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
  }
  return new Intl.NumberFormat("es-VE", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
}

/** Convierte cualquier moneda soportada a USD usando la tasa BCV (VES por USD). */
export function toUSD(amount: number, currency: string, bcvRate: number | null): number | null {
  if (!Number.isFinite(amount)) return null;
  const c = (currency || "USD").toUpperCase();
  if (c === "USD") return amount;
  if (c === "VES" || c === "VEF" || c === "BS" || c === "BSS") {
    if (!bcvRate || bcvRate <= 0) return null;
    return amount / bcvRate;
  }
  return null;
}

export function formatUSD(amountUSD: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amountUSD);
}

/**
 * Devuelve el precio mostrado en USD. Si la moneda original era VES,
 * incluye también el monto original en bolívares para referencia.
 */
export function displayPrice(
  amount: number,
  currency: string,
  bcvRate: number | null,
): { primary: string; secondary?: string } {
  const c = (currency || "USD").toUpperCase();
  // Mostrar SIEMPRE en bolívares como precio principal.
  if (c === "VES" || c === "VEF" || c === "BS" || c === "BSS") {
    const primary = formatBs(amount, "VES");
    const usd = toUSD(amount, c, bcvRate);
    return usd != null ? { primary, secondary: formatUSD(usd) } : { primary };
  }
  if (c === "USD") {
    if (bcvRate && bcvRate > 0) {
      const bs = amount * bcvRate;
      return { primary: formatBs(bs, "VES"), secondary: formatUSD(amount) };
    }
    return { primary: formatUSD(amount) };
  }
  return { primary: "Precio no comparable", secondary: `${formatBs(amount, c)} registrado` };
}

export type SuggestionRow = {
  id: string;
  name: string;
  slug: string;
  active_ingredient: string;
  similarity: number;
};

/**
 * Sugerencias "¿quisiste decir...?" — usa trigram con umbral bajo y agrupa
 * por principio activo para no repetir presentaciones del mismo medicamento.
 */
export async function suggestMedications(q: string, limit = 6): Promise<SuggestionRow[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const { data, error } = await supabase.rpc("suggest_medications", { q: term, lim: limit });
  if (error) return [];
  return (data ?? []) as SuggestionRow[];
}
