import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, Sparkles, ArrowRight, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOrder, removeFromOrder } from "@/lib/order-store";
import { useBcvRate } from "@/hooks/useBcvRate";
import { priceToVes, formatBs, type PriceRow } from "@/lib/medications";
import { PharmacyLogo } from "@/components/PharmacyLogo";

type Pharm = { id: string; name: string; slug: string };

export function OrderSummaryHome() {
  const items = useOrder();
  const bcv = useBcvRate();
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [pharms, setPharms] = useState<Record<string, Pharm>>({});

  useEffect(() => {
    (async () => {
      const { data: ph } = await supabase.from("pharmacies").select("id,name,slug");
      setPharms(Object.fromEntries(((ph ?? []) as Pharm[]).map((p) => [p.id, p])));
      if (!items.length) { setPrices([]); return; }
      const ids = items.map((i) => i.medication_id);
      const { data } = await supabase
        .from("medication_prices")
        .select("*")
        .in("medication_id", ids)
        .order("scraped_at", { ascending: false })
        .limit(3000);
      setPrices((data ?? []) as PriceRow[]);
    })();
  }, [items.length, items.map((i) => i.medication_id).join(",")]);

  const plan = useMemo(() => {
    const latest = new Map<string, Map<string, { ves: number; price: PriceRow }>>();
    for (const p of prices) {
      const ves = priceToVes(Number(p.price), p.currency, bcv);
      if (ves == null || !p.in_stock) continue;
      let inner = latest.get(p.medication_id);
      if (!inner) { inner = new Map(); latest.set(p.medication_id, inner); }
      if (!inner.has(p.pharmacy_id)) inner.set(p.pharmacy_id, { ves, price: p });
    }
    let total = 0; let totalMax = 0;
    const rows = items.map((it) => {
      const inner = latest.get(it.medication_id);
      if (!inner || inner.size === 0) return { it, best: null as null | { ves: number; pharmId: string } };
      const arr = Array.from(inner.entries()).sort((a, b) => a[1].ves - b[1].ves);
      const [bestId, best] = arr[0];
      const [, worst] = arr[arr.length - 1];
      total += best.ves * it.quantity;
      totalMax += worst.ves * it.quantity;
      return { it, best: { ves: best.ves, pharmId: bestId } };
    });
    return { rows, total, savings: Math.max(0, totalMax - total) };
  }, [items, prices, bcv]);

  if (!items.length) return null;

  return (
    <section className="container mx-auto px-4 pt-6">
      <Card className="p-4 md:p-5 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Tu orden ({items.length} {items.length === 1 ? "medicina" : "medicinas"})</h2>
              <p className="text-sm text-muted-foreground">
                {plan.total > 0 ? <>Mix más barato: <strong className="text-primary">{formatBs(plan.total)}</strong></> : "Calculando precios…"}
                {plan.savings > 0 && (
                  <> · <span className="inline-flex items-center gap-1 text-accent font-semibold"><Sparkles className="h-3.5 w-3.5" /> Ahorras {formatBs(plan.savings)}</span></>
                )}
              </p>
            </div>
          </div>
          <Link to="/mi-orden">
            <Button size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
              Ver mi orden <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {plan.rows.slice(0, 6).map(({ it, best }) => (
            <div key={it.medication_id} className="flex items-center gap-2 rounded-lg bg-background/70 border border-border/60 px-2.5 py-2">
              <Link to="/medicamento/$slug" params={{ slug: it.slug }} className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{it.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {it.quantity}× ·{" "}
                  {best ? (
                    <span className="inline-flex items-center gap-1">
                      {formatBs(best.ves)} en
                      <PharmacyLogo slug={pharms[best.pharmId]?.slug ?? ""} name={pharms[best.pharmId]?.name} size={12} className="rounded-full" />
                      {pharms[best.pharmId]?.name}
                    </span>
                  ) : "sin precio"}
                </div>
              </Link>
              <button
                onClick={() => removeFromOrder(it.medication_id)}
                className="text-muted-foreground hover:text-destructive p-1"
                aria-label="Quitar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {items.length > 6 && (
            <div className="flex items-center justify-center text-xs text-muted-foreground">
              + {items.length - 6} más…
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
