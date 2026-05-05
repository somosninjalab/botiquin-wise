import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { SearchBar } from "@/components/SearchBar";
import { Card } from "@/components/ui/card";
import { Pill } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatBs,
  getLatestPricesForMedications,
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
  const [pharmFilter, setPharmFilter] = useState<string>("all");
  const [medFilter, setMedFilter] = useState<string>("all");

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

  // Latest price per (medication, pharmacy)
  const latestByMedPharm = useMemo(() => {
    const map = new Map<string, PriceRow>();
    for (const p of prices) {
      const key = `${p.medication_id}|${p.pharmacy_id}`;
      if (!map.has(key)) map.set(key, p); // prices already sorted desc by scraped_at
    }
    return map;
  }, [prices]);

  // Lowest current price per medication, considering pharmacy filter
  const lowestByMed = useMemo(() => {
    const out = new Map<string, PriceRow>();
    for (const [key, p] of latestByMedPharm) {
      if (pharmFilter !== "all" && p.pharmacy_id !== pharmFilter) continue;
      const cur = out.get(p.medication_id);
      if (!cur || p.price < cur.price) out.set(p.medication_id, p);
    }
    return out;
  }, [latestByMedPharm, pharmFilter]);

  const filteredMeds = useMemo(() => {
    let list = meds;
    if (medFilter !== "all") list = list.filter((m) => m.id === medFilter);
    if (pharmFilter !== "all") list = list.filter((m) => lowestByMed.has(m.id));
    return list;
  }, [meds, medFilter, pharmFilter, lowestByMed]);

  // Group by category (tipo), sort each group by lowest price asc
  const grouped = useMemo(() => {
    const groups = new Map<string, MedicationRow[]>();
    for (const m of filteredMeds) {
      const cat = m.category || "Otros";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(m);
    }
    for (const [, arr] of groups) {
      arr.sort((a, b) => {
        const pa = lowestByMed.get(a.id)?.price ?? Number.POSITIVE_INFINITY;
        const pb = lowestByMed.get(b.id)?.price ?? Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredMeds, lowestByMed]);

  const pharmacyOptions = Object.entries(pharms).sort(([, a], [, b]) => a.localeCompare(b));

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold">Resultados de búsqueda</h1>
        <p className="text-muted-foreground mt-1">
          {q ? <>Mostrando coincidencias para <span className="font-medium text-foreground">"{q}"</span></> : "Explora todos los medicamentos."}
        </p>
        <div className="mt-6"><SearchBar initial={q} /></div>
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">Filtrar por farmacia</label>
          <Select value={pharmFilter} onValueChange={setPharmFilter}>
            <SelectTrigger><SelectValue placeholder="Todas las farmacias" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las farmacias</SelectItem>
              {pharmacyOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">Filtrar por medicamento</label>
          <Select value={medFilter} onValueChange={setMedFilter}>
            <SelectTrigger><SelectValue placeholder="Todos los medicamentos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los medicamentos</SelectItem>
              {meds.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8 space-y-10">
        {loading && <p className="text-muted-foreground">Buscando…</p>}
        {!loading && filteredMeds.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">No encontramos resultados con estos filtros.</p>
          </Card>
        )}
        {!loading && grouped.map(([category, items]) => (
          <section key={category}>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="capitalize">{category}</span>
              <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((m) => {
                const lo = lowestByMed.get(m.id);
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
                      {lo ? (
                        <div className="mt-3 pt-3 border-t border-border/60 flex items-end justify-between">
                          <div>
                            <div className="text-xs text-muted-foreground">Mejor precio</div>
                            <div className="text-xs font-medium">{pharms[lo.pharmacy_id]}</div>
                          </div>
                          <div className="text-xl font-bold text-primary">{formatBs(Number(lo.price), lo.currency)}</div>
                        </div>
                      ) : (
                        <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">Sin precios disponibles</div>
                      )}
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
