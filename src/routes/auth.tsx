import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({ component: AuthPage });

const signUpSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  password: z.string().min(8).max(100),
});
const signInSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(100),
});

export default function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  useEffect(() => { if (user) navigate({ to: "/mis-alertas" }); }, [user, navigate]);

  const [loading, setLoading] = useState(false);

  const [up, setUp] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [si, setSi] = useState({ email: "", password: "" });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(up);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.full_name },
      },
    });
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (data.user) {
      // Update profile with phone (and let server-side enrich location later)
      await supabase.from("profiles").update({
        full_name: parsed.data.full_name,
        phone: parsed.data.phone || null,
      }).eq("user_id", data.user.id);
      // Capture IP-derived location
      try {
        const r = await fetch("https://ipapi.co/json/");
        if (r.ok) {
          const j = await r.json();
          await supabase.from("profiles").update({
            city: j.city, region: j.region, country: j.country_name, ip_first_seen: j.ip,
          }).eq("user_id", data.user.id);
        }
      } catch {}
      toast.success("¡Bienvenido! Revisa tu correo si necesitas confirmar.");
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(si);
    if (!parsed.success) { toast.error("Email o contraseña inválidos"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Sesión iniciada");
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-center">Tu cuenta</h1>
        <p className="text-center text-sm text-muted-foreground mt-1">Accede para recibir alertas de bajadas de precio</p>
        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Registro</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-3">
              <div><Label>Email</Label><Input type="email" value={si.email} onChange={(e) => setSi({ ...si, email: e.target.value })} maxLength={255} required /></div>
              <div><Label>Contraseña</Label><Input type="password" value={si.password} onChange={(e) => setSi({ ...si, password: e.target.value })} maxLength={100} required /></div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">Entrar</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-3">
              <div><Label>Nombre completo</Label><Input value={up.full_name} onChange={(e) => setUp({ ...up, full_name: e.target.value })} maxLength={100} required /></div>
              <div><Label>Email</Label><Input type="email" value={up.email} onChange={(e) => setUp({ ...up, email: e.target.value })} maxLength={255} required /></div>
              <div><Label>Teléfono (opcional)</Label><Input value={up.phone} onChange={(e) => setUp({ ...up, phone: e.target.value })} maxLength={30} /></div>
              <div><Label>Contraseña (mín. 8)</Label><Input type="password" value={up.password} onChange={(e) => setUp({ ...up, password: e.target.value })} minLength={8} maxLength={100} required /></div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">Crear cuenta</Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
