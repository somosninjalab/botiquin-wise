import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Estadísticas agregadas (últimos 30 días) para la presentación privada /nosotros.
// Solo devuelve conteos agregados: ningún dato personal.

const CHRONIC_CATEGORIES = new Set<string>([
  "Antihipertensivo",
  "Antidiabético",
  "Antidepresivo",
  "Hipolipemiante",
  "Antiepiléptico",
  "Anticoagulante",
  "Antipsicótico",
  "Antiulceroso",
  "Betabloqueante",
  "Hormonal",
  "Antiagregante",
  "Broncodilatador",
  "Corticoide",
  "Ansiolítico",
  "Diurético",
  "Antiparkinsoniano",
  "Inmunosupresor",
]);

export type PartnerStats = {
  days: number;
  generatedAt: string;
  traffic: {
    searches: number;
    uniqueVisitors: number;
    conversations: number;
    chatMessages: number;
    newUsers: number;
    totalUsers: number;
    whatsappShares: number;
    savingsUsd: number;
    dailySearches: Array<{ date: string; count: number }>;
  };
  web: {
    source: "live" | "snapshot";
    periodStart: string;
    periodEnd: string;
    visitors: number;
    pageviews: number;
    pagesPerVisit: number;
    avgSessionSec: number;
    bounceRatePct: number;
    mobilePct: number;
    topPages: Array<{ name: string; count: number }>;
    sources: Array<{ name: string; count: number }>;
    countries: Array<{ name: string; count: number }>;
  };
  cities: Array<{ name: string; count: number }>;
  regions: Array<{ name: string; count: number }>;
  pathologies: Array<{ category: string; hits: number; chronic: boolean }>;
  topMedications: Array<{ name: string; hits: number }>;
  topQueries: Array<{ name: string; count: number }>;
};

// ---- Tráfico web (visitas, rebote, duración, fuentes, países) ----
// Si existe LOVABLE_ACCESS_TOKEN se consulta la API de Lovable en vivo;
// si no (o si falla), se usa una instantánea verificada como respaldo.

type WebStats = PartnerStats["web"];

const COUNTRY_NAMES: Record<string, string> = {
  VE: "Venezuela", US: "Estados Unidos", ES: "España", CO: "Colombia",
  CL: "Chile", BO: "Bolivia", CA: "Canadá", IT: "Italia", CN: "China",
};

const SOURCE_NAMES: Record<string, string> = {
  "Direct": "Directo",
  "l.instagram.com": "Instagram",
  "google.com": "Google",
  "com.google.android.googlequicksearchbox": "App de Google",
  "com.google.android.gm": "Gmail",
  "accounts.google.com": "Cuentas Google",
  "bing.com": "Bing",
  "tiktok.com": "TikTok",
  "google.co.ve": "Google Venezuela",
};

const PAGE_NAMES: Record<string, string> = {
  "/": "Inicio",
  "/auth": "Registro",
  "/mis-alertas": "Mis alertas",
  "/mi-orden": "Mi orden",
  "/como-funciona": "Cómo funciona",
  "/buscar": "Buscar",
  "/populares": "Populares",
};

const WEB_SNAPSHOT: WebStats = {
  source: "snapshot",
  periodStart: "2026-08-22",
  periodEnd: "2026-09-21",
  visitors: 12271,
  pageviews: 58772,
  pagesPerVisit: 4.79,
  avgSessionSec: 255,
  bounceRatePct: 28.1,
  mobilePct: 93.7,
  topPages: [
    { name: "Inicio", count: 10889 },
    { name: "Registro", count: 3652 },
    { name: "Mis alertas", count: 1152 },
    { name: "Mi orden", count: 742 },
    { name: "Cómo funciona", count: 627 },
  ],
  sources: [
    { name: "Google", count: 5825 },
    { name: "Directo", count: 3162 },
    { name: "Instagram", count: 2287 },
    { name: "App de Google", count: 274 },
    { name: "Gmail", count: 174 },
  ],
  countries: [
    { name: "Venezuela", count: 11003 },
    { name: "Estados Unidos", count: 334 },
    { name: "China", count: 62 },
    { name: "España", count: 52 },
    { name: "Colombia", count: 27 },
    { name: "Chile", count: 23 },
  ],
};

function sumBuckets(metric: any): number {
  if (!metric) return 0;
  if (typeof metric.total === "number") return metric.total;
  const buckets = metric.buckets ?? metric.values ?? metric.data ?? [];
  if (Array.isArray(buckets)) {
    return buckets.reduce((s: number, b: any) => {
      const v = Number(b?.value ?? b?.count ?? b?.visitors ?? (typeof b === "number" ? b : 0));
      return s + (Number.isFinite(v) ? v : 0);
    }, 0);
  }
  return Number(metric) || 0;
}

function avgBuckets(metric: any): number {
  const buckets = metric?.buckets ?? metric?.values ?? metric?.data ?? [];
  if (!Array.isArray(buckets) || buckets.length === 0) return 0;
  const sum = buckets.reduce((s: number, b: any) => {
    const v = Number(b?.value ?? b?.count ?? (typeof b === "number" ? b : 0));
    return s + (Number.isFinite(v) ? v : 0);
  }, 0);
  return sum / buckets.length;
}

function listOf(obj: any, keys: string[]): any[] {
  if (!obj) return [];
  for (const k of keys) {
    if (Array.isArray(obj[k])) return obj[k];
  }
  return [];
}

function toItems(arr: any[], nameMap?: Record<string, string>) {
  return (arr ?? [])
    .map((x) => {
      const raw = String(x?.name ?? x?.label ?? x?.key ?? x?.page ?? "?");
      const mapped = nameMap?.[raw] ?? raw;
      const count = Number(x?.value ?? x?.count ?? x?.visitors ?? x?.visits ?? x?.pageviews ?? 0);
      return { name: mapped, count: Number.isFinite(count) ? count : 0 };
    })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

async function fetchWebStats(days: number): Promise<WebStats> {
  try {
    const token = process.env["LOVABLE_ACCESS_TOKEN"];
    if (!token) return WEB_SNAPSHOT;
    const projectId = process.env["VITE_SUPABASE_PROJECT_ID"] || "29cb77fa-e781-4931-bd63-2ff7e180ffda";
    const end = new Date();
    const start = new Date(Date.now() - days * 86400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const base = `https://api.lovable.dev/v1/projects/${projectId}/analytics`;
    const query = `start=${iso(start)}&end=${iso(end)}`;
    const headers = { "Lovable-API-Key": token };
    const [tsRes, brRes] = await Promise.all([
      fetch(`${base}?${query}&granularity=daily`, { headers }),
      fetch(`${base}/breakdowns?${query}`, { headers }),
    ]);
    if (!tsRes.ok || !brRes.ok) return WEB_SNAPSHOT;
    const ts: any = await tsRes.json();
    const br: any = await brRes.json();

    const visitors = sumBuckets(ts?.visitors ?? ts?.metrics?.visitors);
    const pageviews = sumBuckets(ts?.pageviews ?? ts?.pageViews ?? ts?.metrics?.pageviews);
    if (!visitors || !pageviews) return WEB_SNAPSHOT;

    const devices = toItems(listOf(br, ["devices", "device"]), {} as Record<string, string>);
    const deviceTotal = devices.reduce((s, d) => s + d.count, 0);
    const mobile = devices.find((d) => /mobile|phone/i.test(d.name))?.count ?? 0;

    return {
      source: "live",
      periodStart: iso(start),
      periodEnd: iso(end),
      visitors,
      pageviews,
      pagesPerVisit: Math.round((pageviews / visitors) * 100) / 100,
      avgSessionSec: Math.round(avgBuckets(ts?.sessionDuration ?? ts?.metrics?.sessionDuration ?? ts?.avgSessionDuration)),
      bounceRatePct: Math.round(avgBuckets(ts?.bounceRate ?? ts?.metrics?.bounceRate) * 10) / 10,
      mobilePct: deviceTotal ? Math.round((mobile / deviceTotal) * 1000) / 10 : 0,
      topPages: toItems(listOf(br, ["pages", "topPages"]), PAGE_NAMES).slice(0, 5),
      sources: toItems(listOf(br, ["sources", "referrers", "referringDomains"]), SOURCE_NAMES).slice(0, 6),
      countries: toItems(listOf(br, ["countries", "visitorCountries"]), COUNTRY_NAMES).slice(0, 6),
    };
  } catch {
    return WEB_SNAPSHOT;
  }
}

function topOf(map: Map<string, number>, limit: number) {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export const getPartnerStats = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ passcode: z.string().min(1).max(100) }).parse(input))
  .handler(async ({ data }): Promise<PartnerStats> => {
    const expected = process.env["PARTNER_DECK_PASSCODE"];
    if (!expected) throw new Error("La clave de acceso no está configurada.");
    const norm = (v: string) => v.trim().replace(/\s+/g, "").toLowerCase();
    if (norm(data.passcode) !== norm(expected)) throw new Error("Clave incorrecta.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const days = 30;
    const since = new Date(Date.now() - days * 86400_000).toISOString();

    // PostgREST devuelve máximo 1000 filas por petición: paginamos.
    const pageAll = async (
      table: "search_events" | "chat_conversations",
      columns: string,
      dateColumn: string,
    ): Promise<any[]> => {
      const out: any[] = [];
      for (let page = 0; page < 40; page++) {
        const from = page * 1000;
        const { data, error } = await supabaseAdmin
          .from(table)
          .select(columns)
          .gte(dateColumn, since)
          .order(dateColumn, { ascending: true })
          .range(from, from + 999);
        if (error) break;
        const rows = (data ?? []) as any[];
        out.push(...rows);
        if (rows.length < 1000) break;
      }
      return out;
    };

    const [events, convs, msgRes, newUsersRes, totalUsersRes, sharesRes] = await Promise.all([
      pageAll("search_events", "query, medication_id, user_id, city, region, country, created_at, savings_usd", "created_at"),
      pageAll("chat_conversations", "id, user_id, anon_token, city, region", "started_at"),
      supabaseAdmin
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
      supabaseAdmin
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .gte("created_at", since),
      supabaseAdmin.from("profiles").select("user_id", { count: "exact", head: true }),
      supabaseAdmin
        .from("share_events")
        .select("id", { count: "exact", head: true })
        .eq("channel", "whatsapp")
        .gte("created_at", since),
    ]);

    const cityMap = new Map<string, number>();
    const regionMap = new Map<string, number>();
    const queryMap = new Map<string, number>();
    const dayMap = new Map<string, number>();
    const medHits = new Map<string, number>();
    const visitors = new Set<string>();
    let savings = 0;

    for (const e of events) {
      const city = (e.city ?? "").trim();
      if (city) cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
      const region = (e.region ?? "").trim();
      if (region.length > 2) regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
      const q = (e.query ?? "").trim();
      if (q.length > 1) {
        const key = q.toLowerCase();
        queryMap.set(key, (queryMap.get(key) ?? 0) + 1);
      }
      const day = String(e.created_at ?? "").slice(0, 10);
      if (day) dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
      if (e.medication_id) medHits.set(e.medication_id, (medHits.get(e.medication_id) ?? 0) + 1);
      if (e.user_id) visitors.add(`u:${e.user_id}`);
      else if (city) visitors.add(`c:${city}`);
      savings += Number(e.savings_usd ?? 0);
    }

    for (const c of convs) {
      if (c.user_id) visitors.add(`u:${c.user_id}`);
      else if (c.anon_token) visitors.add(`a:${c.anon_token}`);
      const city = (c.city ?? "").trim();
      if (city) cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
      const region = (c.region ?? "").trim();
      if (region.length > 2) regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
    }

    // Medicinas y patologías
    const medIds = Array.from(medHits.keys());
    const pathMap = new Map<string, number>();
    const medNames = new Map<string, number>();
    if (medIds.length) {
      const { data: meds } = await supabaseAdmin
        .from("medications")
        .select("id, name, category")
        .in("id", medIds);
      for (const m of meds ?? []) {
        const hits = medHits.get(m.id) ?? 0;
        if (m.name) medNames.set(m.name, (medNames.get(m.name) ?? 0) + hits);
        if (m.category) pathMap.set(m.category, (pathMap.get(m.category) ?? 0) + hits);
      }
    }

    const dailySearches = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const pathologies = Array.from(pathMap.entries())
      .map(([category, hits]) => ({ category, hits, chronic: CHRONIC_CATEGORIES.has(category) }))
      .sort((a, b) => {
        if (a.chronic !== b.chronic) return a.chronic ? -1 : 1;
        return b.hits - a.hits;
      })
      .slice(0, 12);

    return {
      days,
      generatedAt: new Date().toISOString(),
      traffic: {
        searches: events.length,
        uniqueVisitors: visitors.size,
        conversations: convs.length,
        chatMessages: msgRes.count ?? 0,
        newUsers: newUsersRes.count ?? 0,
        totalUsers: totalUsersRes.count ?? 0,
        whatsappShares: sharesRes.count ?? 0,
        savingsUsd: Math.round(savings),
        dailySearches,
      },
      cities: topOf(cityMap, 15),
      regions: topOf(regionMap, 10),
      pathologies,
      topMedications: topOf(medNames, 15).map((m) => ({ name: m.name, hits: m.count })),
      topQueries: topOf(queryMap, 15),
    };
  });
