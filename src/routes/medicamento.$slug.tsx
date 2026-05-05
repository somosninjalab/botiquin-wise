import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, ExternalLink, Pill } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { displayPrice, priceToVes, type MedicationRow, type PriceRow } from "@/lib/medications";
import { useBcvRate } from "@/hooks/useBcvRate";

export const Route = createFileRoute("/medicamento/$slug")({
  component: MedicamentoPage,
});

function MedicamentoPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const bcvRate = useBcvRate();
  const [med, setMed] = useState<MedicationRow | null>(null);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [pharms, setPharms] = useState<{ id: string; name: string }[]>([]);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: m } = await supabase.from("medications").select("*").eq("slug", slug).maybeSingle();
      if (!m) return;
      setMed(m as MedicationRow);
      const [{ data: p }, { data: ph }] = await Promise.all([
        supabase.from("medication_prices").select("*").eq("medication_id", m.id).order("scraped_at", { ascending: true }),
        supabase.from("pharmacies").select("id,name"),
      ]);
      setPrices((p ?? []) as PriceRow[]);
      setPharms((ph ?? []) as any);
      await supabase.from("search_events").insert({ medication_id: m.id, category: m.category });
      if (user) {
        const { data: f } = await supabase
          .from("medication_followers").select("id").eq("user_id", user.id).eq("medication_id", m.id).maybeSingle();
        setFollowing(!!f);
      }
    })();
  }, [slug, user]);

  const pharmMap = useMemo(() => Object.fromEntries(pharms.map((p) => [p.id, p.name])), [pharms]);

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

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <Link to="/buscar" search={{ q: "" }} className="text-sm text-muted-foreground hover:underline">← Volver a buscar</Link>
      <div className="mt-4 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary"><Pill className="h-6 w-6" /></div>
            <div>
              <h1 className="text-3xl font-bold">{med.name}</h1>
              <p className="text-muted-foreground">{med.active_ingredient} · {med.presentation}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {med.category && <span className="rounded-full bg-secondary px-3 py-1">{med.category}</span>}
            {med.indication && <span className="rounded-full bg-secondary px-3 py-1">{med.indication}</span>}
            {med.manufacturer && <span className="rounded-full bg-secondary px-3 py-1">{med.manufacturer}</span>}
          </div>
        </div>
        <Button onClick={toggleFollow} className={following ? "" : "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"} variant={following ? "outline" : "default"}>
          {following ? <><BellOff className="h-4 w-4 mr-2" /> Dejar de seguir</> : <><Bell className="h-4 w-4 mr-2" /> Recibir alertas</>}
        </Button>
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h2 className="font-semibold mb-4">Evolución de precios (últimos 30 días)</h2>
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

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Precios actuales</h2>
          <ul className="space-y-3">
            {latestByPharm.map((p, i) => (
              <li key={p.id} className={`flex items-center justify-between rounded-lg border p-3 ${i === 0 ? "border-primary bg-primary/5" : "border-border"}`}>
                <div>
                  <div className="font-medium">{pharmMap[p.pharmacy_id]}</div>
                  <div className="text-xs text-muted-foreground">{p.in_stock ? "En stock" : "Sin stock"}</div>
                </div>
                <div className="text-right">
                  {(() => {
                    const d = displayPrice(Number(p.price), p.currency, bcvRate);
                    return (
                      <>
                        <div className={`font-bold ${i === 0 ? "text-primary text-lg" : ""}`}>{d.primary}</div>
                        {d.secondary && (
                          <div className="text-[10px] text-muted-foreground">≈ {d.secondary}</div>
                        )}
                      </>
                    );
                  })()}
                  {p.product_url && (
                    <a href={p.product_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                      Ver <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
