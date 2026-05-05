import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SearchBar } from "@/components/SearchBar";
import { Card } from "@/components/ui/card";
import { Pill } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  formatBs,
  getLatestPricesForMedications,
  lowestCurrent,
  priorPrice,
  searchMedications,
  type MedicationRow,
  type PriceRow,
} from "@/lib/medications";

const schema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/buscar")({
  validateSearch: (s) => schema.parse(s),
  component: BuscarPage,
});

function BuscarPage() {
  const { q } = Route.useSearch();
  const [meds, setMeds] = useState<MedicationRow[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [pharms, setPharms] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const m = await searchMedications(q, 50);
      setMeds(m);
      const p = await getLatestPricesForMedications(m.map((x) => x.id));
      setPrices(p);
      const { data: ph } = await supabase.from("pharmacies").select("id,name");
      setPharms(Object.fromEntries((ph ?? []).map((x: any) => [x.id, x.name])));
      // Log search event
      if (q.trim()) {
        await supabase.from("search_events").insert({ query: q.slice(0, 200) });
      }
      setLoading(false);
    })();
  }, [q]);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold">Resultados de búsqueda</h1>
        <p className="text-muted-foreground mt-1">
          {q ? <>Mostrando coincidencias para <span className="font-medium text-foreground">"{q}"</span></> : "Explora todos los medicamentos."}
        </p>
        <div className="mt-6"><SearchBar initial={q} /></div>
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <p className="text-muted-foreground">Buscando…</p>}
        {!loading && meds.length === 0 && (
          <Card className="p-6 col-span-full text-center">
            <p className="text-muted-foreground">No encontramos resultados. Intenta con el principio activo.</p>
          </Card>
        )}
        {meds.map((m) => {
          const lo = lowestCurrent(prices, m.id);
          const prev = lo ? priorPrice(prices, m.id, lo.pharmacy_id, lo.scraped_at) : null;
          const drop = prev && lo && prev.price > lo.price ? ((prev.price - lo.price) / prev.price) * 100 : 0;
          return (
            <Link key={m.id} to="/medicamento/$slug" params={{ slug: m.slug }}>
              <Card className="p-5 h-full hover:shadow-[var(--shadow-elevated)] transition-all hover:-translate-y-0.5">
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary"><Pill className="h-5 w-5" /></div>
                  {drop > 1 && (
                    <span className="text-xs font-bold rounded-full bg-accent/15 text-accent px-2 py-0.5">
                      ↓ {drop.toFixed(0)}%
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-semibold">{m.name}</h3>
                <p className="text-xs text-muted-foreground">{m.active_ingredient} · {m.presentation}</p>
                {m.indication && <p className="text-xs text-muted-foreground mt-1">{m.indication}</p>}
                {lo && (
                  <div className="mt-3 pt-3 border-t border-border/60 flex items-end justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Mejor precio</div>
                      <div className="text-xs font-medium">{pharms[lo.pharmacy_id]}</div>
                    </div>
                    <div className="text-xl font-bold text-primary">{formatBs(Number(lo.price), lo.currency)}</div>
                  </div>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
