import { supabase } from "@/integrations/supabase/client";

export type MedicationRow = {
  id: string;
  slug: string;
  name: string;
  active_ingredient: string;
  presentation: string | null;
  category: string | null;
  indication: string | null;
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

export async function searchMedications(q: string, limit = 30) {
  if (!q.trim()) {
    const { data, error } = await supabase
      .from("medications").select("*").order("name").limit(limit);
    if (error) throw error;
    return (data ?? []) as MedicationRow[];
  }
  const safe = q.replace(/[,()]/g, " ");
  // 1) direct matches across name, principio activo, indicación y marcas
  const { data: direct, error } = await supabase
    .from("medications")
    .select("*")
    .or(
      `name.ilike.%${safe}%,active_ingredient.ilike.%${safe}%,indication.ilike.%${safe}%,brand_names_text.ilike.%${safe}%`
    )
    .order("name")
    .limit(limit);
  if (error) throw error;
  const directRows = (direct ?? []) as MedicationRow[];

  // 2) Si no hubo coincidencia directa, intentar búsqueda difusa (tolera errores tipográficos)
  let baseRows = directRows;
  if (!baseRows.length && q.trim().length >= 3) {
    const { data: fuzzy } = await supabase.rpc("search_medications_fuzzy", {
      q: safe,
      lim: limit,
    });
    baseRows = ((fuzzy ?? []) as MedicationRow[]);
  }

  // 3) Expandir por principio activo para incluir alternativas equivalentes
  const ingredients = Array.from(
    new Set(baseRows.map((m) => m.active_ingredient).filter(Boolean)),
  );
  if (!ingredients.length) return baseRows;

  const { data: byIng } = await supabase
    .from("medications")
    .select("*")
    .in("active_ingredient", ingredients)
    .order("name")
    .limit(limit);

  // Merge sin duplicados, manteniendo primero las coincidencias directas
  const map = new Map<string, MedicationRow>();
  for (const m of baseRows) map.set(m.id, m);
  for (const m of (byIng ?? []) as MedicationRow[]) if (!map.has(m.id)) map.set(m.id, m);
  return Array.from(map.values()).slice(0, limit);
}

export async function getLatestPricesForMedications(medIds: string[]) {
  if (!medIds.length) return [] as PriceRow[];
  const { data, error } = await supabase
    .from("medication_prices")
    .select("*")
    .in("medication_id", medIds)
    .order("scraped_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as PriceRow[];
}

export function lowestCurrent(prices: PriceRow[], medId: string) {
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
  return latestPerPharm.reduce((min, p) => (p.price < min.price ? p : min), latestPerPharm[0]);
}

export function priorPrice(prices: PriceRow[], medId: string, pharmId: string, currentTs: string) {
  const olderSorted = prices
    .filter((p) => p.medication_id === medId && p.pharmacy_id === pharmId && p.scraped_at < currentTs)
    .sort((a, b) => (a.scraped_at < b.scraped_at ? 1 : -1));
  return olderSorted[0] ?? null;
}

export function formatBs(n: number, currency = "USD") {
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
  if (c === "COP") {
    // Tasa aproximada COP por USD (fallback estable)
    return amount / 4000;
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
  const usd = toUSD(amount, c, bcvRate);
  if (usd != null) {
    const primary = formatUSD(usd);
    if (c === "VES" || c === "VEF" || c === "BS" || c === "BSS") {
      return { primary, secondary: formatBs(amount, "VES") };
    }
    return { primary };
  }
  // Fallback: mostrar tal cual si no se puede convertir
  return { primary: formatBs(amount, c) };
}
