import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";

// Envía un recordatorio semanal a todos los usuarios registrados con
// `weekly_digest = true` y un email confirmado. Se programa vía pg_cron
// los lunes a las 11:00 UTC (07:00 Venezuela, UTC-4).

export const Route = createFileRoute("/api/public/hooks/weekly-reminder")({
  server: {
    handlers: {
      POST: async () => {
        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select("user_id, email, full_name, weekly_digest")
          .eq("weekly_digest", true)
          .not("email", "is", null);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        // Solo a usuarios con email confirmado
        const userIds = (profiles ?? []).map((p: any) => p.user_id);
        const confirmed = new Set<string>();
        if (userIds.length) {
          // chunk to avoid huge IN clauses
          for (let i = 0; i < userIds.length; i += 500) {
            const slice = userIds.slice(i, i + 500);
            const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            // Fallback: filter from the full list (admin API has no in() filter)
            for (const u of (data?.users ?? []) as any[]) {
              if (u.email_confirmed_at && slice.includes(u.id)) confirmed.add(u.id);
            }
            break; // listUsers returns all in one page below perPage; avoid loop
          }
        }

        const week = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (Monday)
        let queued = 0;
        let skipped = 0;
        for (const p of (profiles ?? []) as any[]) {
          if (!p.email) { skipped++; continue; }
          if (!confirmed.has(p.user_id)) { skipped++; continue; }
          const r = await enqueueTransactionalEmail({
            supabase: supabaseAdmin,
            templateName: "weekly-reminder",
            recipientEmail: p.email,
            idempotencyKey: `weekly-reminder-${p.user_id}-${week}`,
            templateData: { name: p.full_name?.split(" ")[0] },
          });
          if (r.success) queued++; else skipped++;
        }

        return Response.json({ ok: true, candidates: profiles?.length ?? 0, queued, skipped });
      },
    },
  },
});