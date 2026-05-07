import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { LayoutDashboard, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, follows: 0, meds: 0 });
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null);
  const [scrapeStats, setScrapeStats] = useState<Array<{ slug: string; name: string; attempted: number; inserted: number; failed: number }> | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate({ to: "/" });
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [{ data: ev }, { count: u }, { count: f }, { count: m }] = await Promise.all([
        supabase.from("search_events").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("medication_followers").select("*", { count: "exact", head: true }),
        supabase.from("medications").select("*", { count: "exact", head: true }),
      ]);
      setEvents(ev ?? []);
      setStats({ users: u ?? 0, follows: f ?? 0, meds: m ?? 0 });
    })();
  }, [isAdmin]);

  const byQuery = aggregate(events, (e) => e.query || "(detalle)").slice(0, 10);
  const byRegion = aggregate(events, (e) => e.region || e.country || "Desconocida").slice(0, 10);
  const byCategory = aggregate(events, (e) => e.category || "Sin categoría").slice(0, 10);
  const failedSearches = aggregate(
    events.filter((e) => e.query && (e.result_count === 0 || e.result_count === null)),
    (e) => e.query as string,
  ).slice(0, 15);

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

    const medsSheet = (meds ?? []).map((m: any) => ({
      "Medicamento": m.name,
      "Principio activo": m.active_ingredient,
      "Categoría": m.category ?? "",
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersSheet), "Usuarios");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(followsSheet), "Seguimientos");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(searchesSheet), "Búsquedas");
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

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <ChartCard title="Top búsquedas" data={byQuery} />
        <ChartCard title="Top regiones" data={byRegion} />
        <ChartCard title="Top categorías / especialidades" data={byCategory} />
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
