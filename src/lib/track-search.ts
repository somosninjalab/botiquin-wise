import { supabase } from "@/integrations/supabase/client";
import { trackSearchServer } from "./track-search.functions";

type TrackArgs = {
  query?: string;
  medication_id?: string;
  category?: string | null;
  result_count?: number;
};

// Caché por sesión para no repetir el SELECT del perfil en cada búsqueda.
let geoCache: { user_id: string | null; city: string | null; region: string | null; country: string | null } | null = null;
let geoCacheUserId: string | null | undefined = undefined;

async function getGeo() {
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user?.id ?? null;
  if (geoCache && geoCacheUserId === uid) return geoCache;
  geoCacheUserId = uid;
  if (!uid) {
    geoCache = { user_id: null, city: null, region: null, country: null };
    return geoCache;
  }
  const { data } = await supabase
    .from("profiles")
    .select("city, region, country")
    .eq("user_id", uid)
    .maybeSingle();
  geoCache = {
    user_id: uid,
    city: data?.city ?? null,
    region: data?.region ?? null,
    country: data?.country ?? null,
  };
  return geoCache;
}

export async function trackSearch(args: TrackArgs) {
  try {
    const geo = await getGeo();
    // Server-side insert: resuelve geo desde IP (Cloudflare / ipapi)
    // para que también funcione con visitantes anónimos.
    // Note: user_id is intentionally NOT sent — the server resolves it from
    // the Authorization header to prevent analytics spoofing.
    void geo;
    await trackSearchServer({
      data: {
        query: args.query ? args.query.slice(0, 200) : null,
        medication_id: args.medication_id ?? null,
        category: args.category ?? null,
        result_count: args.result_count ?? null,
      },
    });
  } catch {
    // No bloquear UX por fallos de tracking.
  }
}