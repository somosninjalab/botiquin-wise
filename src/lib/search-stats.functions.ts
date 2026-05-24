import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getTotalSearches = createServerFn({ method: "GET" }).handler(async () => {
  const { count, error } = await supabaseAdmin
    .from("search_events")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return { total: count ?? 0 };
});
