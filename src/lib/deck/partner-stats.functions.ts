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
  cities: Array<{ name: string; count: number }>;
  regions: Array<{ name: string; count: number }>;
  pathologies: Array<{ category: string; hits: number; chronic: boolean }>;
  topMedications: Array<{ name: string; hits: number }>;
  topQueries: Array<{ name: string; count: number }>;
};

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
    if (data.passcode.trim() !== expected) throw new Error("Clave incorrecta.");

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
      const region = (e.region ?? e.country ?? "").trim();
      if (region) regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
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
      if (region) regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
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
