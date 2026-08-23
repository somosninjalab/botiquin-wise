import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getTotalSearches = createServerFn({ method: "GET" }).handler(async () => {
  const { count, error } = await supabaseAdmin
    .from("search_events")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  const { data: savings } = await supabaseAdmin.rpc("total_search_savings");
  return { total: count ?? 0, savingsUsd: Number(savings ?? 0) };
});

export const getPopularQueries = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("search_events")
    .select("query")
    .not("query", "is", null)
    .gt("result_count", 0)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  const counts = new Map<string, { label: string; count: number }>();
  for (const row of data ?? []) {
    const raw = (row.query ?? "").trim();
    if (raw.length < 2) continue;
    const key = raw.toLowerCase();
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { label: raw, count: 1 });
  }
  const items = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 60);
  return { items };
});
