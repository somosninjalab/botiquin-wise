import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { SearchBar } from "@/components/SearchBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pill,
  TrendingDown,
  Bell,
  MapPin,
  ShieldCheck,
  Clock,
  X,
  Store,
  Tag,
  ArrowDownAZ,
  Stethoscope,
} from "lucide-react";
import {
  priceToVes,
  displayPrice,
  getLatestPricesForMedications,
  lowestCurrent,
  priorPrice,
  searchMedications,
  type MedicationRow,
  type PriceRow,
} from "@/lib/medications";
import { supabase } from "@/integrations/supabase/client";
import { useBcvRate } from "@/hooks/useBcvRate";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  pharm: fallback(z.string(), "all").default("all"),
  med: fallback(z.string(), "all").default("all"),
  cat: fallback(z.string(), "all").default("all"),
  ind: fallback(z.string(), "all").default("all"),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  component: Index,
});

function Index() {
  const { q, pharm, med, cat, ind } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const isSearching =
    q.trim().length > 0 || pharm !== "all" || med !== "all" || cat !== "all" || ind !== "all";
  const bcvRate = useBcvRate();

  const [meds, setMeds] = useState<MedicationRow[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [pharmaciesMap, setPharmaciesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Load pharmacies once
  useEffect(() => {
    (async () => {
      const { data: ph } = await supabase.from("pharmacies").select("id,name");
      setPharmaciesMap(Object.fromEntries((ph ?? []).map((x: any) => [x.id, x.name])));
    })();
  }, []);

  // Featured (no search) or search results
  useEffect(() => {
    setLoading(true);
    (async () => {
      let m: MedicationRow[];
      if (q.trim()) {
        m = await searchMedications(q, 80);
      } else if (cat !== "all" || ind !== "all") {
        let qb = supabase.from("medications").select("*").order("name").limit(80);
        if (cat !== "all") qb = qb.eq("category", cat);
        if (ind !== "all") qb = qb.eq("indication", ind);
        const { data } = await qb;
        m = (data ?? []) as MedicationRow[];
      } else {
        m = await searchMedications("", isSearching ? 80 : 8);
      }
      setMeds(m);
      const p = await getLatestPricesForMedications(m.map((x) => x.id));
      setPrices(p);
      if (q.trim()) {
        await supabase.from("search_events").insert({ query: q.slice(0, 200) });
      }
      setLoading(false);
    })();
  }, [q, cat, ind, isSearching]);

  const updateSearch = (
    patch: Partial<{ q: string; pharm: string; med: string; cat: string; ind: string }>,
  ) => {
    navigate({ search: (prev: any) => ({ ...prev, ...patch }) });
  };

  // Latest price per (medication, pharmacy)
  const latestByMedPharm = useMemo(() => {
    const map = new Map<string, PriceRow>();
    for (const p of prices) {
      const key = `${p.medication_id}|${p.pharmacy_id}`;
      if (!map.has(key)) map.set(key, p);
    }
    return map;
  }, [prices]);

  // Lowest current price per medication respecting pharmacy filter
  const lowestByMed = useMemo(() => {
    const out = new Map<string, PriceRow>();
    const vesPrice = (p: PriceRow) => priceToVes(Number(p.price), p.currency, bcvRate) ?? Number.POSITIVE_INFINITY;
    for (const [, p] of latestByMedPharm) {
      if (pharm !== "all" && p.pharmacy_id !== pharm) continue;
      const cur = out.get(p.medication_id);
      if (!cur || vesPrice(p) < vesPrice(cur)) out.set(p.medication_id, p);
    }
    return out;
  }, [latestByMedPharm, pharm, bcvRate]);

  const filteredMeds = useMemo(() => {
    let list = meds;
    if (med !== "all") list = list.filter((m) => m.id === med);
    if (cat !== "all") list = list.filter((m) => m.category === cat);
    if (ind !== "all") list = list.filter((m) => m.indication === ind);
    if (pharm !== "all") list = list.filter((m) => lowestByMed.has(m.id));
    return list;
  }, [meds, med, cat, ind, pharm, lowestByMed]);

  const grouped = useMemo(() => {
    const groups = new Map<string, MedicationRow[]>();
    for (const m of filteredMeds) {
      const cat = m.category || "Otros";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(m);
    }
    const vesOf = (p?: PriceRow | null) =>
      p ? (priceToVes(Number(p.price), p.currency, bcvRate) ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
    for (const [, arr] of groups) {
      arr.sort((a, b) => {
        const pa = vesOf(lowestByMed.get(a.id));
        const pb = vesOf(lowestByMed.get(b.id));
        return pa - pb;
      });
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredMeds, lowestByMed, bcvRate]);

  const pharmacyOptions = Object.entries(pharmaciesMap).sort(([, a], [, b]) =>
    a.localeCompare(b),
  );

  // Featured for landing
  const featured = meds.slice(0, 8).map((m) => {
    const lo = lowestCurrent(prices, m.id, bcvRate);
    if (!lo) return { med: m, lo: null, drop: 0 };
    const prev = priorPrice(prices, m.id, lo.pharmacy_id, lo.scraped_at);
    const drop = prev && prev.price > lo.price ? ((prev.price - lo.price) / prev.price) * 100 : 0;
    return { med: m, lo, drop };
  });

  return (
    <div>
      {/* Hero estilo GoodRx: claro, centrado, búsqueda dominante */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)", opacity: 0.18 }} />
        <div className="container mx-auto px-4 py-14 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium text-primary border border-primary/20">
              <TrendingDown className="h-3.5 w-3.5" /> Precios reales de farmacias en Venezuela
            </span>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold leading-tight text-foreground">
              Compara precios y{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ahorra hasta 60%
              </span>{" "}
              en tus medicinas
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Busca cualquier medicamento y mira al instante cuánto cuesta en Farmatodo,
              Locatel, SAAS, Farmago y más. Recibe alertas cuando baje el precio.
            </p>
            <div className="mt-8">
              <SearchBar size="lg" initial={q} onSearch={(value) => updateSearch({ q: value })} />
            </div>
            {!isSearching && (
              <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> 100% gratuito</span>
                <span className="flex items-center gap-1.5"><Bell className="h-4 w-4 text-primary" /> Alertas por email</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> Historial de precios</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {isSearching ? (
        <SearchResults
          q={q}
          pharm={pharm}
          med={med}
          cat={cat}
          ind={ind}
          loading={loading}
          meds={meds}
          grouped={grouped}
          lowestByMed={lowestByMed}
          prices={prices}
          pharmaciesMap={pharmaciesMap}
          pharmacyOptions={pharmacyOptions}
          updateSearch={updateSearch}
          bcvRate={bcvRate}
        />
      ) : (
        <>
          {/* Destacados con mejor precio */}
          <section className="container mx-auto px-4 py-12 md:py-14">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Medicamentos destacados</h2>
                <p className="text-muted-foreground mt-1">Los más buscados con su mejor precio actual.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map(({ med: m, lo, drop }) => (
                <Link key={m.id} to="/medicamento/$slug" params={{ slug: m.slug }}>
                  <Card className="p-5 h-full hover:shadow-[var(--shadow-elevated)] hover:border-primary/40 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary"><Pill className="h-5 w-5" /></div>
                      {drop > 1 && (
                        <span className="text-xs font-bold rounded-full bg-accent/15 text-accent px-2 py-0.5">
                          ↓ {drop.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-semibold leading-tight line-clamp-2">{m.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{m.active_ingredient}</p>
                    {lo ? (
                      <div className="mt-3 pt-3 border-t border-border/60">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Desde</div>
                        {(() => {
                          const d = displayPrice(Number(lo.price), lo.currency, bcvRate);
                          return (
                            <>
                              <div className="text-xl font-bold text-primary">{d.primary}</div>
                              {d.secondary && <div className="text-[10px] text-muted-foreground">≈ {d.secondary}</div>}
                              <div className="text-xs text-muted-foreground mt-1">en {pharmaciesMap[lo.pharmacy_id]}</div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                        Próximamente con precios
                      </div>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Lista popular tipo "drug list" GoodRx */}
          <section className="bg-muted/40 border-y border-border/60">
            <div className="container mx-auto px-4 py-12 md:py-14">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">Medicamentos populares</h2>
                  <p className="text-muted-foreground mt-1">Explora nuestro catálogo y compara precios.</p>
                </div>
              </div>
              <PopularList />
            </div>
          </section>

          {/* Browse por condición / categoría — patrón GoodRx */}
          <BrowseByCondition onPick={(patch) => updateSearch(patch)} />

          {/* Cómo funciona */}
          <section className="container mx-auto px-4 py-14 md:py-16">
            <h2 className="text-2xl md:text-3xl font-bold text-center">Cómo funciona</h2>
            <p className="text-muted-foreground mt-2 text-center max-w-xl mx-auto">
              Tres pasos simples para pagar menos por tus medicinas.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-10">
              {[
                { icon: TrendingDown, title: "1. Busca tu medicamento", text: "Por nombre comercial, principio activo o síntoma." },
                { icon: Pill, title: "2. Compara farmacias", text: "Vemos Farmatodo, Locatel, SAAS, Maraplus y más, en bolívares y dólares." },
                { icon: Bell, title: "3. Recibe alertas", text: "Te avisamos por email cuando baje el precio." },
              ].map((f, i) => (
                <Card key={i} className="p-6 text-center">
                  <div className="rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 inline-flex p-3">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{f.text}</p>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function BrowseByCondition({
  onPick,
}: {
  onPick: (patch: Partial<{ q: string; pharm: string; med: string; cat: string; ind: string }>) => void;
}) {
  const [conditions, setConditions] = useState<{ ind: string; cat: string | null; count: number }[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("medications")
        .select("indication,category")
        .not("indication", "is", null);
      const map = new Map<string, { ind: string; cat: string | null; count: number }>();
      for (const r of (data ?? []) as { indication: string | null; category: string | null }[]) {
        if (!r.indication) continue;
        const key = r.indication;
        const cur = map.get(key);
        if (cur) cur.count++;
        else map.set(key, { ind: key, cat: r.category, count: 1 });
      }
      setConditions(Array.from(map.values()).sort((a, b) => b.count - a.count));
    })();
  }, []);
  if (!conditions.length) return null;
  return (
    <section className="container mx-auto px-4 py-12 md:py-14">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Explora por condición
          </h2>
          <p className="text-muted-foreground mt-1">
            Encuentra tratamientos para lo que necesitas resolver.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {conditions.map((c) => (
          <button
            key={c.ind}
            onClick={() => onPick({ ind: c.ind, cat: "all", q: "", pharm: "all", med: "all" })}
            className="group text-left rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-[var(--shadow-soft)] transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="rounded-lg bg-accent/10 p-2 text-accent">
                <Stethoscope className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {c.count} med{c.count === 1 ? "" : "s"}
              </span>
            </div>
            <h3 className="mt-3 font-semibold leading-tight group-hover:text-primary line-clamp-2">
              {c.ind}
            </h3>
            {c.cat && <p className="text-xs text-muted-foreground mt-1">{c.cat}</p>}
          </button>
        ))}
      </div>
    </section>
  );
}

function PopularList() {
  const [items, setItems] = useState<MedicationRow[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("medications")
        .select("*")
        .order("name")
        .limit(60);
      setItems((data ?? []) as MedicationRow[]);
    })();
  }, []);
  // Group by leading letter, A–Z chip nav.
  const groups = useMemo(() => {
    const m = new Map<string, MedicationRow[]>();
    for (const it of items) {
      const k = (it.name[0] ?? "#").toUpperCase();
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);
  if (!items.length) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {groups.map(([letter, arr]) => (
        <div key={letter}>
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
              {letter}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {arr.map((m) => (
              <Link
                key={m.id}
                to="/medicamento/$slug"
                params={{ slug: m.slug }}
                className="group flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <span className="truncate font-medium group-hover:text-primary">{m.name}</span>
                <span className="text-xs text-muted-foreground truncate ml-2">{m.active_ingredient}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchResults(props: {
  q: string;
  pharm: string;
  med: string;
  cat: string;
  ind: string;
  loading: boolean;
  meds: MedicationRow[];
  grouped: [string, MedicationRow[]][];
  lowestByMed: Map<string, PriceRow>;
  prices: PriceRow[];
  pharmaciesMap: Record<string, string>;
  pharmacyOptions: [string, string][];
  updateSearch: (p: Partial<{ q: string; pharm: string; med: string; cat: string; ind: string }>) => void;
  bcvRate: number | null;
}) {
  const {
    q, pharm, med, cat, ind, loading, meds, grouped, lowestByMed, prices,
    pharmaciesMap, pharmacyOptions, updateSearch, bcvRate,
  } = props;

  // Etiquetas únicas presentes en los resultados actuales
  const categories = useMemo(
    () => Array.from(new Set(meds.map((m) => m.category).filter(Boolean) as string[])).sort(),
    [meds],
  );
  const indications = useMemo(
    () => Array.from(new Set(meds.map((m) => m.indication).filter(Boolean) as string[])).sort(),
    [meds],
  );

  const totalResults = grouped.reduce((acc, [, arr]) => acc + arr.length, 0);

  return (
    <section className="container mx-auto px-4 pt-8 pb-16">
      {/* Sticky filter bar */}
      <div className="sticky top-2 z-20 mb-6">
        <Card className="p-4 backdrop-blur bg-card/95 border-border/80 shadow-[var(--shadow-elevated)]">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="flex items-center gap-2 min-w-0">
              <ArrowDownAZ className="h-4 w-4 text-primary shrink-0" />
              <h2 className="font-semibold truncate">
                {loading ? "Buscando…" : `${totalResults} resultado${totalResults === 1 ? "" : "s"}`}
                {q && <span className="text-muted-foreground font-normal"> para "{q}"</span>}
              </h2>
            </div>
            <div className="flex-1" />
            {bcvRate && (
              <span className="text-xs text-muted-foreground hidden md:inline">
                Tasa BCV: Bs {bcvRate.toFixed(2)} / USD
              </span>
            )}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <Select value={pharm} onValueChange={(v) => updateSearch({ pharm: v })}>
                  <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las farmacias</SelectItem>
                    {pharmacyOptions.map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Select value={med} onValueChange={(v) => updateSearch({ med: v })}>
                  <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los medicamentos</SelectItem>
                    {meds.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(q || pharm !== "all" || med !== "all" || cat !== "all" || ind !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateSearch({ q: "", pharm: "all", med: "all", cat: "all", ind: "all" })}
                >
                  <X className="h-4 w-4 mr-1" /> Limpiar
                </Button>
              )}
            </div>
          </div>
          {/* Clasificadores: categoría e indicación */}
          {(categories.length > 0 || indications.length > 0) && (
            <div className="mt-3 space-y-2">
              {categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">Categoría</span>
                  {categories.map((c) => {
                    const active = cat === c;
                    return (
                      <button
                        key={c}
                        onClick={() => updateSearch({ cat: active ? "all" : c })}
                        className={`text-xs rounded-full px-2.5 py-1 border transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-secondary-foreground border-transparent hover:border-primary/40"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              )}
              {indications.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">Indicación</span>
                  {indications.map((i) => {
                    const active = ind === i;
                    return (
                      <button
                        key={i}
                        onClick={() => updateSearch({ ind: active ? "all" : i })}
                        className={`text-xs rounded-full px-2.5 py-1 border transition-colors ${
                          active
                            ? "bg-accent text-accent-foreground border-accent"
                            : "bg-secondary text-secondary-foreground border-transparent hover:border-accent/40"
                        }`}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {/* Active filter chips */}
          {(pharm !== "all" || med !== "all" || cat !== "all" || ind !== "all") && (
            <div className="flex flex-wrap gap-2 mt-3">
              {pharm !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  <Store className="h-3 w-3" />
                  {pharmaciesMap[pharm] ?? "Farmacia"}
                  <button onClick={() => updateSearch({ pharm: "all" })} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {cat !== "all" && (
                <Badge variant="secondary" className="gap-1">{cat}
                  <button onClick={() => updateSearch({ cat: "all" })} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {ind !== "all" && (
                <Badge variant="secondary" className="gap-1">{ind}
                  <button onClick={() => updateSearch({ ind: "all" })} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {med !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {meds.find((m) => m.id === med)?.name ?? "Medicamento"}
                  <button onClick={() => updateSearch({ med: "all" })} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : totalResults === 0 ? (
        <Card className="p-10 text-center">
          <Pill className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg">Sin resultados</h3>
          <p className="text-muted-foreground mt-1">
            Intenta con el principio activo o ajusta los filtros.
          </p>
        </Card>
      ) : (
        <div className="space-y-10">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold capitalize">{category}</h3>
                <Badge variant="outline">{items.length}</Badge>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((m, idx) => {
                  const lo = lowestByMed.get(m.id);
                  const prev = lo ? priorPrice(prices, m.id, lo.pharmacy_id, lo.scraped_at) : null;
                  const drop = prev && lo && prev.price > lo.price ? ((prev.price - lo.price) / prev.price) * 100 : 0;
                  const isCheapest = idx === 0 && lo;
                  return (
                    <Link key={m.id} to="/medicamento/$slug" params={{ slug: m.slug }}>
                      <Card
                        className="p-5 h-full hover:shadow-[var(--shadow-elevated)] transition-all hover:-translate-y-0.5 relative"
                        style={{ background: "var(--gradient-card)" }}
                      >
                        {isCheapest && (
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-accent text-primary-foreground text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shadow-md">
                            Más barato
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Pill className="h-5 w-5" />
                          </div>
                          {drop > 1 && (
                            <span className="text-xs font-bold rounded-full bg-accent/15 text-accent px-2 py-0.5">
                              ↓ {drop.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <h3 className="mt-3 font-semibold">{m.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {m.active_ingredient}{m.presentation ? ` · ${m.presentation}` : ""}
                        </p>
                        {m.indication && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.indication}</p>
                        )}
                        {lo ? (
                          <div className="mt-3 pt-3 border-t border-border/60 flex items-end justify-between">
                            <div>
                              <div className="text-xs text-muted-foreground">Mejor precio</div>
                              <div className="text-xs font-medium">{pharmaciesMap[lo.pharmacy_id]}</div>
                            </div>
                            {(() => {
                              const d = displayPrice(Number(lo.price), lo.currency, bcvRate);
                              return (
                                <div className="text-right">
                                  <div className="text-xl font-bold text-primary">{d.primary}</div>
                                  {d.secondary && (
                                    <div className="text-[10px] text-muted-foreground">≈ {d.secondary}</div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                            Sin precios disponibles
                          </div>
                        )}
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
