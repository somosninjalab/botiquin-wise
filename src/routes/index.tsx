import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { Card } from "@/components/ui/card";
import { Pill, TrendingDown, Bell, MapPin, ShieldCheck, Clock } from "lucide-react";
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

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [meds, setMeds] = useState<MedicationRow[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [pharmaciesMap, setPharmaciesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const m = await searchMedications("", 8);
      setMeds(m);
      const p = await getLatestPricesForMedications(m.map((x) => x.id));
      setPrices(p);
      const { data: ph } = await supabase.from("pharmacies").select("id,name");
      setPharmaciesMap(Object.fromEntries((ph ?? []).map((x: any) => [x.id, x.name])));
    })();
  }, []);

  const featured = meds.map((m) => {
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
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-card/80 backdrop-blur px-3 py-1 text-xs font-medium text-primary border border-primary/20">
              <TrendingDown className="h-3.5 w-3.5" /> Precios actualizados de 4 farmacias
            </span>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold leading-tight text-foreground">
              Encuentra tu medicamento al{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                mejor precio
              </span>
            </h1>
            <p className="mt-4 text-lg text-foreground/80 max-w-2xl">
              Comparamos en tiempo real Farmatodo, Farmacias SAAS, Maraplus y Locatel.
              Recibe alertas por email cuando baje el precio del medicamento que necesitas.
            </p>
            <div className="mt-8 max-w-2xl">
              <SearchBar size="lg" />
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-foreground/75">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> 100% gratuito</span>
              <span className="flex items-center gap-1.5"><Bell className="h-4 w-4 text-primary" /> Alertas por email</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> Historial de precios</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Medicamentos destacados</h2>
            <p className="text-muted-foreground mt-1">Los más buscados con su mejor precio actual.</p>
          </div>
          <Link to="/buscar" search={{ q: "" }} className="text-sm font-medium text-primary hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featured.map(({ med, lo, drop }) => (
            <Link key={med.id} to="/medicamento/$slug" params={{ slug: med.slug }}>
              <Card className="p-5 h-full hover:shadow-[var(--shadow-elevated)] transition-all hover:-translate-y-0.5" style={{ background: "var(--gradient-card)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary"><Pill className="h-5 w-5" /></div>
                  {drop > 1 && (
                    <span className="text-xs font-bold rounded-full bg-accent/15 text-accent px-2 py-0.5">
                      ↓ {drop.toFixed(0)}%
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-semibold leading-tight line-clamp-2">{med.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{med.active_ingredient}</p>
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
            { icon: TrendingDown, title: "Compara en segundos", text: "Un buscador único para 4 farmacias. Encuentra el precio más bajo al instante." },
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
    </div>
  );
}
