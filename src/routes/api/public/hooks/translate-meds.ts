import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Traduce al español el campo `indication` de medicamentos usando Lovable AI Gateway
// y lo guarda en `indication_es`. Procesa en lotes para reducir llamadas.

type Row = { id: string; name: string; indication: string };

async function translateBatch(items: Row[], apiKey: string): Promise<Record<string, string>> {
  const list = items.map((r, i) => `${i + 1}. [${r.id}] ${r.indication.replace(/\s+/g, " ").slice(0, 600)}`).join("\n");
  const prompt = `Traduce al español de Venezuela, claro y breve (máx 240 caracteres), las siguientes indicaciones médicas. Responde SOLO un JSON válido con la forma {"id": "texto traducido"}. No incluyas explicación.\n\n${list}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "Eres un traductor médico al español de Venezuela. Devuelves solo JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text().catch(() => "")}`);
  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content);
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 500);
    }
    return out;
  } catch {
    return {};
  }
}

export const Route = createFileRoute("/api/public/hooks/translate-meds")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 60) || 60, 200);
        const force = url.searchParams.get("force") === "1";
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return Response.json({ ok: false, error: "LOVABLE_API_KEY not configured" }, { status: 500 });

        let q = supabaseAdmin
          .from("medications")
          .select("id,name,indication,indication_es")
          .not("indication", "is", null)
          .limit(limit);
        if (!force) q = q.is("indication_es", null);

        const { data, error } = await q;
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        const rows = (data ?? []).filter((r: any) => r.indication) as Row[];
        if (!rows.length) return Response.json({ ok: true, scanned: 0, updated: 0 });

        let updated = 0;
        const errors: string[] = [];
        const BATCH = 10;
        for (let i = 0; i < rows.length; i += BATCH) {
          const chunk = rows.slice(i, i + BATCH);
          try {
            const map = await translateBatch(chunk, apiKey);
            for (const r of chunk) {
              const es = map[r.id];
              if (!es) continue;
              const { error: upErr } = await supabaseAdmin
                .from("medications")
                .update({ indication_es: es })
                .eq("id", r.id);
              if (upErr) errors.push(`${r.name}: ${upErr.message}`);
              else updated++;
            }
          } catch (e: any) {
            errors.push(e?.message ?? String(e));
          }
        }
        return Response.json({ ok: true, scanned: rows.length, updated, errors: errors.slice(0, 5) });
      },
    },
  },
});
