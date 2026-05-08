import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PharmacyLogo } from "@/components/PharmacyLogo";

export const Route = createFileRoute("/admin/precios")({ component: PreciosPage });

const WINDOW_DAYS = 20;

// Brand color per slug — keeps the line chart consistent with PharmacyLogo.
const PHARM_COLOR: Record<string, string> = {
  farmatodo: "#E30613",
  locatel: "#0066B3",
  saas: "#1E9E3E",
  actual: "#F39200",
  farmago: "#00A99D",
  maraplus: "#7C3AED",
  cinecitta: "#0F172A",
  gopharma: "#0EA5E9",
};

type Pharm = { id: string; slug: string; name: string };
type Med = { id: string; name: string; active_ingredient: string };
type PriceRow = {
  medication_id: string;
  pharmacy_id: string;
  price: number;
  currency: string;
  scraped_at: string;
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function PreciosPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [pharms, setPharms] = useState<Pharm[]>([]);
  const [meds, setMeds] = useState<Med[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate({ to: "/" });
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoadingData(true);
      const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString();
      const [{ data: ph }, { data: md }, { data: pr }] = await Promise.all([
        supabase.from("pharmacies").select("id, slug, name"),
        supabase.from("medications").select("id, name, active_ingredient"),
        supabase
          .from("medication_prices")
          .select("medication_id, pharmacy_id, price, currency, scraped_at")
          .gte("scraped_at", since)
          .order("scraped_at", { ascending: true })
          .limit(10000),
      ]);
      setPharms((ph ?? []) as Pharm[]);
      setMeds((md ?? []) as Med[]);
      // Solo VES para evitar mezclar monedas.
      setPrices(((pr ?? []) as PriceRow[]).filter((r) => r.currency === "VES" && r.price > 0));
      setLoadingData(false);
    })();
  }, [isAdmin]);

  // ============ Aggregations ============

  // Day list (last N days, ascending).
  const days = useMemo(() => {
    const out: string[] = [];
    const today = new Date();
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400_000);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }, []);

  const pharmById = useMemo(() => new Map(pharms.map((p) => [p.id, p])), [pharms]);
  const medById = useMemo(() => new Map(meds.map((m) => [m.id, m])), [meds]);

  // For each pharmacy + day -> average of latest price per medication that day.
  // We use a price index (base 100 = first day with data) so pharmacies are comparable.
  const indexSeries = useMemo(() => {
    // pharmacy_id -> medication_id -> day -> price
    const map = new Map<string, Map<string, Map<string, number>>>();
    for (const r of prices) {
      const d = dayKey(r.scraped_at);
      if (!map.has(r.pharmacy_id)) map.set(r.pharmacy_id, new Map());
      const ph = map.get(r.pharmacy_id)!;
      if (!ph.has(r.medication_id)) ph.set(r.medication_id, new Map());
      ph.get(r.medication_id)!.set(d, r.price); // last write wins (rows are ascending)
    }
    // Build per-day index per pharmacy: avg over meds of (price_d / first_observed_price * 100).
    const series: Record<string, Record<string, number | null>> = {};
    for (const [pharmId, perMed] of map) {
      const slug = pharmById.get(pharmId)?.slug ?? pharmId;
      series[slug] = {};
      // Forward-fill each med so days with no scrape carry the last known price.
      const filled = new Map<string, Map<string, number>>();
      for (const [medId, perDay] of perMed) {
        const f = new Map<string, number>();
        let last: number | null = null;
        for (const d of days) {
          if (perDay.has(d)) last = perDay.get(d)!;
          if (last != null) f.set(d, last);
        }
        if (f.size > 0) filled.set(medId, f);
      }
      // Determine each med's base price (first available day in window).
      const baseByMed = new Map<string, number>();
      for (const [medId, f] of filled) {
        for (const d of days) {
          if (f.has(d)) {
            baseByMed.set(medId, f.get(d)!);
            break;
          }
        }
      }
      for (const d of days) {
        const idxs: number[] = [];
        for (const [medId, f] of filled) {
          const base = baseByMed.get(medId);
          const p = f.get(d);
          if (base && p) idxs.push((p / base) * 100);
        }
        series[slug][d] = idxs.length ? idxs.reduce((a, b) => a + b, 0) / idxs.length : null;
      }
    }
    return series;
  }, [prices, pharmById, days]);

  // Chart data: one row per day with one column per pharmacy slug.
  const chartData = useMemo(() => {
    return days.map((d) => {
      const row: Record<string, string | number | null> = { day: d.slice(5) };
      for (const slug of Object.keys(indexSeries)) row[slug] = indexSeries[slug][d];
      return row;
    });
  }, [days, indexSeries]);

  // Per-pharmacy summary cards: % change first→last, # meds tracked, # subiendo/bajando.
  const summary = useMemo(() => {
    return pharms
      .map((p) => {
        const series = indexSeries[p.slug];
        if (!series) return null;
        const vals = days.map((d) => series[d]).filter((v): v is number => typeof v === "number");
        if (vals.length < 2) return { pharm: p, change: null, first: null, last: null, meds: 0 };
        const first = vals[0];
        const last = vals[vals.length - 1];
        const change = ((last - first) / first) * 100;
        // # meds with change up/down vs first observation.
        let up = 0, down = 0, eq = 0;
        const perMed = new Map<string, { first: number; last: number }>();
        for (const r of prices.filter((x) => x.pharmacy_id === p.id)) {
          const m = perMed.get(r.medication_id) ?? { first: r.price, last: r.price };
          if (!perMed.has(r.medication_id)) m.first = r.price;
          m.last = r.price;
          perMed.set(r.medication_id, m);
        }
        for (const m of perMed.values()) {
          if (m.last > m.first * 1.005) up++;
          else if (m.last < m.first * 0.995) down++;
          else eq++;
        }
        return { pharm: p, change, first, last, meds: perMed.size, up, down, eq };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [pharms, indexSeries, days, prices]);

  // Top movers (medicamento + farmacia) — mayor cambio % en ventana.
  const topMovers = useMemo(() => {
    const perPair = new Map<string, { first: number; last: number; med_id: string; pharm_id: string }>();
    for (const r of prices) {
      const k = `${r.pharmacy_id}|${r.medication_id}`;
      const cur = perPair.get(k);
      if (!cur) {
        perPair.set(k, { first: r.price, last: r.price, med_id: r.medication_id, pharm_id: r.pharmacy_id });
      } else {
        cur.last = r.price; // ascending order, last write wins
      }
    }
    const arr = Array.from(perPair.values())
      .filter((x) => x.first > 0 && x.last > 0 && x.first !== x.last)
      .map((x) => ({
        ...x,
        change: ((x.last - x.first) / x.first) * 100,
        med: medById.get(x.med_id),
        pharm: pharmById.get(x.pharm_id),
      }))
      .filter((x) => x.med && x.pharm);
    arr.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    return arr.slice(0, 15);
  }, [prices, medById, pharmById]);

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-4 w-4" /> Volver al panel
      </Link>
      <h1 className="text-3xl font-bold">Evolución de precios · {WINDOW_DAYS} días</h1>
      <p className="text-muted-foreground mt-1">
        Índice de precio promedio por farmacia (base 100 = primer día con datos). Solo medicamentos en VES.
      </p>

      {loadingData ? (
        <Card className="p-8 mt-6 text-center text-muted-foreground">Cargando datos…</Card>
      ) : prices.length === 0 ? (
        <Card className="p-8 mt-6 text-center text-muted-foreground">
          Aún no hay precios en los últimos {WINDOW_DAYS} días. Ejecuta una actualización desde el panel.
        </Card>
      ) : (
        <>
          {/* Resumen por farmacia */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {summary.map((s) => {
              const dir = s.change == null ? "eq" : s.change > 0.5 ? "up" : s.change < -0.5 ? "down" : "eq";
              const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
              const color =
                dir === "up" ? "text-destructive" : dir === "down" ? "text-emerald-600" : "text-muted-foreground";
              return (
                <Card key={s.pharm.id} className="p-4">
                  <div className="flex items-center gap-2">
                    <PharmacyLogo slug={s.pharm.slug} name={s.pharm.name} size={28} />
                    <div className="font-medium text-sm">{s.pharm.name}</div>
                  </div>
                  <div className={`mt-3 flex items-center gap-1 text-2xl font-bold ${color}`}>
                    <Icon className="h-5 w-5" />
                    {s.change == null ? "—" : `${s.change > 0 ? "+" : ""}${s.change.toFixed(1)}%`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {s.meds} med · ↑{s.up ?? 0} ↓{s.down ?? 0} ={s.eq ?? 0}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Línea por farmacia */}
          <Card className="p-5 mt-6">
            <h3 className="font-semibold mb-3">Índice de precios (base 100)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                  <Tooltip
                    formatter={(v: any) => (typeof v === "number" ? v.toFixed(1) : v)}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {Object.keys(indexSeries).map((slug) => (
                    <Line
                      key={slug}
                      type="monotone"
                      dataKey={slug}
                      stroke={PHARM_COLOR[slug] ?? "#64748B"}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top movers */}
          <Card className="p-5 mt-6">
            <h3 className="font-semibold mb-3">Mayores cambios por medicamento</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2">Medicamento</th>
                    <th className="py-2">Farmacia</th>
                    <th className="py-2 text-right">Inicio</th>
                    <th className="py-2 text-right">Actual</th>
                    <th className="py-2 text-right">Cambio</th>
                  </tr>
                </thead>
                <tbody>
                  {topMovers.map((m) => (
                    <tr key={`${m.pharm_id}-${m.med_id}`} className="border-b last:border-0">
                      <td className="py-2">
                        <div className="font-medium">{m.med?.name}</div>
                        <div className="text-xs text-muted-foreground">{m.med?.active_ingredient}</div>
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center gap-1.5">
                          <PharmacyLogo slug={m.pharm!.slug} name={m.pharm!.name} size={20} />
                          {m.pharm?.name}
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums">Bs {m.first.toLocaleString("es-VE")}</td>
                      <td className="py-2 text-right tabular-nums">Bs {m.last.toLocaleString("es-VE")}</td>
                      <td className="py-2 text-right">
                        <Badge variant={m.change > 0 ? "destructive" : "secondary"}>
                          {m.change > 0 ? "+" : ""}{m.change.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}