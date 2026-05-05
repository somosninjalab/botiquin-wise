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
  let query = supabase.from("medications").select("*").order("name").limit(limit);
  if (q.trim()) {
    const safe = q.replace(/[,()]/g, " ");
    query = query.or(
      `name.ilike.%${safe}%,active_ingredient.ilike.%${safe}%,indication.ilike.%${safe}%,brand_names_text.ilike.%${safe}%`
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MedicationRow[];
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
