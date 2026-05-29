import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Brain, Download, MessageCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/insights")({ component: InsightsPage });

type Signal = {
  id: string;
  conversation_id: string | null;
  signal_type: string;
  value: string;
  normalized_value: string | null;
  medication_id: string | null;
  city: string | null;
  region: string | null;
  created_at: string;
};

type Conv = {
  id: string;
  user_id: string | null;
  anon_token: string | null;
  city: string | null;
  region: string | null;
  entry_context: any;
  started_at: string;
  last_activity_at: string;
  message_count: number;
  ended_in_signup: boolean;
};

const RANGES = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function InsightsPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [medsById, setMedsById] = useState<Map<string, { name: string; slug: string }>>(new Map());
  const [search, setSearch] = useState("");
  const [openConv, setOpenConv] = useState<Conv | null>(null);
  const [convDetail, setConvDetail] = useState<{ messages: any[]; signals: Signal[] } | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/" });
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase
          .from("health_signals")
          .select("*")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase
          .from("chat_conversations")
          .select("*")
          .gte("started_at", since)
          .order("last_activity_at", { ascending: false })
          .limit(2000),
      ]);
      setSignals((s ?? []) as any);
      setConvs((c ?? []) as any);

      const medIds = Array.from(new Set((s ?? []).map((x: any) => x.medication_id).filter(Boolean)));
      if (medIds.length) {
        const { data: m } = await supabase
          .from("medications")
          .select("id, name, slug")
          .in("id", medIds as string[]);
        const map = new Map<string, { name: string; slug: string }>();
        (m ?? []).forEach((x: any) => map.set(x.id, { name: x.name, slug: x.slug }));
        setMedsById(map);
      } else {
        setMedsById(new Map());
      }
    })();
  }, [isAdmin, days]);

  const kpis = useMemo(() => {
    const total = convs.length;
    const withProfile = convs.filter(
      (c) => signals.some((s) => s.conversation_id === c.id && (s.signal_type === "condition" || s.signal_type === "demographic" || s.signal_type === "location")),
    ).length;
    const ended = convs.filter((c) => c.ended_in_signup).length;
    const totalMessages = convs.reduce((acc, c) => acc + (c.message_count || 0), 0);
    const avgMsgsPerSession = total ? Math.round((totalMessages / total) * 10) / 10 : 0;
    const uniqueUsers = new Set(convs.filter((c) => c.user_id).map((c) => c.user_id as string));
    const uniqueAnon = new Set(convs.filter((c) => !c.user_id && c.anon_token).map((c) => c.anon_token as string));
    const uniqueParticipants = uniqueUsers.size + uniqueAnon.size;
    const sessionsPerUser = uniqueParticipants ? Math.round((total / uniqueParticipants) * 10) / 10 : 0;
    return {
      conversations: total,
      signals: signals.length,
      withProfilePct: total ? Math.round((withProfile / total) * 100) : 0,
      endedPct: total ? Math.round((ended / total) * 100) : 0,
      totalMessages,
      avgMsgsPerSession,
      uniqueUsers: uniqueUsers.size,
      uniqueAnon: uniqueAnon.size,
      sessionsPerUser,
    };
  }, [signals, convs]);

  const byType = useMemo(() => aggregate(signals, (s) => s.signal_type), [signals]);
  const topConditions = useMemo(
    () => aggregate(signals.filter((s) => s.signal_type === "condition"), (s) => s.normalized_value || s.value).slice(0, 15),
    [signals],
  );
  const topMedsMentioned = useMemo(
    () => aggregate(signals.filter((s) => s.signal_type === "medication_mentioned" || s.signal_type === "medication_unknown"), (s) => s.normalized_value || s.value).slice(0, 15),
    [signals],
  );
  const gaps = useMemo(
    () => aggregate(signals.filter((s) => s.signal_type === "medication_unknown"), (s) => s.normalized_value || s.value).slice(0, 20),
    [signals],
  );
  const topCities = useMemo(
    () => aggregate(signals.filter((s) => s.city), (s) => `${s.city}${s.region ? `, ${s.region}` : ""}`).slice(0, 15),
    [signals],
  );

  const filteredConvs = useMemo(() => {
    if (!search.trim()) return convs;
    const q = search.toLowerCase();
    return convs.filter(
      (c) =>
        (c.city || "").toLowerCase().includes(q) ||
        (c.region || "").toLowerCase().includes(q) ||
        (c.user_id || "").toLowerCase().includes(q) ||
        (c.anon_token || "").toLowerCase().includes(q),
    );
  }, [convs, search]);

  async function openConversation(c: Conv) {
    setOpenConv(c);
    setConvDetail(null);
    const [{ data: msgs }, { data: sigs }] = await Promise.all([
      supabase.from("chat_messages").select("*").eq("conversation_id", c.id).order("created_at"),
      supabase.from("health_signals").select("*").eq("conversation_id", c.id).order("created_at"),
    ]);
    setConvDetail({ messages: msgs ?? [], signals: (sigs ?? []) as any });
  }

  function exportSignalsCSV() {
    const rows = signals.map((s) => ({
      created_at: s.created_at,
      signal_type: s.signal_type,
      value: s.value,
      normalized_value: s.normalized_value ?? "",
      medication: s.medication_id ? medsById.get(s.medication_id)?.name ?? s.medication_id : "",
      city: s.city ?? "",
      region: s.region ?? "",
      conversation_id: s.conversation_id ?? "",
    }));
    downloadCSV(`signals_${days}d.csv`, rows);
  }

  function exportConversationsCSV() {
    const sigsByConv = new Map<string, Signal[]>();
    signals.forEach((s) => {
      if (!s.conversation_id) return;
      const arr = sigsByConv.get(s.conversation_id) ?? [];
      arr.push(s);
      sigsByConv.set(s.conversation_id, arr);
    });
    const rows = convs.map((c) => {
      const cs = sigsByConv.get(c.id) ?? [];
      const pick = (t: string) =>
        Array.from(new Set(cs.filter((x) => x.signal_type === t).map((x) => x.normalized_value || x.value))).join(" | ");
      return {
        started_at: c.started_at,
        last_activity_at: c.last_activity_at,
        messages: c.message_count,
        anonymous: c.user_id ? "no" : "sí",
        registered_after: c.ended_in_signup ? "sí" : "no",
        city: c.city ?? "",
        region: c.region ?? "",
        conditions: pick("condition"),
        medications: pick("medication_mentioned"),
        not_in_catalog: pick("medication_unknown"),
        symptoms: pick("symptom"),
        price_concerns: pick("price_concern"),
      };
    });
    downloadCSV(`conversations_${days}d.csv`, rows);
  }

  function exportGapsCSV() {
    downloadCSV(`catalog_gaps_${days}d.csv`, gaps.map((g) => ({ medicine: g.name, mentions: g.value })));
  }

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" /> Insights conversacionales
          </h1>
          <p className="text-muted-foreground mt-1">
            Datos capturados por el asistente. Mercado farmacéutico y de salud, Venezuela.
          </p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button key={r.days} size="sm" variant={days === r.days ? "default" : "outline"} onClick={() => setDays(r.days)}>
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="Conversaciones" value={kpis.conversations} />
        <Stat label="Señales capturadas" value={kpis.signals} />
        <Stat label="% con perfil" value={`${kpis.withProfilePct}%`} />
        <Stat label="% que terminó en registro" value={`${kpis.endedPct}%`} />
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mt-4">
        <Stat label="Mensajes totales" value={kpis.totalMessages} />
        <Stat label="Mensajes / sesión" value={kpis.avgMsgsPerSession} />
        <Stat label="Sesiones / usuario" value={kpis.sessionsPerUser} />
        <Stat label="Usuarios únicos" value={`${kpis.uniqueUsers} reg · ${kpis.uniqueAnon} anon`} />
      </div>

      <div className="flex flex-wrap gap-2 mt-6">
        <Button size="sm" variant="outline" className="gap-2" onClick={exportSignalsCSV}>
          <Download className="h-4 w-4" /> Señales CSV
        </Button>
        <Button size="sm" variant="outline" className="gap-2" onClick={exportConversationsCSV}>
          <Download className="h-4 w-4" /> Conversaciones CSV
        </Button>
        <Button size="sm" variant="outline" className="gap-2" onClick={exportGapsCSV}>
          <Download className="h-4 w-4" /> Brechas de catálogo CSV
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <ListCard title="Señales por tipo" data={byType} />
        <ListCard title="Top condiciones declaradas" data={topConditions} />
        <ListCard title="Top medicinas mencionadas" data={topMedsMentioned} />
        <ListCard title="Brechas de catálogo (no encontradas)" data={gaps} />
        <ListCard title="Top ciudades (en señales)" data={topCities} />
      </div>

      <Card className="p-5 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Conversaciones recientes
            </h3>
            <p className="text-xs text-muted-foreground">Click para ver transcripción y señales extraídas.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 w-64"
              placeholder="Filtrar por ciudad / id"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-2">Inicio</th>
                <th className="py-2 pr-2">Quién</th>
                <th className="py-2 pr-2">Ciudad</th>
                <th className="py-2 pr-2">Mensajes</th>
                <th className="py-2 pr-2">Registro</th>
              </tr>
            </thead>
            <tbody>
              {filteredConvs.slice(0, 100).map((c) => (
                <tr key={c.id} className="border-b cursor-pointer hover:bg-muted/40" onClick={() => openConversation(c)}>
                  <td className="py-2 pr-2">{new Date(c.started_at).toLocaleString()}</td>
                  <td className="py-2 pr-2">
                    {c.user_id ? <Badge variant="default">user</Badge> : <Badge variant="secondary">anon</Badge>}
                  </td>
                  <td className="py-2 pr-2">{c.city ? `${c.city}${c.region ? `, ${c.region}` : ""}` : <span className="text-muted-foreground">—</span>}</td>
                  <td className="py-2 pr-2">{c.message_count}</td>
                  <td className="py-2 pr-2">{c.ended_in_signup ? <Badge>✓</Badge> : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
              {filteredConvs.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Sin conversaciones en este período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!openConv} onOpenChange={(o) => !o && setOpenConv(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conversación · {openConv && new Date(openConv.started_at).toLocaleString()}</DialogTitle>
          </DialogHeader>
          {!convDetail ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <div className="space-y-4">
              {convDetail.signals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Señales extraídas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {convDetail.signals.map((s) => (
                      <Badge key={s.id} variant="outline" className="text-xs">
                        {s.signal_type}: {s.normalized_value || s.value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Transcripción</p>
                <div className="space-y-2">
                  {convDetail.messages.map((m) => (
                    <div key={m.id} className={`rounded-lg p-2.5 text-sm ${m.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{m.role}</p>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="mt-6">
        <Link to="/admin" className="text-sm text-muted-foreground hover:underline">← Volver al panel</Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </Card>
  );
}

function ListCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <ul className="space-y-1.5">
          {data.map((r) => (
            <li key={r.name} className="flex items-center justify-between text-sm gap-2">
              <span className="truncate">{r.name}</span>
              <Badge variant="secondary">{r.value}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function aggregate<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const k = key(r);
    if (!k) return;
    m.set(k, (m.get(k) ?? 0) + 1);
  });
  return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (rows.length === 0) {
    const blob = new Blob(["(sin datos)\n"], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, filename);
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  triggerDownload(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}