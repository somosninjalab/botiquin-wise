import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({ component: AuthPage });

const signUpSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  password: z.string().min(8).max(100),
  sex: z.enum(["femenino", "masculino", "otro", "prefiero_no_decir"], {
    errorMap: () => ({ message: "Selecciona tu sexo" }),
  }),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de nacimiento inválida")
    .refine((v) => {
      const d = new Date(v);
      const now = new Date();
      const min = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
      return d <= now && d >= min;
    }, "Fecha de nacimiento fuera de rango"),
});
const signInSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(100),
});

export default function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const target = typeof window !== "undefined" ? sessionStorage.getItem("redirectAfterAuth") : null;
    if (target) {
      sessionStorage.removeItem("redirectAfterAuth");
      navigate({ to: target });
    } else {
      navigate({ to: "/mis-alertas" });
    }
  }, [user, navigate]);

  const [loading, setLoading] = useState(false);

  const [up, setUp] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    sex: "" as "" | "femenino" | "masculino" | "otro" | "prefiero_no_decir",
    birth_date: "",
  });
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
        sex: parsed.data.sex,
        birth_date: parsed.data.birth_date,
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || "Error al iniciar sesión con Google");
    }
    if (result.redirected) {
      return;
    }
    setLoading(false);
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
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">Entrar</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-3">
              <div><Label>Nombre completo</Label><Input value={up.full_name} onChange={(e) => setUp({ ...up, full_name: e.target.value })} maxLength={100} required /></div>
              <div><Label>Email</Label><Input type="email" value={up.email} onChange={(e) => setUp({ ...up, email: e.target.value })} maxLength={255} required /></div>
              <div><Label>Teléfono (opcional)</Label><Input value={up.phone} onChange={(e) => setUp({ ...up, phone: e.target.value })} maxLength={30} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="su-sex">Sexo</Label>
                  <select
                    id="su-sex"
                    value={up.sex}
                    onChange={(e) => setUp({ ...up, sex: e.target.value as typeof up.sex })}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="" disabled>Selecciona…</option>
                    <option value="femenino">Femenino</option>
                    <option value="masculino">Masculino</option>
                    <option value="otro">Otro</option>
                    <option value="prefiero_no_decir">Prefiero no decir</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="su-dob">Fecha de nacimiento</Label>
                  <Input
                    id="su-dob"
                    type="date"
                    value={up.birth_date}
                    onChange={(e) => setUp({ ...up, birth_date: e.target.value })}
                    max={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
              </div>
              <div><Label>Contraseña (mín. 8)</Label><Input type="password" value={up.password} onChange={(e) => setUp({ ...up, password: e.target.value })} minLength={8} maxLength={100} required /></div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">Crear cuenta</Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
