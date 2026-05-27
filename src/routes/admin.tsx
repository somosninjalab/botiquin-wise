import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { LayoutDashboard, Download, RefreshCw, LineChart as LineChartIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeatmapCard } from "@/components/admin/HeatmapCard";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, follows: 0, meds: 0 });
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null);
  const [scrapeStats, setScrapeStats] = useState<Array<{ slug: string; name: string; attempted: number; inserted: number; failed: number }> | null>(null);
  const [topMeds, setTopMeds] = useState<Array<{ id: string; name: string; active_ingredient: string; slug: string; hits: number }>>([]);
  const [topMedsDays, setTopMedsDays] = useState<number>(30);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate({ to: "/" });
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [{ data: ev }, { data: pr }, { count: u }, { count: f }, { count: m }] = await Promise.all([
        supabase.from("search_events").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("city, region, country, sex").limit(5000),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("medication_followers").select("*", { count: "exact", head: true }),
        supabase.from("medications").select("*", { count: "exact", head: true }),
      ]);
      setEvents(ev ?? []);
      setProfiles(pr ?? []);
      setStats({ users: u ?? 0, follows: f ?? 0, meds: m ?? 0 });
    })();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const since = new Date(Date.now() - topMedsDays * 24 * 60 * 60 * 1000).toISOString();
      const { data: rows } = await supabase
        .from("search_events")
        .select("medication_id")
        .not("medication_id", "is", null)
        .gte("created_at", since)
        .limit(20000);
      const counts = new Map<string, number>();
      (rows ?? []).forEach((r: any) => counts.set(r.medication_id, (counts.get(r.medication_id) ?? 0) + 1));
      const ids = Array.from(counts.keys());
      if (ids.length === 0) { setTopMeds([]); return; }
      const { data: meds } = await supabase
        .from("medications")
        .select("id, name, active_ingredient, slug")
        .in("id", ids);
      const list = (meds ?? []).map((m: any) => ({
        id: m.id, name: m.name, active_ingredient: m.active_ingredient, slug: m.slug,
        hits: counts.get(m.id) ?? 0,
      })).sort((a, b) => b.hits - a.hits).slice(0, 30);
      setTopMeds(list);
    })();
  }, [isAdmin, topMedsDays]);

  const byQuery = aggregate(events, (e) => e.query || "(detalle)").slice(0, 10);
  const byRegion = aggregate(events, (e) => e.region || e.country || "Desconocida").slice(0, 10);
  const byCategory = aggregate(events, (e) => e.category || "Sin categoría").slice(0, 10);
  const byCity = aggregate(
    events.filter((e) => e.city),
    (e) => `${e.city}${e.region ? `, ${e.region}` : ""}`,
  ).slice(0, 10);
  const failedSearches = aggregate(
    events.filter((e) => e.query && (e.result_count === 0 || e.result_count === null)),
    (e) => e.query as string,
  ).slice(0, 15);

  const usersByCity = aggregate(
    profiles.filter((p) => p.city),
    (p) => `${p.city}${p.region ? `, ${p.region}` : ""}`,
  ).slice(0, 10);
  const usersBySex = aggregate(profiles, (p) => {
    const s = (p.sex || "").toLowerCase();
    if (s === "f" || s === "female" || s === "femenino" || s === "mujer") return "Femenino";
    if (s === "m" || s === "male" || s === "masculino" || s === "hombre") return "Masculino";
    if (s) return "Otro";
    return "No especificado";
  });
  const usersByCountry = aggregate(
    profiles.filter((p) => p.country),
    (p) => p.country as string,
  ).slice(0, 10);

  const searchesHeatPoints = aggregate(
    events.filter((e) => e.city),
    (e) => e.city as string,
  ).map((r) => ({ city: r.name, weight: r.value }));
  const usersHeatPoints = aggregate(
    profiles.filter((p) => p.city),
    (p) => p.city as string,
  ).map((r) => ({ city: r.name, weight: r.value }));

  if (!isAdmin) return null;

  async function exportXlsx() {
    const [{ data: profiles }, { data: roles }, { data: followers }, { data: searches }, { data: meds }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("medication_followers").select("id, user_id, threshold_pct, created_at, medications(name, active_ingredient, slug, category)"),
      supabase.from("search_events").select("*").order("created_at", { ascending: false }).limit(5000),
      supabase.from("medications").select("id, name, active_ingredient, category"),
    ]);

    const rolesByUser = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });

    const followsByUser = new Map<string, string[]>();
    (followers ?? []).forEach((f: any) => {
      const label = f.medications ? `${f.medications.name} (${f.medications.active_ingredient})` : f.medication_id;
      const arr = followsByUser.get(f.user_id) ?? [];
      arr.push(label);
      followsByUser.set(f.user_id, arr);
    });

    const searchesByUser = new Map<string, string[]>();
    (searches ?? []).forEach((s: any) => {
      if (!s.user_id) return;
      const label = s.query || "(detalle medicamento)";
      const arr = searchesByUser.get(s.user_id) ?? [];
      arr.push(label);
      searchesByUser.set(s.user_id, arr);
    });

    const usersSheet = (profiles ?? []).map((p: any) => ({
      "Nombre": p.full_name ?? "",
      "Email": p.email ?? "",
      "Teléfono": p.phone ?? "",
      "Ciudad": p.city ?? "",
      "Región": p.region ?? "",
      "País": p.country ?? "",
      "IP registro": p.ip_first_seen ?? "",
      "Resumen semanal": p.weekly_digest ? "Sí" : "No",
      "Alertas inmediatas": p.instant_alerts ? "Sí" : "No",
      "Roles": (rolesByUser.get(p.user_id) ?? ["user"]).join(", "),
      "Medicamentos seguidos": (followsByUser.get(p.user_id) ?? []).join(" | "),
      "Búsquedas realizadas": (searchesByUser.get(p.user_id) ?? []).slice(0, 50).join(" | "),
      "Total búsquedas": (searchesByUser.get(p.user_id) ?? []).length,
      "Registrado": p.created_at,
    }));

    const followsSheet = (followers ?? []).map((f: any) => ({
      "Usuario ID": f.user_id,
      "Medicamento": f.medications?.name ?? "",
      "Principio activo": f.medications?.active_ingredient ?? "",
      "Categoría": f.medications?.category ?? "",
      "Umbral %": f.threshold_pct,
      "Desde": f.created_at,
    }));

    const searchesSheet = (searches ?? []).map((s: any) => ({
      "Fecha": s.created_at,
      "Búsqueda": s.query ?? "",
      "Categoría": s.category ?? "",
      "Ciudad": s.city ?? "",
      "Región": s.region ?? "",
      "País": s.country ?? "",
      "Usuario ID": s.user_id ?? "(anónimo)",
      "Medicamento ID": s.medication_id ?? "",
    }));

    // Aggregate by city across all searches
    const cityMap = new Map<string, { city: string; region: string; country: string; total: number; users: Set<string>; queries: Map<string, number> }>();
    (searches ?? []).forEach((s: any) => {
      if (!s.city) return;
      const key = `${s.city}|${s.region ?? ""}|${s.country ?? ""}`;
      const entry = cityMap.get(key) ?? { city: s.city, region: s.region ?? "", country: s.country ?? "", total: 0, users: new Set<string>(), queries: new Map<string, number>() };
      entry.total += 1;
      if (s.user_id) entry.users.add(s.user_id);
      const q = s.query || "(detalle)";
      entry.queries.set(q, (entry.queries.get(q) ?? 0) + 1);
      cityMap.set(key, entry);
    });
    const citiesSheet = Array.from(cityMap.values())
      .sort((a, b) => b.total - a.total)
      .map((c) => ({
        "Ciudad": c.city,
        "Región": c.region,
        "País": c.country,
        "Total búsquedas": c.total,
        "Usuarios únicos": c.users.size,
        "Top búsquedas": Array.from(c.queries.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([q, n]) => `${q} (${n})`)
          .join(" | "),
      }));

    const medsSheet = (meds ?? []).map((m: any) => ({
      "Medicamento": m.name,
      "Principio activo": m.active_ingredient,
      "Categoría": m.category ?? "",
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersSheet), "Usuarios");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(followsSheet), "Seguimientos");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(searchesSheet), "Búsquedas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(citiesSheet), "Por ciudad");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(medsSheet), "Catálogo");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `alerta-medicina-registros-${stamp}.xlsx`);
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><LayoutDashboard className="h-7 w-7 text-primary" /> Panel administrativo</h1>
          <p className="text-muted-foreground mt-1">Métricas del comparador.</p>
        </div>
        <Button onClick={exportXlsx} className="gap-2">
          <Download className="h-4 w-4" /> Exportar registros (.xlsx)
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/admin/precios">
            <LineChartIcon className="h-4 w-4" /> Evolución de precios (20 días)
          </Link>
        </Button>
        <Button
          variant="secondary"
          disabled={scraping}
          onClick={async () => {
            setScraping(true);
            setScrapeMsg(null);
            try {
              const r = await fetch("/api/public/hooks/scrape-prices?limit=10", { method: "POST" });
              const j = await r.json();
              setScrapeMsg(j.ok ? `✓ ${j.inserted}/${j.attempted} precios actualizados` : `Error: ${j.error || "desconocido"}`);
              setScrapeStats(j.byPharmacy ?? null);
            } catch (e: any) {
              setScrapeMsg(`Error: ${e.message}`);
            } finally {
              setScraping(false);
            }
          }}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${scraping ? "animate-spin" : ""}`} /> {scraping ? "Actualizando precios…" : "Actualizar precios ahora"}
        </Button>
      </div>
      {scrapeMsg && <p className="text-sm text-muted-foreground mt-2">{scrapeMsg}</p>}
      {scrapeStats && (
        <Card className="p-4 mt-3">
          <h3 className="font-semibold mb-2 text-sm">Resultados por farmacia</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {scrapeStats.map((s) => {
              const ok = s.inserted > 0;
              return (
                <div key={s.slug} className={`rounded-md border p-2 text-sm ${ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.inserted}/{s.attempted} ok · {s.failed} fallidas
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <Stat label="Usuarios registrados" value={stats.users} />
        <Stat label="Medicamentos seguidos" value={stats.follows} />
        <Stat label="Medicamentos en catálogo" value={stats.meds} />
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">Mapas de calor</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <HeatmapCard
          title="Búsquedas por ciudad"
          subtitle="Intensidad según cantidad de búsquedas registradas"
          points={searchesHeatPoints}
        />
        <HeatmapCard
          title="Usuarios registrados por ciudad"
          subtitle="Intensidad según cantidad de perfiles"
          points={usersHeatPoints}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <ChartCard title="Top búsquedas" data={byQuery} />
        <ChartCard title="Top regiones" data={byRegion} />
        <ChartCard title="Top ciudades" data={byCity} />
        <ChartCard title="Top categorías / especialidades" data={byCategory} />
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">Distribución de usuarios registrados</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Usuarios por ciudad" data={usersByCity} />
        <ChartCard title="Usuarios por sexo" data={usersBySex} />
        <ChartCard title="Usuarios por país" data={usersByCountry} />
      </div>

      {failedSearches.length > 0 && (
        <Card className="p-5 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold">Búsquedas sin resultados</h3>
              <p className="text-xs text-muted-foreground">
                Términos que los usuarios buscaron y no encontramos. Considera agregarlos al catálogo o como alias.
              </p>
            </div>
            <Badge variant="secondary">{failedSearches.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {failedSearches.map((f) => (
              <span
                key={f.name}
                className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-sm"
              >
                <span className="font-medium">{f.name}</span>
                <span className="text-xs text-muted-foreground">×{f.value}</span>
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function aggregate<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1));
  return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold mt-1 text-primary">{value}</div>
    </Card>
  );
}

function ChartCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="oklch(0.62 0.16 165)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
