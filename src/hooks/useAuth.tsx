import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { lookupRequestGeo } from "@/lib/profile/geo.functions";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
      if (s?.user) {
        setTimeout(async () => {
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", s.user.id)
            .eq("role", "admin")
            .maybeSingle();
          setIsAdmin(!!data);
        }, 0);
        // Enrich profile location (city/region/country) if missing.
        setTimeout(() => { enrichProfileGeo(s.user.id); }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

async function enrichProfileGeo(userId: string) {
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("city")
      .eq("user_id", userId)
      .maybeSingle();
    if (prof?.city) return; // ya tiene ciudad
    const geo = await lookupRequestGeo();
    if (!geo?.city && !geo?.region && !geo?.country) return;
    await supabase
      .from("profiles")
      .update({
        city: geo.city,
        region: geo.region,
        country: geo.country,
        ip_first_seen: geo.ip ?? undefined,
      })
      .eq("user_id", userId);
  } catch {
    // no-op
  }
}
