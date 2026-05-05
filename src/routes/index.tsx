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
} from "lucide-react";
import {
  formatBs,
  getLatestPricesForMedications,
  lowestCurrent,
  priorPrice,
  searchMedications,
  type MedicationRow,
  type PriceRow,
} from "@/lib/medications";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  pharm: fallback(z.string(), "all").default("all"),
  med: fallback(z.string(), "all").default("all"),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  component: Index,
});

function Index() {
  const { q, pharm, med } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const isSearching = q.trim().length > 0 || pharm !== "all" || med !== "all";

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
      const m = await searchMedications(q, isSearching ? 80 : 8);
      setMeds(m);
      const p = await getLatestPricesForMedications(m.map((x) => x.id));
      setPrices(p);
      if (q.trim()) {
        await supabase.from("search_events").insert({ query: q.slice(0, 200) });
      }
      setLoading(false);
    })();
  }, [q, isSearching]);

  const updateSearch = (patch: Partial<{ q: string; pharm: string; med: string }>) => {
    navigate({ search: (prev: { q: string; pharm: string; med: string }) => ({ ...prev, ...patch }) });
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
    for (const [, p] of latestByMedPharm) {
      if (pharm !== "all" && p.pharmacy_id !== pharm) continue;
      const cur = out.get(p.medication_id);
      if (!cur || p.price < cur.price) out.set(p.medication_id, p);
    }
    return out;
  }, [latestByMedPharm, pharm]);

  const filteredMeds = useMemo(() => {
    let list = meds;
    if (med !== "all") list = list.filter((m) => m.id === med);
    if (pharm !== "all") list = list.filter((m) => lowestByMed.has(m.id));
    return list;
  }, [meds, med, pharm, lowestByMed]);

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

  const pharmacyOptions = Object.entries(pharmaciesMap).sort(([, a], [, b]) =>
    a.localeCompare(b),
  );

  // Featured for landing
  const featured = meds.slice(0, 8).map((m) => {
    const lo = lowestCurrent(prices, m.id);
    if (!lo) return { med: m, lo: null, drop: 0 };
    const prev = priorPrice(prices, m.id, lo.pharmacy_id, lo.scraped_at);
    const drop = prev && prev.price > lo.price ? ((prev.price - lo.price) / prev.price) * 100 : 0;
    return { med: m, lo, drop };
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute inset-0 -z-10 bg-background/40" />
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-card/80 backdrop-blur px-3 py-1 text-xs font-medium text-primary border border-primary/20">
              <TrendingDown className="h-3.5 w-3.5" /> Precios actualizados de farmacias en Venezuela
            </span>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold leading-tight text-foreground">
              Encuentra tu medicamento al{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                mejor precio
              </span>
            </h1>
            <p className="mt-4 text-lg text-foreground/80 max-w-2xl">
              Comparamos en tiempo real Farmatodo, Farmacias SAAS, Maraplus, Locatel y más.
              Recibe alertas cuando baje el precio del medicamento que necesitas.
            </p>
            <div className="mt-8 max-w-2xl">
              <SearchBar
                size="lg"
                initial={q}
                onSearch={(value) => updateSearch({ q: value })}
              />
            </div>
            {!isSearching && (
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-foreground/75">
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
          loading={loading}
          meds={meds}
          grouped={grouped}
          lowestByMed={lowestByMed}
          prices={prices}
          pharmaciesMap={pharmaciesMap}
          pharmacyOptions={pharmacyOptions}
          updateSearch={updateSearch}
        />
      ) : (
        <>
          {/* Featured */}
          <section className="container mx-auto px-4 py-16">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Medicamentos destacados</h2>
                <p className="text-muted-foreground mt-1">Los más buscados con su mejor precio actual.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map(({ med: m, lo, drop }) => (
                <Link key={m.id} to="/medicamento/$slug" params={{ slug: m.slug }}>
                  <Card className="p-5 h-full hover:shadow-[var(--shadow-elevated)] transition-all hover:-translate-y-0.5" style={{ background: "var(--gradient-card)" }}>
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
                    {lo && (
                      <div className="mt-3 pt-3 border-t border-border/60">
                        <div className="text-xs text-muted-foreground">{pharmaciesMap[lo.pharmacy_id]}</div>
                        <div className="text-xl font-bold text-primary">{formatBs(Number(lo.price), lo.currency)}</div>
                      </div>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Value props */}
          <section className="container mx-auto px-4 py-16">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: TrendingDown, title: "Compara en segundos", text: "Un buscador único para varias farmacias. Encuentra el precio más bajo al instante." },
                { icon: Bell, title: "Alertas inteligentes", text: "Recibe un email cuando baje el precio de los medicamentos que sigues." },
                { icon: MapPin, title: "Pensado para ti", text: "Mostramos resultados relevantes a tu región y guardamos tu historial." },
              ].map((f, i) => (
                <Card key={i} className="p-6">
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

function SearchResults(props: {
  q: string;
  pharm: string;
  med: string;
  loading: boolean;
  meds: MedicationRow[];
  grouped: [string, MedicationRow[]][];
  lowestByMed: Map<string, PriceRow>;
  prices: PriceRow[];
  pharmaciesMap: Record<string, string>;
  pharmacyOptions: [string, string][];
  updateSearch: (p: Partial<{ q: string; pharm: string; med: string }>) => void;
}) {
  const {
    q, pharm, med, loading, meds, grouped, lowestByMed, prices,
    pharmaciesMap, pharmacyOptions, updateSearch,
  } = props;

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
              {(q || pharm !== "all" || med !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateSearch({ q: "", pharm: "all", med: "all" })}
                >
                  <X className="h-4 w-4 mr-1" /> Limpiar
                </Button>
              )}
            </div>
          </div>
          {/* Active filter chips */}
          {(pharm !== "all" || med !== "all") && (
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
                            <div className="text-xl font-bold text-primary">
                              {formatBs(Number(lo.price), lo.currency)}
                            </div>
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
