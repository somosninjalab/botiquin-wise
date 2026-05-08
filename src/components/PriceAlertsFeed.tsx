import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { TrendingDown, TrendingUp, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PharmacyLogo } from "@/components/PharmacyLogo";

type Alert = {
  id: string;
  pct_change: number;
  previous_price: number;
  new_price: number;
  currency: string;
  created_at: string;
  medication: { name: string; slug: string; active_ingredient: string } | null;
  pharmacy: { name: string; slug: string } | null;
};

function fmt(n: number, cur: string) {
  if (cur === "VES") return `Bs ${n.toLocaleString("es-VE", { maximumFractionDigits: 0 })}`;
  return `${cur} ${n.toLocaleString("es-VE", { maximumFractionDigits: 2 })}`;
}

function ago(iso: string): string {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

export function PriceAlertsFeed({ limit = 8 }: { limit?: number }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("price_alerts")
        .select("id, pct_change, previous_price, new_price, currency, created_at, medication:medications(name, slug, active_ingredient), pharmacy:pharmacies(name, slug)")
        .order("created_at", { ascending: false })
        .limit(limit);
      setAlerts((data ?? []) as unknown as Alert[]);
      setLoading(false);
    })();
  }, [limit]);

  if (loading) return null;
  if (!alerts.length) return null;

  return (
    <section className="container mx-auto px-4 py-12 md:py-14">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Alertas de precio
          </h2>
          <p className="text-muted-foreground mt-1">
            Cambios significativos detectados en las farmacias monitoreadas.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {alerts.map((a) => {
          const up = a.pct_change > 0;
          const Icon = up ? TrendingUp : TrendingDown;
          return (
            <Link
              key={a.id}
              to={a.medication ? "/medicamento/$slug" : "/"}
              params={a.medication ? { slug: a.medication.slug } : undefined as any}
            >
              <Card className="p-4 h-full hover:shadow-[var(--shadow-elevated)] hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between gap-2">
                  {a.pharmacy && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <PharmacyLogo slug={a.pharmacy.slug} name={a.pharmacy.name} size={20} />
                      {a.pharmacy.name}
                    </span>
                  )}
                  <Badge variant={up ? "destructive" : "secondary"} className="gap-1">
                    <Icon className="h-3 w-3" />
                    {up ? "+" : ""}{a.pct_change.toFixed(1)}%
                  </Badge>
                </div>
                <h3 className="mt-3 font-semibold leading-tight line-clamp-2">{a.medication?.name ?? "—"}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{a.medication?.active_ingredient}</p>
                <div className="mt-3 pt-3 border-t border-border/60 flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground line-through">{fmt(Number(a.previous_price), a.currency)}</span>
                  <span className={`text-lg font-bold ${up ? "text-destructive" : "text-emerald-600"}`}>
                    {fmt(Number(a.new_price), a.currency)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground text-right">{ago(a.created_at)}</div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}