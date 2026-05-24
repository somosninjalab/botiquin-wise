import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function roundToNearestThousand(n: number): number {
  return Math.floor(n / 1000) * 1000;
}

export const getTotalSearches = createServerFn({ method: "GET" }).handler(async () => {
  const { count, error } = await supabaseAdmin
    .from("search_events")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return { total: roundToNearestThousand(count ?? 1) };
});
