import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Snapshot semanal de inteligencia de mercado: exporta CSVs de señales,
// conversaciones, perfiles de salud y catálogo demandado al bucket
// `insights-exports`. Programado vía pg_cron los lunes 10:00 UTC.

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Array.from(
    rows.reduce((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>())
  );
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}

async function upload(path: string, csv: string) {
  return supabaseAdmin.storage.from("insights-exports").upload(path, csv, {
    contentType: "text/csv; charset=utf-8",
    upsert: true,
  });
}

export const Route = createFileRoute("/api/public/hooks/insights-snapshot")({
  server: {
    handlers: {
      POST: async () => {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const week = new Date().toISOString().slice(0, 10);
        const prefix = `weekly/${week}`;

        const [signals, conversations, profiles] = await Promise.all([
          supabaseAdmin
            .from("health_signals")
            .select("id, signal_type, value, normalized_value, city, region, conversation_id, user_id, medication_id, tag_id, created_at")
            .gte("created_at", since)
            .limit(50000),
          supabaseAdmin
            .from("chat_conversations")
            .select("id, user_id, anon_token, city, region, country, message_count, ended_in_signup, started_at, last_activity_at")
            .gte("started_at", since)
            .limit(50000),
          supabaseAdmin
            .from("user_health_profile")
            .select("user_id, age_range, sex, chronic_conditions, current_medications, other_meds_text, updated_at")
            .limit(50000),
        ]);

        const errors: string[] = [];
        for (const r of [signals, conversations, profiles]) {
          if (r.error) errors.push(r.error.message);
        }
        if (errors.length) {
          return Response.json({ ok: false, errors }, { status: 500 });
        }

        const uploads = await Promise.all([
          upload(`${prefix}/health_signals.csv`, toCsv((signals.data ?? []) as any[])),
          upload(`${prefix}/chat_conversations.csv`, toCsv((conversations.data ?? []) as any[])),
          upload(`${prefix}/user_health_profile.csv`, toCsv((profiles.data ?? []) as any[])),
        ]);

        const uploadErrors = uploads.filter((u) => u.error).map((u) => u.error!.message);
        if (uploadErrors.length) {
          return Response.json({ ok: false, uploadErrors }, { status: 500 });
        }

        return Response.json({
          ok: true,
          week,
          prefix,
          counts: {
            signals: signals.data?.length ?? 0,
            conversations: conversations.data?.length ?? 0,
            profiles: profiles.data?.length ?? 0,
          },
        });
      },
    },
  },
});