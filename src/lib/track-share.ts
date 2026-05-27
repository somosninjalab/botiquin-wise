import { supabase } from "@/integrations/supabase/client";

type ShareArgs = {
  channel: "whatsapp" | "native" | "copy" | string;
  source?: string; // p.ej. "mobile_header", "medication_page"
  url?: string;
};

export async function trackShare(args: ShareArgs) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("share_events").insert({
      channel: args.channel.slice(0, 40),
      source: args.source ? args.source.slice(0, 100) : null,
      url: args.url ? args.url.slice(0, 500) : null,
      user_id: user?.id ?? null,
    });
  } catch {
    // No bloquear UX por fallos de tracking
  }
}