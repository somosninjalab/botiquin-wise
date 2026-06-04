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

export async function searchMedications(q: string, limit = 30) {
  if (!q.trim()) {
    const { data, error } = await supabase
      .from("medications").select("*").order("name").limit(limit);
    if (error) throw error;
    return (data ?? []) as MedicationRow[];
  }
  const safe = q.replace(/[,()]/g, " ");

  // 0) Búsqueda semántica unificada (embeddings + filtros + fallback trigram).
  //    Respeta el RPC search_medications_semantic. Si la query es muy corta
  //    (< 3 chars) saltamos el embedding y dejamos que el RPC use trigram.
  const useSemantic = safe.trim().length >= 3;
  const qEmbedding = useSemantic ? await getQueryEmbedding(safe) : null;
  if (useSemantic) {
    try {
      const { data: semantic, error: semErr } = await supabase.rpc(
        "search_medications_semantic",
        {
          q_embedding: (qEmbedding as unknown as string) ?? null,
          q_text: safe,
          lim: limit,
        },
      );
      if (!semErr && semantic && (semantic as unknown[]).length) {
        return (semantic as MedicationRow[]).slice(0, limit);
      }
    } catch (err) {
      console.warn("search_medications_semantic failed, falling back:", err);
    }
  }

  // 1a) coincidencias directas en nombre, principio activo, indicación, categoría, marcas y síntomas
  const { data: direct, error } = await supabase
    .from("medications")
    .select("*")
    .or(
      `name.ilike.%${safe}%,active_ingredient.ilike.%${safe}%,indication.ilike.%${safe}%,category.ilike.%${safe}%,brand_names_text.ilike.%${safe}%,symptoms_text.ilike.%${safe}%`
    )
    .order("name")
    .limit(limit);
  if (error) throw error;
  let directRows = (direct ?? []) as MedicationRow[];

  // 1b) coincidencias por alias (marcas comerciales: Tylenol, Atamel, Panadol...)
  const { data: aliasHits } = await supabase
    .from("medication_aliases")
    .select("medication_id")
    .ilike("alias", `%${safe}%`)
    .limit(limit);
  const aliasIds = Array.from(new Set((aliasHits ?? []).map((a: { medication_id: string }) => a.medication_id)));
  if (aliasIds.length) {
    const { data: aliasMeds } = await supabase
      .from("medications").select("*").in("id", aliasIds).limit(limit);
    const have = new Set(directRows.map((m) => m.id));
    for (const m of (aliasMeds ?? []) as MedicationRow[]) if (!have.has(m.id)) directRows.push(m);
  }

  // 2) Si no hubo coincidencia directa, intentar búsqueda difusa (tolera errores tipográficos)
  let baseRows = directRows;
  if (!baseRows.length && q.trim().length >= 3) {
    const { data: fuzzy } = await supabase.rpc("search_medications_fuzzy", {
      q: safe,
      lim: limit,
    });
    baseRows = ((fuzzy ?? []) as MedicationRow[]);
  }

  // 2b) Fallback en vivo: si seguimos sin nada, pedir al servidor que descubra
  // este término en CIMA y/o pharmacies, lo cree, y reintentamos la búsqueda.
  if (!baseRows.length && q.trim().length >= 3) {
    try {
      const res = await fetch(`/api/public/hooks/discover-on-demand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: safe }),
      });
      if (res.ok) {
        const j = (await res.json()) as { created?: number };
        if ((j.created ?? 0) > 0) {
          const { data: again } = await supabase.rpc("search_medications_fuzzy", { q: safe, lim: limit });
          baseRows = ((again ?? []) as MedicationRow[]);
        }
      }
    } catch { /* silencioso */ }
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
