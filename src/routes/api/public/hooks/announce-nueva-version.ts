import { createFileRoute } from "@tanstack/react-router";
import { verifyCronAuth } from "@/lib/cron-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";

// Anuncio único: nueva versión funcionando al 100%.
// Envío por tandas: `?limit=N` (default 150) por corrida, con pausa entre encolados.
// Idempotente: nunca reenvía a quien ya recibió el anuncio (email_idempotency_keys).

const CAMPAIGN = "nueva-version-2026-08";
const DEFAULT_LIMIT = 150;
const MAX_LIMIT = 400;
const DELAY_MS = 120;

export const Route = createFileRoute("/api/public/hooks/announce-nueva-version")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = verifyCronAuth(request);
        if (unauthorized) return unauthorized;
        const url = new URL(request.url);
        const limit = Math.min(
          MAX_LIMIT,
          Math.max(1, parseInt(url.searchParams.get("limit") ?? "", 10) || DEFAULT_LIMIT),
        );

        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select("user_id, email, full_name")
          .not("email", "is", null);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const all = ((profiles ?? []) as any[]).filter((p) => !!p.email);

        // Ya enviados: claves de idempotencia de esta campaña.
        const done = new Set<string>();
        const PAGE = 1000;
        for (let from = 0; ; from += PAGE) {
          const { data: keys } = await supabaseAdmin
            .from("email_idempotency_keys")
            .select("key")
            .like("key", `${CAMPAIGN}-%`)
            .range(from, from + PAGE - 1);
          for (const k of keys ?? []) done.add((k as any).key);
          if (!keys || keys.length < PAGE) break;
        }

        const pending = all.filter((p) => !done.has(`${CAMPAIGN}-${p.user_id}`));
        const batch = pending.slice(0, limit);

        let queued = 0;
        let skipped = 0;
        for (const p of batch) {
          const r = await enqueueTransactionalEmail({
            supabase: supabaseAdmin,
            templateName: "nueva-version",
            recipientEmail: p.email,
            idempotencyKey: `${CAMPAIGN}-${p.user_id}`,
            templateData: { name: p.full_name?.split(" ")[0] },
          });
          if (r.success) queued++; else skipped++;
          if (DELAY_MS) await new Promise((res) => setTimeout(res, DELAY_MS));
        }

        return Response.json({
          ok: true,
          campaign: CAMPAIGN,
          candidates: all.length,
          alreadySent: done.size,
          processed: batch.length,
          queued,
          skipped,
          remaining: Math.max(0, pending.length - batch.length),
        });
      },
    },
  },
});