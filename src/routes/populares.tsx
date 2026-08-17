import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, TrendingUp, Pill } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { MedicationRow } from "@/lib/medications";

export const Route = createFileRoute("/populares")({
  component: PopularesPage,
  head: () => ({
    meta: [
      { title: "Lo más buscado — ¡Alerta: Medicina!" },
      {
        name: "description",
        content:
          "Los medicamentos más buscados por los usuarios de ¡Alerta: Medicina! con su mejor precio actual.",
      },
    ],
  }),
});

type Ranked = { medication_id: string; searches: number };

function PopularesPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<MedicationRow & { searches: number }>>([]);
  const [topQueries, setTopQueries] = useState<Array<{ q: string; n: number }>>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Eventos de los últimos 60 días.
      const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events } = await supabase
        .from("search_events")
        .select("medication_id, query")
        .gte("created_at", since)
        .limit(5000);

      const counts = new Map<string, number>();
      const qCounts = new Map<string, number>();
      for (const e of (events ?? []) as Array<{ medication_id: string | null; query: string | null }>) {
        if (e.medication_id) counts.set(e.medication_id, (counts.get(e.medication_id) ?? 0) + 1);
        if (e.query && e.query.trim().length >= 2) {
          const k = e.query.trim().toLowerCase();
          qCounts.set(k, (qCounts.get(k) ?? 0) + 1);
        }
      }

      const ranked: Ranked[] = Array.from(counts.entries())
        .map(([medication_id, searches]) => ({ medication_id, searches }))
        .sort((a, b) => b.searches - a.searches)
        .slice(0, 40);

      const ids = ranked.map((r) => r.medication_id);
      let meds: MedicationRow[] = [];
      if (ids.length) {
        const { data } = await supabase.from("medications").select("*").in("id", ids);
        meds = (data ?? []) as MedicationRow[];
      }
      // Fallback: si aún no hay tracking suficiente, mostramos catálogo alfabético.
      if (!meds.length) {
        const { data } = await supabase.from("medications").select("*").order("name").limit(40);
        meds = (data ?? []) as MedicationRow[];
      }
      const byId = new Map(meds.map((m) => [m.id, m]));
      const merged = ranked.length
        ? ranked
            .map((r) => {
              const m = byId.get(r.medication_id);
              return m ? { ...m, searches: r.searches } : null;
            })
            .filter(Boolean) as Array<MedicationRow & { searches: number }>
        : meds.map((m) => ({ ...m, searches: 0 }));

      setItems(merged);
      setTopQueries(
        Array.from(qCounts.entries())
          .map(([q, n]) => ({ q, n }))
          .sort((a, b) => b.n - a.n)
          .slice(0, 12),
      );
      setLoading(false);
    })();
  }, []);

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Star className="h-6 w-6" fill="currentColor" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Lo más buscado</h1>
          <p className="text-muted-foreground mt-1">
            Los medicamentos y términos que más busca la comunidad en los últimos 60 días.
          </p>
        </div>
      </div>

      {topQueries.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground">
            <TrendingUp className="h-4 w-4" /> Búsquedas populares
          </div>
          <div className="flex flex-wrap gap-2">
            {topQueries.map(({ q }) => (
              <Link
                key={q}
                to="/buscar"
                search={{ q }}
                className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                {q}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-bold mb-4">Medicamentos más consultados</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((m, idx) => (
              <Link key={m.id} to="/medicamento/$slug" params={{ slug: m.slug }}>
                <Card className="p-4 h-full hover:shadow-[var(--shadow-elevated)] hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Pill className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                        <h3 className="font-semibold truncate">
                          {(m.brand_names ?? [])[0] || m.name}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {m.active_ingredient}
                      </p>
                      {m.searches > 0 && (
                        <p className="text-[11px] text-primary font-medium mt-1">
                          {m.searches} {m.searches === 1 ? "búsqueda" : "búsquedas"}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
            {!items.length && (
              <p className="text-sm text-muted-foreground col-span-full">
                Aún no hay suficientes búsquedas. Vuelve pronto.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}