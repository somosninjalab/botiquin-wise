import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, follows: 0, meds: 0 });

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

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <h1 className="text-3xl font-bold flex items-center gap-2"><LayoutDashboard className="h-7 w-7 text-primary" /> Panel administrativo</h1>
      <p className="text-muted-foreground mt-1">Métricas del comparador.</p>

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
