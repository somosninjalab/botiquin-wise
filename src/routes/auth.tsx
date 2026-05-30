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
  accept_terms: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar los Términos y Condiciones" }),
  }),
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
    accept_terms: true,
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
      setLoading(false);
      toast.error(result.error.message || "Error al iniciar sesión con Google");
      return;
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
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">o</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.33v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.11z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continuar con Google
              </Button>
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
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={up.accept_terms}
                  onChange={(e) => setUp({ ...up, accept_terms: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                />
                <span>
                  Acepto los{" "}
                  <Link to="/legal" hash="terminos" target="_blank" className="text-primary hover:underline font-medium">
                    Términos y Condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link to="/legal" hash="privacidad" target="_blank" className="text-primary hover:underline font-medium">
                    Política de Privacidad
                  </Link>{" "}
                  de ¡Alerta: Medicina!
                </span>
              </label>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">Crear cuenta</Button>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">o</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.33v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.11z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continuar con Google
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
