import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";

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
        // Ventana por defecto = 24h: el resumen diario solo agrupa cambios
        // detectados en el día actual (no arrastra días anteriores).
        const hours = Math.max(1, Math.min(Number(url.searchParams.get("hours") ?? 24) || 24, 720));
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

        // ── Notify followers by email ───────────────────────────────────
        // Group inserted alerts by user (intersect with followers + threshold).
        let emailsQueued = 0;
        if (toInsert.length) {
          const medIds = Array.from(new Set(toInsert.map((a) => a.medication_id)));
          const pharmIds = Array.from(new Set(toInsert.map((a) => a.pharmacy_id)));

          const [{ data: followers }, { data: meds }, { data: pharms }] = await Promise.all([
            supabaseAdmin.from("medication_followers").select("user_id, medication_id, threshold_pct").in("medication_id", medIds),
            supabaseAdmin.from("medications").select("id, name, active_ingredient").in("id", medIds),
            supabaseAdmin.from("pharmacies").select("id, name").in("id", pharmIds),
          ]);

          const medById = new Map((meds ?? []).map((m: any) => [m.id, m]));
          const pharmById = new Map((pharms ?? []).map((p: any) => [p.id, p]));

          // Group alerts by user, applying their personal threshold
          const byUser = new Map<string, any[]>();
          for (const f of (followers ?? []) as any[]) {
            const userAlerts = toInsert.filter(
              (a) => a.medication_id === f.medication_id && Math.abs(a.pct_change) >= Number(f.threshold_pct ?? 0),
            );
            if (!userAlerts.length) continue;
            const arr = byUser.get(f.user_id) ?? [];
            for (const a of userAlerts) {
              const med = medById.get(a.medication_id);
              const ph = pharmById.get(a.pharmacy_id);
              arr.push({
                medication: med?.name ?? "Medicamento",
                ingredient: med?.active_ingredient,
                pharmacy: ph?.name ?? "Farmacia",
                previousPrice: Number(a.previous_price),
                newPrice: Number(a.new_price),
                pctChange: Number(a.pct_change),
                currency: a.currency,
              });
            }
            byUser.set(f.user_id, arr);
          }

          if (byUser.size) {
            const userIds = Array.from(byUser.keys());
            const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();

            // Solo notificar a usuarios que hicieron al menos una búsqueda
            // en las últimas 24h.
            const { data: activeSearches } = await supabaseAdmin
              .from("search_events")
              .select("user_id")
              .in("user_id", userIds)
              .gte("created_at", since24h);
            const activeUserIds = new Set(
              (activeSearches ?? []).map((s: any) => s.user_id).filter(Boolean),
            );

            const { data: profiles } = await supabaseAdmin
              .from("profiles")
              .select("user_id, email, full_name, instant_alerts")
              .in("user_id", Array.from(activeUserIds));

            for (const p of (profiles ?? []) as any[]) {
              if (!p.email || p.instant_alerts === false) continue;
              const items = byUser.get(p.user_id) ?? [];
              if (!items.length) continue;
              // Máximo 1 email por usuario por día (UTC).
              const idemKey = `price-alert-${p.user_id}-${new Date().toISOString().slice(0, 10)}`;
              const r = await enqueueTransactionalEmail({
                supabase: supabaseAdmin,
                templateName: "price-alert",
                recipientEmail: p.email,
                idempotencyKey: idemKey,
                templateData: { name: p.full_name?.split(" ")[0], items },
              });
              if (r.success) emailsQueued++;
            }
          }
        }

        return Response.json({
          ok: true,
          threshold,
          hours,
          pairs_checked: byPair.size,
          alerts_candidate: toInsert.length,
          alerts_inserted: inserted,
          emails_queued: emailsQueued,
        });
      },
    },
  },
});