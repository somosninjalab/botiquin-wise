import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bell, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/mis-alertas")({
  component: MisAlertasPage,
  head: () => ({
    meta: [
      { title: "Mis alertas de precio — ¡Alerta: Medicina!" },
      {
        name: "description",
        content:
          "Gestiona los medicamentos que sigues y las alertas por email que recibes cuando bajan de precio.",
      },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Mis alertas de precio — ¡Alerta: Medicina!" },
      { property: "og:description", content: "Gestiona tus alertas de precio de medicamentos." },
      { property: "og:url", content: "https://alertamedicina.com/mis-alertas" },
    ],
  }),
});

function MisAlertasPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [followed, setFollowed] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("medication_followers")
        .select("id, threshold_pct, medications(id, slug, name, active_ingredient)")
        .eq("user_id", user.id);
      setFollowed(data ?? []);
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      setProfile(p);
    })();
  }, [user]);

  const updatePref = async (field: "weekly_digest" | "instant_alerts", val: boolean) => {
    if (!user) return;
    const patch = field === "weekly_digest" ? { weekly_digest: val } : { instant_alerts: val };
    await supabase.from("profiles").update(patch).eq("user_id", user.id);
    setProfile({ ...profile, [field]: val });
    toast.success("Preferencia actualizada");
  };

  const removeFollow = async (id: string) => {
    await supabase.from("medication_followers").delete().eq("id", id);
    setFollowed(followed.filter((f) => f.id !== id));
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="text-3xl font-bold flex items-center gap-2"><Bell className="h-7 w-7 text-primary" /> Mis alertas</h1>
      <p className="text-muted-foreground mt-1">Gestiona los medicamentos que sigues y tus preferencias de notificación.</p>

      {profile && (
        <Card className="p-6 mt-6">
          <h2 className="font-semibold mb-4">Preferencias</h2>
          <div className="flex items-center justify-between py-2">
            <Label>Alertas inmediatas cuando baje un precio</Label>
            <Switch checked={!!profile.instant_alerts} onCheckedChange={(v) => updatePref("instant_alerts", v)} />
          </div>
          <div className="flex items-center justify-between py-2">
            <Label>Resumen semanal por email</Label>
            <Switch checked={!!profile.weekly_digest} onCheckedChange={(v) => updatePref("weekly_digest", v)} />
          </div>
        </Card>
      )}

      <Card className="p-6 mt-6">
        <h2 className="font-semibold mb-4">Medicamentos seguidos ({followed.length})</h2>
        {followed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no sigues ningún medicamento. <Link to="/buscar" search={{ q: "" }} className="text-primary hover:underline">Buscar ahora</Link>.</p>
        ) : (
          <ul className="divide-y divide-border">
            {followed.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-3">
                <Link to="/medicamento/$slug" params={{ slug: f.medications.slug }} className="hover:underline">
                  <div className="font-medium">{f.medications.name}</div>
                  <div className="text-xs text-muted-foreground">{f.medications.active_ingredient}</div>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => removeFollow(f.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
