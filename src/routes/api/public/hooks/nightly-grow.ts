import { createFileRoute } from "@tanstack/react-router";
import { verifyCronAuth } from "@/lib/cron-auth.server";
import { SEED_TERMS } from "./seed-cima";

// Cron diario: rota un subconjunto de términos de CIMA cada noche y luego
// dispara enrich-meds. Diseñado para ser invocado por pg_cron una vez al día.
// El subconjunto rota según el día del año, así el catálogo crece sin
// repetir todo cada noche.

const TERMS_PER_DAY = 10;
const PAGES_PER_TERM = 3;
const ENRICH_LIMIT = 50;

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400000);
}

export const Route = createFileRoute("/api/public/hooks/nightly-grow")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = verifyCronAuth(request);
        if (unauthorized) return unauthorized;
        const url = new URL(request.url);
        const origin = url.origin;
        const cronSecret = process.env.CRON_SECRET ?? "";
        const authHeaders = { Authorization: `Bearer ${cronSecret}` };

        // Selección rotativa de términos
        const doy = dayOfYear(new Date());
        const total = SEED_TERMS.length;
        const start = (doy * TERMS_PER_DAY) % total;
        const slice: string[] = [];
        for (let i = 0; i < TERMS_PER_DAY; i++) {
          slice.push(SEED_TERMS[(start + i) % total]);
        }

        const seedResults: Array<{ term: string; ok: boolean; createdMeds?: number; createdAliases?: number; error?: string }> = [];
        for (const term of slice) {
          try {
            const r = await fetch(
              `${origin}/api/public/hooks/seed-cima?term=${encodeURIComponent(term)}&pages=${PAGES_PER_TERM}`,
              { method: "POST", headers: authHeaders },
            );
            const body = await r.json().catch(() => ({}));
            seedResults.push({ term, ok: r.ok, createdMeds: body?.createdMeds, createdAliases: body?.createdAliases });
          } catch (e) {
            seedResults.push({ term, ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        }

        // Enriquecer un lote
        let enrich: any = null;
        try {
          const r = await fetch(
            `${origin}/api/public/hooks/enrich-meds?limit=${ENRICH_LIMIT}`,
            { method: "POST", headers: authHeaders },
          );
          enrich = await r.json().catch(() => ({ ok: r.ok }));
        } catch (e) {
          enrich = { ok: false, error: e instanceof Error ? e.message : String(e) };
        }

        return Response.json({
          ok: true,
          rotation: { dayOfYear: doy, start, count: TERMS_PER_DAY, total },
          terms: slice,
          seed: seedResults,
          enrich,
        });
      },
    },
  },
});