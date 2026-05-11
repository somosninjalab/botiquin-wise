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
import { SlidersHorizontal } from "lucide-react";
import { PharmacyLogo } from "@/components/PharmacyLogo";
import { PriceAlertsFeed } from "@/components/PriceAlertsFeed";
import { MiOrdenSection } from "@/components/MiOrdenSection";
import { ShoppingCart } from "lucide-react";
import {
  priceToVes,
  displayPrice,
  getLatestPricesForMedications,
  lowestCurrent,
  priorPrice,
  searchMedications,
  suggestMedications,
  type SuggestionRow,
  type MedicationRow,
  type PriceRow,
} from "@/lib/medications";
import { supabase } from "@/integrations/supabase/client";
import { useBcvRate } from "@/hooks/useBcvRate";
import { HeroExplainer } from "@/components/HeroExplainer";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown } from "lucide-react";
import { Mail } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { sendSearchResultsEmail } from "@/lib/email/send-search-results.functions";
import { toast } from "sonner";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  pharm: fallback(z.string(), "all").default("all"),
  med: fallback(z.string(), "all").default("all"),
  cat: fallback(z.string(), "all").default("all"),
  ind: fallback(z.string(), "all").default("all"),
  brand: fallback(z.string(), "all").default("all"),
  ai: fallback(z.string(), "all").default("all"),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  component: Index,
});

function Index() {
  const { q, pharm, med, cat, ind, brand, ai } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const isSearching =
    q.trim().length > 0 ||
    pharm !== "all" ||
    med !== "all" ||
    cat !== "all" ||
    ind !== "all" ||
    brand !== "all" ||
    ai !== "all";
  const bcvRate = useBcvRate();

  const [meds, setMeds] = useState<MedicationRow[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [pharmaciesMap, setPharmaciesMap] = useState<Record<string, string>>({});
  const [pharmacySlugMap, setPharmacySlugMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [scrapingIds, setScrapingIds] = useState<Set<string>>(new Set());

  // Load pharmacies once
  useEffect(() => {
    (async () => {
      const { data: ph } = await supabase.from("pharmacies").select("id,name,slug");
      setPharmaciesMap(Object.fromEntries((ph ?? []).map((x: any) => [x.id, x.name])));
      setPharmacySlugMap(Object.fromEntries((ph ?? []).map((x: any) => [x.id, x.slug])));
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
        await supabase.from("search_events").insert({
          query: q.slice(0, 200),
          result_count: m.length,
        });
      }
      setLoading(false);

      // Scrape on-demand: si la búsqueda devolvió medicamentos sin precios,
      // disparamos el scrape (Farmatodo, SAAS, etc.) en segundo plano y
      // recargamos los precios cuando termine cada uno.
      if (q.trim() && m.length) {
        const withPrices = new Set(p.map((x) => x.medication_id));
        const missing = m.filter((x) => !withPrices.has(x.id)).slice(0, 3);
        if (missing.length) {
          setScrapingIds(new Set(missing.map((x) => x.id)));
          await Promise.all(
            missing.map(async (med) => {
              try {
                const res = await fetch(
                  `/api/public/hooks/scrape-prices?med=${encodeURIComponent(med.slug)}&limit=1`,
                  { method: "POST" },
                );
                if (!res.ok) return;
                const j = (await res.json()) as { inserted?: number };
                if ((j.inserted ?? 0) > 0) {
                  const fresh = await getLatestPricesForMedications(m.map((x) => x.id));
                  setPrices(fresh);
                }
              } catch { /* silencioso */ }
              finally {
                setScrapingIds((prev) => {
                  const next = new Set(prev);
                  next.delete(med.id);
                  return next;
                });
              }
            }),
          );
        }
      }
    })();
  }, [q, cat, ind, isSearching]);

  const updateSearch = (
    patch: Partial<{ q: string; pharm: string; med: string; cat: string; ind: string; brand: string; ai: string }>,
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
    if (ai !== "all") list = list.filter((m) => m.active_ingredient === ai);
    if (brand !== "all")
      list = list.filter((m) => (m.brand_names ?? []).some((b) => b === brand));
    if (pharm !== "all") list = list.filter((m) => lowestByMed.has(m.id));
    return list;
  }, [meds, med, cat, ind, ai, brand, pharm, lowestByMed]);

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
      {/* Hero pensado para mayores de 50: tipografía grande, mensaje claro y ejemplo visual */}
      {isSearching ? (
        <section className="sticky top-16 md:top-20 z-30 bg-background/95 backdrop-blur border-b border-border/60">
          <div className="container mx-auto px-4 py-3">
            <SearchBar size="md" initial={q} onSearch={(value) => updateSearch({ q: value })} />
          </div>
        </section>
      ) : (
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)", opacity: 0.22 }} />
        <div className="container mx-auto px-4 py-6 md:py-16">
          <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center max-w-6xl mx-auto">
            {/* Columna izquierda: mensaje grande y simple */}
            <div className="text-center md:text-left">
              <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base font-semibold text-primary border-2 border-primary/30 shadow-sm">
                <Bell className="h-4 w-4 md:h-5 md:w-5" /> ¡Alerta: Medicina!
              </span>
              <h1 className="mt-3 md:mt-5 text-3xl sm:text-4xl md:text-6xl font-extrabold leading-[1.1] text-foreground tracking-tight">
                Encuentra tu medicina al{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  precio más bajo
                </span>
              </h1>
              <p className="mt-3 md:mt-5 text-base md:text-2xl text-muted-foreground leading-relaxed">
                Compara precios en{" "}
                <strong className="text-foreground">Farmatodo, Locatel, SAAS, Farmago y GoPharma</strong>{" "}
                en segundos.
              </p>
              <div className="mt-5 md:mt-7">
                <SearchBar size="lg" initial={q} onSearch={(value) => updateSearch({ q: value })} />
                <p className="mt-2 text-xs md:text-sm text-muted-foreground">
                  Por ejemplo: <em>Atamel</em>, <em>Losartán</em>, <em>Glucophage</em>…
                </p>
              </div>
              {isSearching && (
                <a
                  href="#resultados"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary/10 border-2 border-primary/40 px-4 py-2.5 md:px-5 md:py-3 text-base md:text-xl font-bold text-primary animate-bounce"
                >
                  <ChevronDown className="h-5 w-5 md:h-6 md:w-6" />
                  Baja para ver los resultados
                </a>
              )}
              {!isSearching && (
                <div className="mt-4 md:mt-6 flex flex-wrap justify-center md:justify-start gap-x-4 md:gap-x-6 gap-y-2 text-sm md:text-base text-muted-foreground">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 md:h-5 md:w-5 text-primary" /> Gratis</span>
                  <span className="flex items-center gap-1.5"><Bell className="h-4 w-4 md:h-5 md:w-5 text-primary" /> Te avisamos</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" /> Sin cuenta</span>
                </div>
              )}
            </div>

            {/* Columna derecha: ejemplo visual de comparación */}
            <div className="relative hidden sm:block">
              <HeroExplainer />
              {/* Etiqueta decorativa */}
              <div className="hidden md:flex absolute -top-4 -right-4 items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-accent-foreground shadow-lg rotate-3">
                <TrendingDown className="h-4 w-4" /> Precio real
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {isSearching ? (
        <SearchResults
          q={q}
          pharm={pharm}
          med={med}
          cat={cat}
          ind={ind}
          brand={brand}
          ai={ai}
          loading={loading}
          meds={meds}
          grouped={grouped}
          lowestByMed={lowestByMed}
          latestByMedPharm={latestByMedPharm}
          prices={prices}
          pharmaciesMap={pharmaciesMap}
          pharmacySlugMap={pharmacySlugMap}
          pharmacyOptions={pharmacyOptions}
          updateSearch={updateSearch}
          bcvRate={bcvRate}
          scrapingIds={scrapingIds}
        />
      ) : (
        <>
          {/* Mi orden + lista de compras */}
          <section className="container mx-auto px-4 pt-8">
            <div className="flex items-end justify-between mb-4 gap-3 flex-wrap">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6 text-primary" /> Mi orden
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Arma tu lista y te decimos dónde comprarla más barata.
                </p>
              </div>
              <Link to="/mi-orden">
                <Button variant="outline" size="sm">Ver página completa</Button>
              </Link>
            </div>
            <MiOrdenSection />
          </section>

          {/* Alertas de precio recientes */}
          <PriceAlertsFeed />

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
                    <h3 className="mt-3 font-semibold leading-tight line-clamp-2">
                      {(m.brand_names ?? [])[0] || m.name}
                    </h3>
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
                              <div className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1.5">
                                en
                                <PharmacyLogo
                                  slug={pharmacySlugMap[lo.pharmacy_id] ?? ""}
                                  name={pharmaciesMap[lo.pharmacy_id]}
                                  size={16}
                                  className="rounded-full"
                                />
                                {pharmaciesMap[lo.pharmacy_id]}
                              </div>
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
  const [conditions, setConditions] = useState<{ ind: string; label: string; cat: string | null; count: number }[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("medications")
        .select("indication,indication_es,category")
        .not("indication", "is", null);
      const map = new Map<string, { ind: string; label: string; cat: string | null; count: number }>();
      for (const r of (data ?? []) as { indication: string | null; indication_es: string | null; category: string | null }[]) {
        if (!r.indication) continue;
        const key = r.indication;
        const cur = map.get(key);
        if (cur) cur.count++;
        else map.set(key, { ind: key, label: r.indication_es || r.indication, cat: r.category, count: 1 });
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
              {c.label}
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
                <span className="truncate font-medium group-hover:text-primary">
                  {(m.brand_names ?? [])[0] || m.name}
                </span>
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
  brand: string;
  ai: string;
  loading: boolean;
  meds: MedicationRow[];
  grouped: [string, MedicationRow[]][];
  lowestByMed: Map<string, PriceRow>;
  latestByMedPharm: Map<string, PriceRow>;
  prices: PriceRow[];
  pharmaciesMap: Record<string, string>;
  pharmacySlugMap: Record<string, string>;
  pharmacyOptions: [string, string][];
  updateSearch: (p: Partial<{ q: string; pharm: string; med: string; cat: string; ind: string; brand: string; ai: string }>) => void;
  bcvRate: number | null;
  scrapingIds: Set<string>;
}) {
  const {
    q, pharm, med, cat, ind, brand, ai, loading, meds, grouped, lowestByMed, prices,
    pharmaciesMap, pharmacySlugMap, pharmacyOptions, updateSearch, bcvRate, scrapingIds, latestByMedPharm,
  } = props;

  // Etiquetas únicas presentes en los resultados actuales
  const categories = useMemo(
    () => Array.from(new Set(meds.map((m) => m.category).filter(Boolean) as string[])).sort(),
    [meds],
  );
  // Mapa indication (EN) → label (ES si existe)
  const indicationLabels = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of meds) {
      if (!x.indication) continue;
      if (!m.has(x.indication)) m.set(x.indication, x.indication_es || x.indication);
    }
    return m;
  }, [meds]);
  const indications = useMemo(
    () => Array.from(indicationLabels.keys()).sort((a, b) => (indicationLabels.get(a)!).localeCompare(indicationLabels.get(b)!)),
    [indicationLabels],
  );
  // Listas únicas de nombre comercial y compuesto activo presentes en resultados
  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of meds) for (const b of m.brand_names ?? []) if (b) set.add(b);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [meds]);
  const aiOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of meds) if (m.active_ingredient) set.add(m.active_ingredient);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [meds]);

  const totalResults = grouped.reduce((acc, [, arr]) => acc + arr.length, 0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount =
    (pharm !== "all" ? 1 : 0) +
    (med !== "all" ? 1 : 0) +
    (cat !== "all" ? 1 : 0) +
    (ind !== "all" ? 1 : 0) +
    (brand !== "all" ? 1 : 0) +
    (ai !== "all" ? 1 : 0);

  return (
    <section id="resultados" className="container mx-auto px-4 pt-3 md:pt-4 pb-16 scroll-mt-20">
      <RegisterAlertCTA />
      {/* Sticky filter bar */}
      <div className="mb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <Card className="p-3 md:p-4 bg-card/95 border-border/80">
          <div className="flex items-center gap-2">
            <ArrowDownAZ className="h-4 w-4 text-primary shrink-0" />
            <h2 className="font-semibold truncate text-sm md:text-base">
              {loading ? "Buscando…" : `${totalResults} resultado${totalResults === 1 ? "" : "s"}`}
              {q && <span className="text-muted-foreground font-normal"> para "{q}"</span>}
            </h2>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen((v) => !v)}
              className="h-8 gap-1.5"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{activeFilterCount}</Badge>
              )}
            </Button>
          </div>
          {/* Active filter chips siempre visibles */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {pharm !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  <PharmacyLogo
                    slug={pharmacySlugMap[pharm] ?? ""}
                    name={pharmaciesMap[pharm]}
                    size={14}
                    className="rounded-full"
                  />
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
                <Badge variant="secondary" className="gap-1">{indicationLabels.get(ind) ?? ind}
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
              {brand !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {brand}
                  <button onClick={() => updateSearch({ brand: "all" })} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {ai !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  <Pill className="h-3 w-3" />
                  {ai}
                  <button onClick={() => updateSearch({ ai: "all" })} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
          {filtersOpen && (
          <div className="mt-3 pt-3 border-t border-border/60 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Store className="h-4 w-4 text-muted-foreground" />
                <Select value={pharm} onValueChange={(v) => updateSearch({ pharm: v })}>
                  <SelectTrigger className="h-10 w-full lg:w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las farmacias</SelectItem>
                    {pharmacyOptions.map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        <span className="inline-flex items-center gap-2">
                          <PharmacyLogo
                            slug={pharmacySlugMap[id] ?? ""}
                            name={name}
                            size={16}
                            className="rounded-full"
                          />
                          {name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Select value={med} onValueChange={(v) => updateSearch({ med: v })}>
                  <SelectTrigger className="h-10 w-full lg:w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los medicamentos</SelectItem>
                    {meds.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {brandOptions.length > 0 && (
                <div className="flex items-center gap-2 min-w-0">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <Select value={brand} onValueChange={(v) => updateSearch({ brand: v })}>
                    <SelectTrigger className="h-10 w-full lg:w-[200px]">
                      <SelectValue placeholder="Nombre comercial" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los nombres comerciales</SelectItem>
                      {brandOptions.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {aiOptions.length > 0 && (
                <div className="flex items-center gap-2 min-w-0">
                  <Pill className="h-4 w-4 text-muted-foreground" />
                  <Select value={ai} onValueChange={(v) => updateSearch({ ai: v })}>
                    <SelectTrigger className="h-10 w-full lg:w-[200px]">
                      <SelectValue placeholder="Compuesto activo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los compuestos</SelectItem>
                      {aiOptions.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {(q || activeFilterCount > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateSearch({ q: "", pharm: "all", med: "all", cat: "all", ind: "all", brand: "all", ai: "all" })}
                className="justify-self-start self-start"
              >
                <X className="h-4 w-4 mr-1" /> Limpiar todo
              </Button>
            )}
          {/* Clasificadores: categoría e indicación */}
          {(categories.length > 0 || indications.length > 0) && (
            <div className="space-y-2">
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
                        {indicationLabels.get(i) ?? i}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
        <NoResults query={q} updateSearch={updateSearch} />
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
                          {m.image_url ? (
                            <img
                              src={m.image_url}
                              alt={m.name}
                              loading="lazy"
                              className="h-14 w-14 rounded-lg object-contain bg-white border border-border"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                              <Pill className="h-5 w-5" />
                            </div>
                          )}
                          {drop > 1 && (
                            <span className="text-xs font-bold rounded-full bg-accent/15 text-accent px-2 py-0.5">
                              ↓ {drop.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <h3 className="mt-3 font-semibold">
                          {(m.brand_names ?? [])[0] || m.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {m.active_ingredient}{m.presentation ? ` · ${m.presentation}` : ""}
                        </p>
                        {(m.indication_es || m.indication) && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.indication_es || m.indication}</p>
                        )}
                        {lo ? (
                          <div className="mt-3 pt-3 border-t border-border/60 flex items-end justify-between">
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">Mejor precio</div>
                              <div className="text-xs font-medium inline-flex items-center gap-1.5 min-w-0">
                                <PharmacyLogo
                                  slug={pharmacySlugMap[lo.pharmacy_id] ?? ""}
                                  name={pharmaciesMap[lo.pharmacy_id]}
                                  size={18}
                                  className="rounded-full shrink-0"
                                />
                                <span className="truncate">{pharmaciesMap[lo.pharmacy_id]}</span>
                              </div>
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
                            {scrapingIds.has(m.id) ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                Buscando precios en farmacias…
                              </span>
                            ) : (
                              "Sin precios disponibles"
                            )}
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

function RegisterAlertCTA() {
  const { user } = useAuth();
  if (user) return null;
  return (
    <Link
      to="/auth"
      className="block mb-6 rounded-2xl border-2 border-accent/40 bg-gradient-to-r from-accent/15 via-primary/10 to-accent/15 p-5 md:p-6 hover:shadow-[var(--shadow-elevated)] transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md">
          <Bell className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg md:text-xl font-bold leading-tight">
            Regístrate y te avisamos cuando baje el precio
          </h3>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Recibe alertas gratis por email cuando cambien los precios de tus medicinas.
          </p>
        </div>
        <Button className="hidden sm:inline-flex bg-gradient-to-r from-primary to-primary-glow text-primary-foreground h-11 px-5 text-base font-semibold">
          Registrarme
        </Button>
      </div>
    </Link>
  );
}

function NoResults({
  query,
  updateSearch,
}: {
  query: string;
  updateSearch: (p: Partial<{ q: string; pharm: string; med: string; cat: string; ind: string }>) => void;
}) {
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setSuggestions([]);
    if (!query.trim()) return;
    setLoading(true);
    (async () => {
      const s = await suggestMedications(query, 6);
      if (!cancelled) {
        setSuggestions(s);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [query]);

  return (
    <Card className="p-8 md:p-10 text-center">
      <Pill className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-semibold text-lg">Sin resultados para "{query}"</h3>
      <p className="text-muted-foreground mt-1">
        Intenta con el principio activo (ej. <em>paracetamol</em>) o una marca conocida.
      </p>
      {loading && (
        <div className="mt-5 flex justify-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32 rounded-full" />
          ))}
        </div>
      )}
      {!loading && suggestions.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-foreground mb-3">¿Quisiste decir…?</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => updateSearch({ q: s.active_ingredient })}
                className="inline-flex items-center gap-2 rounded-full border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 px-4 py-2 text-sm font-medium text-foreground transition-colors"
              >
                <Pill className="h-4 w-4 text-primary" />
                <span className="font-semibold">{s.active_ingredient}</span>
                {s.name !== s.active_ingredient && (
                  <span className="text-xs text-muted-foreground">{s.name}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      {!loading && suggestions.length === 0 && query.trim().length >= 3 && (
        <p className="text-xs text-muted-foreground mt-5">
          Hemos registrado tu búsqueda. Iremos agregando los medicamentos más solicitados.
        </p>
      )}
    </Card>
  );
}
