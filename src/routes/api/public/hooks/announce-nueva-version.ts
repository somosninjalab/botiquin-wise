import { createFileRoute } from "@tanstack/react-router";
import { verifyCronAuth } from "@/lib/cron-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";

// Anuncio único: nueva versión funcionando al 100%.
// Soporta chunking `?chunk=N&of=M` para repartir el envío en varias corridas.
// Idempotente: cada usuario recibe el anuncio una sola vez.

const CAMPAIGN = "nueva-version-2026-08";

export const Route = createFileRoute("/api/public/hooks/announce-nueva-version")({
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
          .select("user_id, email, full_name")
          .not("email", "is", null);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

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

        let queued = 0;
        let skipped = 0;
        for (const p of mine) {
          if (!p.email) { skipped++; continue; }
          const r = await enqueueTransactionalEmail({
            supabase: supabaseAdmin,
            templateName: "nueva-version",
            recipientEmail: p.email,
            idempotencyKey: `${CAMPAIGN}-${p.user_id}`,
            templateData: { name: p.full_name?.split(" ")[0] },
          });
          if (r.success) queued++; else skipped++;
        }

        return Response.json({
          ok: true,
          campaign: CAMPAIGN,
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