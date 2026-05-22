import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, ExternalLink, Pill, ShoppingCart, Check } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { displayPrice, priceToVes, type MedicationRow, type PriceRow } from "@/lib/medications";
import { useBcvRate } from "@/hooks/useBcvRate";
import { PharmacyLogo } from "@/components/PharmacyLogo";
import { addToOrder, useOrder } from "@/lib/order-store";

export const Route = createFileRoute("/medicamento/$slug")({
  component: MedicamentoPage,
});

function MedicamentoPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const bcvRate = useBcvRate();
  const [med, setMed] = useState<MedicationRow | null>(null);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [pharms, setPharms] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [following, setFollowing] = useState(false);
  const order = useOrder();
  const inOrder = !!med && order.some((i) => i.medication_id === med.id);

  useEffect(() => {
    (async () => {
      const { data: m } = await supabase.from("medications").select("*").eq("slug", slug).maybeSingle();
      if (!m) return;
      setMed(m as MedicationRow);
      const [{ data: p }, { data: ph }] = await Promise.all([
        supabase.from("medication_prices").select("*").eq("medication_id", m.id).order("scraped_at", { ascending: true }),
        supabase.from("pharmacies").select("id,name,slug"),
      ]);
      setPrices((p ?? []) as PriceRow[]);
      setPharms((ph ?? []) as any);
      await trackSearch({ medication_id: m.id, category: m.category });
      if (user) {
        const { data: f } = await supabase
          .from("medication_followers").select("id").eq("user_id", user.id).eq("medication_id", m.id).maybeSingle();
        setFollowing(!!f);
      }
    })();
  }, [slug, user]);

  const pharmMap = useMemo(() => Object.fromEntries(pharms.map((p) => [p.id, p.name])), [pharms]);
  const pharmSlugMap = useMemo(() => Object.fromEntries(pharms.map((p) => [p.id, p.slug])), [pharms]);

  // Latest per pharmacy
  const latestByPharm = useMemo(() => {
    const map = new Map<string, PriceRow>();
    [...prices].reverse().forEach((p) => { if (!map.has(p.pharmacy_id)) map.set(p.pharmacy_id, p); });
    const ves = (p: PriceRow) => priceToVes(Number(p.price), p.currency, bcvRate) ?? Number.POSITIVE_INFINITY;
    return Array.from(map.values()).sort((a, b) => ves(a) - ves(b));
  }, [prices, bcvRate]);

  // Chart data: per-day en bolívares por farmacia
  const chartData = useMemo(() => {
    const byDay = new Map<string, Record<string, number>>();
    prices.forEach((p) => {
      const day = p.scraped_at.slice(0, 10);
      const row = byDay.get(day) ?? {};
      const ves = priceToVes(Number(p.price), p.currency, bcvRate);
      if (ves != null) {
        row[pharmMap[p.pharmacy_id] ?? p.pharmacy_id] = Number(ves.toFixed(2));
      }
      byDay.set(day, row);
    });
    return Array.from(byDay.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, vals]) => ({ day, ...vals }));
  }, [prices, pharmMap, bcvRate]);

  const colors = ["hsl(165 50% 50%)", "hsl(30 80% 60%)", "hsl(220 70% 55%)", "hsl(285 60% 55%)"];

  const toggleFollow = async () => {
    if (!user) { toast.error("Inicia sesión para recibir alertas"); return; }
    if (!med) return;
    if (following) {
      await supabase.from("medication_followers").delete().eq("user_id", user.id).eq("medication_id", med.id);
      setFollowing(false);
      toast.success("Dejaste de seguir este medicamento");
    } else {
      const { error } = await supabase.from("medication_followers").insert({ user_id: user.id, medication_id: med.id });
      if (error) { toast.error(error.message); return; }
      setFollowing(true);
      toast.success("Recibirás alertas cuando baje el precio");
    }
  };

  if (!med) return <div className="container mx-auto px-4 py-16">Cargando…</div>;

  const lowestVes = latestByPharm[0]
    ? priceToVes(Number(latestByPharm[0].price), latestByPharm[0].currency, bcvRate)
    : null;
  const highestVes = latestByPharm.length
    ? priceToVes(
        Number(latestByPharm[latestByPharm.length - 1].price),
        latestByPharm[latestByPharm.length - 1].currency,
        bcvRate,
      )
    : null;
  const savings =
    lowestVes != null && highestVes != null && highestVes > lowestVes
      ? Math.round(((highestVes - lowestVes) / highestVes) * 100)
      : 0;

  return (
    <div className="container mx-auto px-4 py-8 md:py-10 max-w-6xl">
      <Link to="/" search={{ q: "", pharm: "all", med: "all", cat: "all", ind: "all" }} className="text-sm text-muted-foreground hover:underline">
        ← Volver al inicio
      </Link>

      {/* Hero del medicamento */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {med.image_url ? (
                <img
                  src={med.image_url}
                  alt={med.name}
                  className="h-20 w-20 rounded-xl object-contain bg-white border border-border"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="rounded-xl bg-primary/10 p-3 text-primary"><Pill className="h-6 w-6" /></div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold">{med.name}</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  {med.active_ingredient}{med.presentation ? ` · ${med.presentation}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {med.category && <span className="rounded-full bg-secondary px-3 py-1">{med.category}</span>}
              {(med.indication_es || med.indication) && (
                <span className="rounded-full bg-secondary px-3 py-1">{med.indication_es || med.indication}</span>
              )}
              {med.manufacturer && <span className="rounded-full bg-secondary px-3 py-1">{med.manufacturer}</span>}
            </div>
            {med.brand_names && med.brand_names.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                <span className="font-medium text-foreground">Marcas:</span> {med.brand_names.join(", ")}
              </p>
            )}
          </div>
          <div className="flex flex-col items-stretch md:items-end gap-3 shrink-0">
            {latestByPharm[0] && (
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Mejor precio hoy</div>
                {(() => {
                  const p = latestByPharm[0];
                  const d = displayPrice(Number(p.price), p.currency, bcvRate);
                  return (
                    <>
                      <div className="text-3xl font-bold text-primary">{d.primary}</div>
                      {d.secondary && <div className="text-xs text-muted-foreground">≈ {d.secondary}</div>}
                      <div className="text-xs text-muted-foreground mt-1">en {pharmMap[p.pharmacy_id]}</div>
                    </>
                  );
                })()}
                {savings > 0 && (
                  <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                    Ahorras hasta {savings}%
                  </div>
                )}
              </div>
            )}
            <Button
              onClick={toggleFollow}
              className={following ? "" : "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"}
              variant={following ? "outline" : "default"}
            >
              {following ? <><BellOff className="h-4 w-4 mr-2" /> Dejar de seguir</> : <><Bell className="h-4 w-4 mr-2" /> Avísame si baja</>}
            </Button>
            <Button
              onClick={() => {
                if (!med) return;
                addToOrder({
                  medication_id: med.id,
                  slug: med.slug,
                  name: med.name,
                  active_ingredient: med.active_ingredient,
                  presentation: med.presentation,
                  image_url: med.image_url,
                });
                toast.success(`${med.name} agregado a tu orden`);
              }}
              variant={inOrder ? "outline" : "secondary"}
            >
              {inOrder ? <><Check className="h-4 w-4 mr-2" /> En tu orden — agregar otro</> : <><ShoppingCart className="h-4 w-4 mr-2" /> Agregar a mi orden</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabla de comparación tipo GoodRx */}
      <div className="mt-8">
        <h2 className="text-xl font-bold">Compara precios en farmacias</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Precios actualizados. Pulsa "Ver" para ir directo a la farmacia.
        </p>
        <Card className="mt-4 overflow-hidden p-0">
          {latestByPharm.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aún no hay precios para este medicamento. Vuelve pronto.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {latestByPharm.map((p, i) => {
                const d = displayPrice(Number(p.price), p.currency, bcvRate);
                const isLowest = i === 0;
                return (
                  <li
                    key={p.id}
                    className={`grid grid-cols-12 items-center gap-3 p-4 ${isLowest ? "bg-primary/5" : ""}`}
                  >
                    <div className="col-span-12 sm:col-span-5 flex items-center gap-3 min-w-0">
                      <PharmacyLogo
                        slug={pharmSlugMap[p.pharmacy_id] ?? ""}
                        name={pharmMap[p.pharmacy_id]}
                        size={36}
                        className="shrink-0 rounded-full"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{pharmMap[p.pharmacy_id]}</div>
                        <div className={`text-xs ${p.in_stock ? "text-success" : "text-muted-foreground"}`}>
                          {p.in_stock ? "En stock" : "Sin stock"}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-6 sm:col-span-4">
                      {isLowest && (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wide rounded-full bg-primary text-primary-foreground px-2 py-0.5 mb-1">
                          Precio más bajo
                        </span>
                      )}
                      <div className={`font-bold ${isLowest ? "text-primary text-xl" : "text-lg"}`}>{d.primary}</div>
                      {d.secondary && <div className="text-[11px] text-muted-foreground">≈ {d.secondary}</div>}
                    </div>
                    <div className="col-span-6 sm:col-span-3 text-right">
                      {p.product_url ? (
                        <a href={p.product_url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant={isLowest ? "default" : "outline"} className={isLowest ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground" : ""}>
                            Ver <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                          </Button>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin enlace</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Histórico */}
      {chartData.length > 1 && (
        <Card className="mt-8 p-6">
          <h2 className="font-semibold mb-1">Evolución de precios</h2>
          <p className="text-sm text-muted-foreground mb-4">Histórico en bolívares por farmacia.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {pharms.map((p, i) => (
                  <Line key={p.id} type="monotone" dataKey={p.name} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
