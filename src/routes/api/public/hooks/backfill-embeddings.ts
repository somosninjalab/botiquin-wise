import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { embedTexts, buildMedicationEmbeddingText } from "@/lib/medications/embed.server";

// Backfills medications.embedding for rows that are missing it OR whose
// content has changed since the last embedding. Idempotent and safe to
// re-run. Body params:
//   - limit:   max rows to process (default 100, max 500)
//   - force:   if true, re-embed even rows that already have an embedding
//
// Suitable for pg_cron nightly invocation.
export const Route = createFileRoute("/api/public/hooks/backfill-embeddings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { limit?: number; force?: boolean } = {};
        try { body = (await request.json()) as typeof body; } catch { /* empty */ }
        const limit = Math.min(Math.max(body.limit ?? 100, 1), 500);
        const force = !!body.force;

        let query = supabaseAdmin
          .from("medications")
          .select(
            "id, name, active_ingredient, presentation, category, indication, indication_es, manufacturer, brand_names, symptoms_text, embedding_updated_at",
          )
          .order("embedding_updated_at", { ascending: true, nullsFirst: true })
          .limit(limit);
        if (!force) query = query.is("embedding", null);

        const { data: meds, error } = await query;
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
        if (!meds || !meds.length) {
          return new Response(JSON.stringify({ processed: 0, message: "nothing to do" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        // Pull tag labels per med to enrich embedding text.
        const ids = meds.map((m) => m.id);
        const { data: medTags } = await supabaseAdmin
          .from("medication_tags")
          .select("medication_id, tags(label_es)")
          .in("medication_id", ids);
        const labelsByMed = new Map<string, string[]>();
        for (const row of (medTags ?? []) as Array<{ medication_id: string; tags: { label_es: string } | null }>) {
          const arr = labelsByMed.get(row.medication_id) ?? [];
          if (row.tags?.label_es) arr.push(row.tags.label_es);
          labelsByMed.set(row.medication_id, arr);
        }

        const texts = meds.map((m) =>
          buildMedicationEmbeddingText({ ...m, tag_labels: labelsByMed.get(m.id) ?? [] }),
        );

        let vectors: number[][];
        try {
          vectors = await embedTexts(texts, "document");
        } catch (err) {
          console.error("backfill-embeddings: embed failed", err);
          return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 502, headers: { "Content-Type": "application/json" },
          });
        }

        let updated = 0;
        let failed = 0;
        for (let i = 0; i < meds.length; i++) {
          const v = vectors[i];
          if (!v) { failed++; continue; }
          const { error: upErr } = await supabaseAdmin
            .from("medications")
            .update({ embedding: v as unknown as string, embedding_updated_at: new Date().toISOString() })
            .eq("id", meds[i].id);
          if (upErr) { failed++; console.error("update embedding failed", meds[i].id, upErr); }
          else updated++;
        }

        return new Response(JSON.stringify({ processed: meds.length, updated, failed }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});