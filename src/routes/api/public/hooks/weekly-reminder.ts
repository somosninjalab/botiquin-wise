import { createFileRoute } from "@tanstack/react-router";
import { verifyCronAuth } from "@/lib/cron-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";

// Envía un recordatorio semanal a usuarios con `weekly_digest = true`.
// Soporta chunking vía query params `?chunk=N&of=M` (default 0/1 = todo el set)
// para que pg_cron pueda dividir el envío en varias corridas espaciadas y no
// saturar la cola con miles de mensajes a la vez.

export const Route = createFileRoute("/api/public/hooks/weekly-reminder")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = verifyCronAuth(request);
        if (unauthorized) return unauthorized;
        const url = new URL(request.url);
        const chunk = Math.max(0, parseInt(url.searchParams.get("chunk") ?? "0", 10) || 0);
        const of = Math.max(1, parseInt(url.searchParams.get("of") ?? "1", 10) || 1);
        const safeChunk = chunk >= of ? 0 : chunk;

        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select("user_id, email, full_name, weekly_digest")
          .eq("weekly_digest", true)
          .not("email", "is", null);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const week = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        let queued = 0;
        let skipped = 0;
        // Hash determinístico (FNV-1a 32-bit) sobre user_id para repartir en buckets estables.
        const bucketOf = (s: string): number => {
          let h = 0x811c9dc5;
          for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
          }
          return h % of;
        };

        const all = (profiles ?? []) as any[];
        const mine = of === 1 ? all : all.filter((p) => bucketOf(String(p.user_id)) === safeChunk);

        for (const p of mine) {
          if (!p.email) { skipped++; continue; }
          const r = await enqueueTransactionalEmail({
            supabase: supabaseAdmin,
            templateName: "weekly-reminder",
            recipientEmail: p.email,
            idempotencyKey: `weekly-reminder-${p.user_id}-${week}`,
            templateData: { name: p.full_name?.split(" ")[0] },
          });
          if (r.success) queued++; else skipped++;
        }

        return Response.json({
          ok: true,
          chunk: safeChunk,
          of,
          candidates: all.length,
          processed: mine.length,
          queued,
          skipped,
        });
      },
    },
  },
});