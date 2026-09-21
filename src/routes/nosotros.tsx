import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lock, Printer, MapPin, Activity, Search, MessageCircle, Users, Pill, TrendingUp } from "lucide-react";
import { getPartnerStats, type PartnerStats } from "@/lib/deck/partner-stats.functions";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  LabelList,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CHART_PRIMARY = "hsl(var(--primary))";
const CHART_ACCENT = "hsl(var(--accent))";
const CHART_MUTED = "hsl(var(--muted-foreground))";
const DONUT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--accent) / 0.55)",
  "hsl(var(--muted-foreground) / 0.6)",
];

export const Route = createFileRoute("/nosotros")({
  head: () => ({
    meta: [
      { title: "Nosotros · ¡Alerta: Medicina! (privado)" },
      { name: "description", content: "Presentación privada de resultados de ¡Alerta: Medicina! para aliados estratégicos." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Nosotros · ¡Alerta: Medicina!" },
      { property: "og:description", content: "Presentación privada para aliados estratégicos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NosotrosPage,
});

const fmt = (n: number) => new Intl.NumberFormat("es-VE").format(n);

function NosotrosPage() {
  const fetchStats = useServerFn(getPartnerStats);
  const [passcode, setPasscode] = useState("");
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStats({ data: { passcode } });
      setStats(data);
    } catch (err: any) {
      setError(err?.message?.includes("Clave") ? "Clave incorrecta." : "No se pudieron cargar las cifras.");
    } finally {
      setLoading(false);
    }
  }

  if (!stats) {
    return (
      <div className="container mx-auto flex min-h-[70vh] max-w-md items-center px-4">
        <Card className="w-full p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Presentación privada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta página es solo para aliados. Ingresa la clave de acceso.
          </p>
          <form onSubmit={unlock} className="mt-6 space-y-3">
            <Input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Clave de acceso"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !passcode}>
              {loading ? "Verificando…" : "Entrar"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const t = stats.traffic;
  const dailyData = t.dailySearches.map((d) => ({ day: d.date.slice(5).split("-").reverse().join("/"), count: d.count }));
  const cityData = stats.cities.slice(0, 8).map((c) => ({ name: c.name, count: c.count }));
  const pathologyData = stats.pathologies.slice(0, 5).map((p) => ({ name: p.category, value: p.hits, chronic: p.chronic }));
  const otherHits = stats.pathologies.slice(5).reduce((sum, p) => sum + p.hits, 0);
  if (otherHits > 0) pathologyData.push({ name: "Otras", value: otherHits, chronic: false });

  return (
    <div className="deck mx-auto max-w-5xl px-4 py-10 print:py-0">
      <div className="mb-8 flex items-center justify-between gap-3 print:hidden">
        <Badge variant="secondary">Documento privado · últimos {stats.days} días</Badge>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Guardar en PDF
        </Button>
      </div>

      {/* Portada */}
      <section className="mb-14 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">¡Alerta: Medicina!</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">
          La primera plataforma de Venezuela para comparar precios de medicinas
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Conectamos a quien necesita una medicina con la farmacia que la tiene al mejor precio, gratis y en segundos.
        </p>
      </section>

      {/* Tráfico */}
      <Section icon={<Users className="h-5 w-5" />} title={`Actividad de los últimos ${stats.days} días`}>
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Consultas de precios" value={fmt(t.searches)} />
          <Stat label="Personas distintas" value={fmt(t.uniqueVisitors)} />
          <Stat label="Nuevos registrados" value={fmt(t.newUsers)} />
          <Stat label="Registrados en total" value={fmt(t.totalUsers)} />
        </div>
        {t.dailySearches.length > 1 && (
          <Card className="mt-6 p-4 print:p-2">
            <div className="h-56 w-full print:h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 10, right: 12, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="consultasGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: CHART_MUTED }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: CHART_MUTED }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [fmt(value), "Consultas"]}
                    labelFormatter={(label: string) => `Día ${label}`}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={CHART_PRIMARY}
                    strokeWidth={2.5}
                    fill="url(#consultasGrad)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Consultas de precios por día.
            </p>
          </Card>
        )}
      </Section>

      {/* Consultas y conversaciones */}
      <Section icon={<MessageCircle className="h-5 w-5" />} title="Conversación con la gente">
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Conversaciones con el asistente" value={fmt(t.conversations)} />
          <Stat label="Mensajes intercambiados" value={fmt(t.chatMessages)} />
          <Stat label="Comparticiones por WhatsApp" value={fmt(t.whatsappShares)} />
          <Stat label="Ahorro estimado" value={`$${fmt(t.savingsUsd)}`} />
        </div>
      </Section>

      {/* Ciudades */}
      <Section icon={<MapPin className="h-5 w-5" />} title="Desde dónde nos consultan">
        {cityData.length > 0 && (
          <Card className="mb-6 p-4 print:p-2">
            <div className="h-64 w-full print:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityData} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 12, fill: CHART_MUTED }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [fmt(value), "Consultas"]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill={CHART_ACCENT} radius={[0, 8, 8, 0]} barSize={18}>
                    <LabelList dataKey="count" position="right" formatter={(v: number) => fmt(v)} style={{ fontSize: 12, fill: CHART_MUTED }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Ciudades con más consultas en el período.</p>
          </Card>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          <RankList title="Ciudades" rows={stats.cities.map((c) => ({ label: c.name, value: c.count }))} />
          <RankList title="Estados / regiones" rows={stats.regions.map((r) => ({ label: r.name, value: r.count }))} />
        </div>
      </Section>

      {/* Patologías */}
      <Section icon={<Activity className="h-5 w-5" />} title="Patologías identificadas">
        <p className="mb-4 text-sm text-muted-foreground">
          Inferidas de la categoría terapéutica de las medicinas buscadas. Las crónicas aparecen primero.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {stats.pathologies.map((p) => (
            <div key={p.category} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <span className="flex items-center gap-2 truncate font-medium">
                {p.category}
                {p.chronic && <Badge variant="secondary" className="text-[10px]">crónica</Badge>}
              </span>
              <Badge>{fmt(p.hits)}</Badge>
            </div>
          ))}
          {stats.pathologies.length === 0 && <p className="text-sm text-muted-foreground">Sin datos en el período.</p>}
        </div>
      </Section>

      {/* Medicinas */}
      <Section icon={<Pill className="h-5 w-5" />} title="Medicinas más solicitadas">
        <div className="grid gap-6 md:grid-cols-2">
          <RankList
            title="Del catálogo"
            rows={stats.topMedications.map((m) => ({ label: m.name, value: m.hits }))}
          />
          <RankList
            title="Búsquedas escritas"
            rows={stats.topQueries.map((q) => ({ label: q.name, value: q.count }))}
          />
        </div>
      </Section>

      {/* Cierre */}
      <Section icon={<Search className="h-5 w-5" />} title="Conversemos una alianza">
        <p className="text-muted-foreground">
          Podemos trabajar visibilidad de marca, datos de demanda por ciudad y categoría, y campañas dirigidas a
          pacientes que ya están buscando tus productos.
        </p>
        <p className="mt-3 font-medium">
          Escríbenos a <a className="text-primary underline" href="mailto:somosninjalab@gmail.com">somosninjalab@gmail.com</a> o por
          el formulario de <a className="text-primary underline" href="/contacto">Contáctanos</a>.
        </p>
      </Section>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Cifras generadas el {new Date(stats.generatedAt).toLocaleString("es-VE")} · Documento confidencial.
      </p>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14 break-inside-avoid">
      <h2 className="mb-5 flex items-center gap-2 text-2xl font-bold">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5 break-inside-avoid overflow-hidden">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-extrabold whitespace-nowrap print:text-xl print:leading-tight">{value}</p>
    </Card>
  );
}

function RankList({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="p-5 break-inside-avoid">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate capitalize">{r.label}</span>
                <span className="font-semibold">{fmt(r.value)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
