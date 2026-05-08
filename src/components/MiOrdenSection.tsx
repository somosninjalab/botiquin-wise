import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trash2, Plus, Minus, Search, Save, X, ExternalLink, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBcvRate } from "@/hooks/useBcvRate";
import { useOrder, addToOrder, removeFromOrder, setQty, clearOrder, type OrderItem } from "@/lib/order-store";
import { searchMedications, priceToVes, formatBs, formatUSD, type MedicationRow, type PriceRow } from "@/lib/medications";
import { PharmacyLogo } from "@/components/PharmacyLogo";

type Pharm = { id: string; name: string; slug: string };

export function MiOrdenSection({ compact = false }: { compact?: boolean }) {
  const items = useOrder();
  const { user } = useAuth();
  const bcv = useBcvRate();
  const navigate = useNavigate();

  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [pharms, setPharms] = useState<Pharm[]>([]);
  const [mode, setMode] = useState<"mix" | "pharm">("mix");
  const [orderName, setOrderName] = useState("Mi orden");

  useEffect(() => {
    (async () => {
      const { data: ph } = await supabase.from("pharmacies").select("id,name,slug");
      setPharms((ph ?? []) as Pharm[]);
      if (!items.length) { setPrices([]); return; }
      const ids = items.map((i) => i.medication_id);
      const { data } = await supabase
        .from("medication_prices")
        .select("*")
        .in("medication_id", ids)
        .order("scraped_at", { ascending: false })
        .limit(5000);
      setPrices((data ?? []) as PriceRow[]);
    })();
  }, [items.length, items.map((i) => i.medication_id).join(",")]);

  const latestPerMed = useMemo(() => {
    const m = new Map<string, Map<string, { ves: number; price: PriceRow }>>();
    for (const p of prices) {
      const ves = priceToVes(Number(p.price), p.currency, bcv);
      if (ves == null || !p.in_stock) continue;
      let inner = m.get(p.medication_id);
      if (!inner) { inner = new Map(); m.set(p.medication_id, inner); }
      if (!inner.has(p.pharmacy_id)) inner.set(p.pharmacy_id, { ves, price: p });
    }
    return m;
  }, [prices, bcv]);

  const mixPlan = useMemo(() => {
    let total = 0; let totalMax = 0;
    const rows: { item: OrderItem; pharmId: string | null; ves: number | null; price: PriceRow | null; max: number | null }[] = [];
    for (const it of items) {
      const inner = latestPerMed.get(it.medication_id);
      if (!inner || inner.size === 0) {
        rows.push({ item: it, pharmId: null, ves: null, price: null, max: null });
        continue;
      }
      const arr = Array.from(inner.entries()).sort((a, b) => a[1].ves - b[1].ves);
      const [bestId, best] = arr[0];
      const [, worst] = arr[arr.length - 1];
      total += best.ves * it.quantity;
      totalMax += worst.ves * it.quantity;
      rows.push({ item: it, pharmId: bestId, ves: best.ves, price: best.price, max: worst.ves });
    }
    return { total, totalMax, savings: Math.max(0, totalMax - total), rows };
  }, [items, latestPerMed]);

  const pharmPlans = useMemo(() => {
    return pharms.map((ph) => {
      let total = 0; let covered = 0;
      const detail: { item: OrderItem; ves: number | null; price: PriceRow | null }[] = [];
      for (const it of items) {
        const entry = latestPerMed.get(it.medication_id)?.get(ph.id);
        if (entry) { total += entry.ves * it.quantity; covered++; detail.push({ item: it, ves: entry.ves, price: entry.price }); }
        else detail.push({ item: it, ves: null, price: null });
      }
      return { ph, total, covered, missing: items.length - covered, detail };
    })
    .filter((p) => p.covered > 0)
    .sort((a, b) => {
      if (a.missing !== b.missing) return a.missing - b.missing;
      return a.total - b.total;
    });
  }, [pharms, items, latestPerMed]);

  const bestPharm = pharmPlans[0] ?? null;

  const saveOrder = async () => {
    if (!user) {
      sessionStorage.setItem("redirectAfterAuth", "/mi-orden");
      toast.message("Inicia sesión para guardar tu orden");
      navigate({ to: "/auth" });
      return;
    }
    if (!items.length) { toast.error("Agrega medicinas primero"); return; }
    const { error } = await supabase.from("user_orders").insert({
      user_id: user.id,
      name: orderName.trim() || "Mi orden",
      items: items as unknown as never,
    });
    if (error) { toast.error("No se pudo guardar: " + error.message); return; }
    toast.success("Orden guardada");
  };

  return (
    <div className="space-y-6">
      <AddMedicationForm />

      {!items.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          Tu orden está vacía. Busca una medicina arriba y pulsa <span className="font-semibold">Agregar</span>.
        </Card>
      ) : (
        <>
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">Tu lista ({items.length})</h3>
              <Button variant="ghost" size="sm" onClick={() => clearOrder()}>
                <Trash2 className="h-4 w-4 mr-1" /> Vaciar
              </Button>
            </div>
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li key={it.medication_id} className="flex items-center gap-3 py-3">
                  {it.image_url ? (
                    <img src={it.image_url} alt="" className="h-10 w-10 rounded object-cover bg-muted" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <Link to="/medicamento/$slug" params={{ slug: it.slug }} className="font-medium hover:underline block truncate">
                      {it.name}
                    </Link>
                    <div className="text-xs text-muted-foreground truncate">{it.active_ingredient}{it.presentation ? ` • ${it.presentation}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty(it.medication_id, it.quantity - 1)} aria-label="Menos"><Minus className="h-3.5 w-3.5" /></Button>
                    <span className="w-8 text-center text-sm font-semibold">{it.quantity}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty(it.medication_id, it.quantity + 1)} aria-label="Más"><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => removeFromOrder(it.medication_id)} aria-label="Quitar">
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex gap-2">
            <Button variant={mode === "mix" ? "default" : "outline"} onClick={() => setMode("mix")} className="flex-1">
              <Sparkles className="h-4 w-4 mr-1" /> Mix más barato
            </Button>
            <Button variant={mode === "pharm" ? "default" : "outline"} onClick={() => setMode("pharm")} className="flex-1">
              Una sola farmacia
            </Button>
          </div>

          {mode === "mix" ? (
            <MixView plan={mixPlan} pharms={pharms} bcv={bcv} />
          ) : (
            <PharmView plans={pharmPlans} bestTotal={bestPharm?.total ?? null} bcv={bcv} />
          )}

          {!compact && (
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Save className="h-4 w-4" /> Guardar mi orden</h3>
              <div className="flex gap-2">
                <Input value={orderName} onChange={(e) => setOrderName(e.target.value)} placeholder="Nombre de la lista" maxLength={80} />
                <Button onClick={saveOrder} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
                  {user ? "Guardar" : "Iniciar sesión y guardar"}
                </Button>
              </div>
              {!user && <p className="text-xs text-muted-foreground">Crea tu cuenta para tener tu lista siempre lista en cualquier dispositivo y recibir alertas cuando bajen los precios.</p>}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function AddMedicationForm() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MedicationRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); return; }
    const id = setTimeout(async () => {
      setLoading(true);
      try { setResults(await searchMedications(q, 8)); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <Card className="p-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca y agrega medicinas (ej. ibuprofeno)" className="pl-10" maxLength={200} />
      </div>
      {loading && <p className="text-xs text-muted-foreground">Buscando…</p>}
      {results.length > 0 && (
        <ul className="divide-y divide-border max-h-72 overflow-auto rounded-md border border-border">
          {results.map((m) => (
            <li key={m.id} className="flex items-center gap-3 p-2">
              {m.image_url ? (
                <img src={m.image_url} alt="" className="h-9 w-9 rounded object-cover bg-muted" />
              ) : (<div className="h-9 w-9 rounded bg-muted" />)}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.name}</div>
                <div className="text-xs text-muted-foreground truncate">{m.active_ingredient}{m.presentation ? ` • ${m.presentation}` : ""}</div>
              </div>
              <Button size="sm" onClick={() => {
                addToOrder({
                  medication_id: m.id, slug: m.slug, name: m.name,
                  active_ingredient: m.active_ingredient, presentation: m.presentation, image_url: m.image_url,
                });
                toast.success(`${m.name} agregado`);
                setQ("");
                setResults([]);
              }}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function MixView({ plan, pharms, bcv }: {
  plan: { total: number; totalMax: number; savings: number; rows: { item: OrderItem; pharmId: string | null; ves: number | null; price: PriceRow | null; max: number | null }[] };
  pharms: Pharm[]; bcv: number | null;
}) {
  const pharmMap = Object.fromEntries(pharms.map((p) => [p.id, p]));
  const usd = bcv && bcv > 0 ? plan.total / bcv : null;
  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold">Compra más barata combinando farmacias</h3>
          <p className="text-xs text-muted-foreground">Cada medicina en la farmacia con el mejor precio actual.</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatBs(plan.total)}</div>
          {usd != null && <div className="text-xs text-muted-foreground">{formatUSD(usd)}</div>}
        </div>
      </div>
      {plan.savings > 0 && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Ahorras {formatBs(plan.savings)}</span>{" "}
          <span className="text-muted-foreground">vs. el precio más caro disponible ({formatBs(plan.totalMax)}).</span>
        </div>
      )}
      <ul className="divide-y divide-border">
        {plan.rows.map((r) => (
          <li key={r.item.medication_id} className="py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{r.item.quantity} × {r.item.name}</div>
              <div className="text-xs text-muted-foreground truncate">{r.item.active_ingredient}</div>
            </div>
            {r.pharmId && r.price ? (
              <a href={r.price.product_url ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-90">
                <PharmacyLogo slug={pharmMap[r.pharmId]?.slug ?? ""} name={pharmMap[r.pharmId]?.name} size={28} />
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatBs((r.ves ?? 0) * r.item.quantity)}</div>
                  <div className="text-[10px] text-muted-foreground">{pharmMap[r.pharmId]?.name}</div>
                </div>
                {r.price.product_url && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">Sin precio disponible</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PharmView({ plans, bestTotal, bcv }: {
  plans: { ph: Pharm; total: number; covered: number; missing: number; detail: { item: OrderItem; ves: number | null; price: PriceRow | null }[] }[];
  bestTotal: number | null; bcv: number | null;
}) {
  if (!plans.length) {
    return <Card className="p-6 text-center text-sm text-muted-foreground">No tenemos precios actuales para tu lista en ninguna farmacia.</Card>;
  }
  const worst = plans.reduce((m, p) => Math.max(m, p.total), 0);
  return (
    <div className="space-y-3">
      {plans.map((p) => {
        const usd = bcv && bcv > 0 ? p.total / bcv : null;
        const savings = worst > p.total ? worst - p.total : 0;
        const isBest = bestTotal != null && p.total === bestTotal && p.missing === 0;
        return (
          <Card key={p.ph.id} className={`p-4 space-y-3 ${isBest ? "ring-2 ring-emerald-500/60" : ""}`}>
            <div className="flex items-center gap-3">
              <PharmacyLogo slug={p.ph.slug} name={p.ph.name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold flex items-center gap-2">
                  {p.ph.name}
                  {isBest && <span className="text-[10px] uppercase tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">Más barata</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  Cubre {p.covered} de {p.covered + p.missing} {p.missing > 0 ? `(faltan ${p.missing})` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{formatBs(p.total)}</div>
                {usd != null && <div className="text-[11px] text-muted-foreground">{formatUSD(usd)}</div>}
                {savings > 0 && <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Ahorras {formatBs(savings)}</div>}
              </div>
            </div>
            <ul className="text-xs space-y-1">
              {p.detail.map((d) => (
                <li key={d.item.medication_id} className="flex justify-between gap-2">
                  <span className="truncate">{d.item.quantity} × {d.item.name}</span>
                  <span className={d.ves == null ? "text-muted-foreground italic" : "font-medium"}>
                    {d.ves == null ? "no disponible" : formatBs(d.ves * d.item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}