import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Procesa cambios significativos de precio en las últimas N horas y crea filas
// en `price_alerts` (visible en el home + base para notificaciones por email).
//
// Regla: para cada (medicamento, farmacia), comparamos los 2 últimos precios
// dentro de la ventana. Si |Δ%| >= threshold, registramos la alerta. La
// constraint UNIQUE (medication_id, pharmacy_id, new_price, previous_price)
// evita duplicados cuando el cron corre varias veces.

type Row = { medication_id: string; pharmacy_id: string; price: number; currency: string; scraped_at: string };

export const Route = createFileRoute("/api/public/hooks/process-price-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const threshold = Math.max(1, Math.min(Number(url.searchParams.get("threshold") ?? 5) || 5, 90));
        const hours = Math.max(1, Math.min(Number(url.searchParams.get("hours") ?? 72) || 72, 720));
        const since = new Date(Date.now() - hours * 3_600_000).toISOString();

        const { data, error } = await supabaseAdmin
          .from("medication_prices")
          .select("medication_id, pharmacy_id, price, currency, scraped_at")
          .gte("scraped_at", since)
          .order("scraped_at", { ascending: true })
          .limit(20000);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        // Agrupar por (med, pharm)
        const byPair = new Map<string, Row[]>();
        for (const r of (data ?? []) as Row[]) {
          if (!r.price || r.price <= 0) continue;
          const k = `${r.medication_id}|${r.pharmacy_id}`;
          const arr = byPair.get(k) ?? [];
          arr.push(r);
          byPair.set(k, arr);
        }

        const toInsert: any[] = [];
        for (const arr of byPair.values()) {
          if (arr.length < 2) continue;
          // Tomamos el último y el primero ANTERIOR distinto en precio.
          const last = arr[arr.length - 1];
          let prev = null as Row | null;
          for (let i = arr.length - 2; i >= 0; i--) {
            if (arr[i].price !== last.price && arr[i].currency === last.currency) { prev = arr[i]; break; }
          }
          if (!prev) continue;
          const pct = ((last.price - prev.price) / prev.price) * 100;
          if (Math.abs(pct) < threshold) continue;
          toInsert.push({
            medication_id: last.medication_id,
            pharmacy_id: last.pharmacy_id,
            previous_price: prev.price,
            new_price: last.price,
            pct_change: Number(pct.toFixed(2)),
            currency: last.currency,
          });
        }

        let inserted = 0;
        if (toInsert.length) {
          // Insert one-by-one to respect the dedup unique index gracefully.
          for (const row of toInsert) {
            const { error: ie } = await supabaseAdmin.from("price_alerts").insert(row);
            if (!ie) inserted++;
          }
        }

        return Response.json({
          ok: true,
          threshold,
          hours,
          pairs_checked: byPair.size,
          alerts_candidate: toInsert.length,
          alerts_inserted: inserted,
        });
      },
    },
  },
});