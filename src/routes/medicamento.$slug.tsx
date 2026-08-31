import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, ExternalLink, Pill, ShoppingCart, Check } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackSearch } from "@/lib/track-search";
import { useAuth } from "@/hooks/useAuth";
import { displayPrice, priceToVes, type MedicationRow, type PriceRow } from "@/lib/medications";
import { useBcvRate } from "@/hooks/useBcvRate";
import { PharmacyLogo } from "@/components/PharmacyLogo";
import { addToOrder, useOrder } from "@/lib/order-store";
import { getMedicationMeta } from "@/lib/medication-meta.functions";

export const Route = createFileRoute("/medicamento/$slug")({
  component: MedicamentoPage,
  loader: ({ params }) => getMedicationMeta({ data: { slug: params.slug } }),
  head: ({ params, loaderData }) => {
    const url = `https://alertamedicina.com/medicamento/${encodeURIComponent(params.slug)}`;
    const m = loaderData ?? null;
    const label = m
      ? `${m.name}${m.presentation ? ` ${m.presentation}` : ""}`
      : params.slug.replace(/-/g, " ");
    const title = `${label} — precio y dónde comprar en Venezuela | ¡Alerta: Medicina!`;
    const description = m
      ? `Compara el precio de ${m.name}${m.presentation ? ` (${m.presentation})` : ""}, principio activo ${m.active_ingredient}${m.indication ? `, indicado para ${m.indication.toLowerCase()}` : ""}. Precios actualizados en farmacias de Venezuela.`
      : `Compara precios de ${label} en las principales farmacias de Venezuela y encuentra dónde comprarlo más barato.`;
    return {
      meta: [
        { title },
        { name: "description", content: description.slice(0, 300) },
        { property: "og:title", content: title },
        { property: "og:description", content: description.slice(0, 300) },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description.slice(0, 300) },
        ...(m?.image_url
          ? [
              { property: "og:image", content: m.image_url },
              { name: "twitter:image", content: m.image_url },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: m
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: label,
                description,
                ...(m.image_url ? { image: m.image_url } : {}),
                ...(m.manufacturer ? { brand: { "@type": "Brand", name: m.manufacturer } } : {}),
                category: m.category ?? undefined,
                url,
              }),
            },
          ]
        : undefined,
    };
  },
});

function MedicamentoSkeleton() {
  return (
    <div className="container mx-auto px-4 py-4 md:py-10 max-w-6xl pb-28 md:pb-10">
      <Skeleton className="h-4 w-16" />
      <header className="mt-4 flex items-start gap-3 md:gap-4">
        <Skeleton className="h-14 w-14 md:h-20 md:w-20 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </header>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-24 rounded-2xl" />
      <Skeleton className="mt-6 h-5 w-56" />
      <div className="mt-3 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

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

  if (!med) return <MedicamentoSkeleton />;

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

  const addThisToOrder = () => {
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
  };
  const lowestRow = latestByPharm[0];

  return (
    <div className="container mx-auto px-4 py-4 md:py-10 max-w-6xl pb-28 md:pb-10">
      <Link to="/" search={{ q: "", pharm: "all", med: "all", cat: "all", ind: "all" }} className="text-sm text-muted-foreground hover:underline">
        ← Volver
      </Link>

      {/* Encabezado tipo GoodRx: nombre + genérico + chips */}
      <header className="mt-3 md:mt-4 flex items-start gap-3 md:gap-4">
        {med.image_url ? (
          <img
            src={med.image_url}
            alt={med.name}
            className="h-14 w-14 md:h-20 md:w-20 rounded-xl object-contain bg-white border border-border shrink-0"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0"><Pill className="h-6 w-6" /></div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">{med.name}</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-0.5">
            {med.active_ingredient}{med.presentation ? ` · ${med.presentation}` : ""}
          </p>
        </div>
      </header>

      {/* Chips horizontales con scroll en móvil (GoodRx pattern) */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {med.category && <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">{med.category}</span>}
        {(med.indication_es || med.indication) && (
          <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">{med.indication_es || med.indication}</span>
        )}
        {med.manufacturer && <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">{med.manufacturer}</span>}
      </div>
      {med.brand_names && med.brand_names.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          <span className="font-medium text-foreground">Marcas:</span> {med.brand_names.join(", ")}
        </p>
      )}

      {/* Banner amarillo: mejor precio (GoodRx-style) */}
      {lowestRow && (() => {
        const d = displayPrice(Number(lowestRow.price), lowestRow.currency, bcvRate);
        return (
          <a
            href={lowestRow.product_url ?? "#"}
            target={lowestRow.product_url ? "_blank" : undefined}
            rel="noreferrer"
            className="mt-5 flex items-center gap-3 rounded-2xl bg-amber-100 dark:bg-amber-950/40 border border-amber-300/70 dark:border-amber-700/40 p-4 active:scale-[0.99] transition-transform"
          >
            <PharmacyLogo
              slug={pharmSlugMap[lowestRow.pharmacy_id] ?? ""}
              name={pharmMap[lowestRow.pharmacy_id]}
              size={44}
              className="shrink-0 rounded-full bg-white"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wide font-bold text-amber-900 dark:text-amber-300">Más barato</div>
              <div className="text-2xl md:text-3xl font-extrabold text-amber-950 dark:text-amber-50 leading-tight">{d.primary}</div>
              <div className="text-xs text-amber-900/80 dark:text-amber-200/80 truncate">
                en {pharmMap[lowestRow.pharmacy_id]}
                {d.secondary && <> · ≈ {d.secondary}</>}
                {savings > 0 && <> · ahorras {savings}%</>}
              </div>
            </div>
            {lowestRow.product_url && <ExternalLink className="h-5 w-5 text-amber-900 dark:text-amber-300 shrink-0" />}
          </a>
        );
      })()}

      {/* Lista de farmacias estilo GoodRx — filas grandes, toda la fila tappable */}
      <div className="mt-6">
        <h2 className="text-lg md:text-xl font-bold">Compara precios en farmacias</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Pulsa una fila para ir directo a la farmacia.</p>
        <Card className="mt-3 overflow-hidden p-0">
          {latestByPharm.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aún no hay precios para este medicamento. Vuelve pronto.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {latestByPharm.map((p, i) => {
                const d = displayPrice(Number(p.price), p.currency, bcvRate);
                const isLowest = i === 0;
                const RowContent = (
                  <div className={`flex items-center gap-3 p-4 min-h-[68px] ${isLowest ? "bg-primary/5" : ""}`}>
                    <PharmacyLogo
                      slug={pharmSlugMap[p.pharmacy_id] ?? ""}
                      name={pharmMap[p.pharmacy_id]}
                      size={40}
                      className="shrink-0 rounded-full bg-white"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate text-base">{pharmMap[p.pharmacy_id]}</div>
                      <div className={`text-xs ${p.in_stock ? "text-success" : "text-muted-foreground"}`}>
                        {p.in_stock ? "En stock" : "Sin stock"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-extrabold tabular-nums ${isLowest ? "text-primary text-xl" : "text-lg"}`}>{d.primary}</div>
                      {d.secondary && <div className="text-[11px] text-muted-foreground">≈ {d.secondary}</div>}
                    </div>
                    {p.product_url ? (
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                    ) : null}
                  </div>
                );
                return (
                  <li key={p.id}>
                    {p.product_url ? (
                      <a href={p.product_url} target="_blank" rel="noreferrer" className="block active:bg-muted/60">
                        {RowContent}
                      </a>
                    ) : (
                      <div>{RowContent}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* CTAs secundarios (desktop) */}
      <div className="hidden md:flex mt-6 gap-3">
        <Button
          onClick={toggleFollow}
          className={following ? "" : "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"}
          variant={following ? "outline" : "default"}
        >
          {following ? <><BellOff className="h-4 w-4 mr-2" /> Dejar de seguir</> : <><Bell className="h-4 w-4 mr-2" /> Avísame si baja</>}
        </Button>
        <Button onClick={addThisToOrder} variant={inOrder ? "outline" : "secondary"}>
          {inOrder ? <><Check className="h-4 w-4 mr-2" /> En tu orden — agregar otro</> : <><ShoppingCart className="h-4 w-4 mr-2" /> Agregar a mi orden</>}
        </Button>
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

      {/* Sticky CTAs móvil (sobre la bottom-nav) */}
      <div
        className="md:hidden fixed inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur-md px-3 py-2 flex gap-2"
        style={{ bottom: `calc(64px + env(safe-area-inset-bottom))` }}
      >
        <Button
          onClick={toggleFollow}
          variant={following ? "outline" : "default"}
          className={`flex-1 h-11 ${following ? "" : "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"}`}
        >
          {following ? <><BellOff className="h-4 w-4 mr-1.5" /> Siguiendo</> : <><Bell className="h-4 w-4 mr-1.5" /> Avísame</>}
        </Button>
        <Button onClick={addThisToOrder} variant={inOrder ? "outline" : "secondary"} className="flex-1 h-11">
          {inOrder ? <><Check className="h-4 w-4 mr-1.5" /> En orden</> : <><ShoppingCart className="h-4 w-4 mr-1.5" /> A mi orden</>}
        </Button>
      </div>
    </div>
  );
}
