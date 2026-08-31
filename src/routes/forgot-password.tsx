import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "Recuperar contraseña — ¡Alerta: Medicina!" },
      { name: "description", content: "Solicita un enlace para restablecer tu contraseña de ¡Alerta: Medicina! y recupera el acceso a tu cuenta." },
      { property: "og:title", content: "Recuperar contraseña — ¡Alerta: Medicina!" },
      { property: "og:description", content: "Solicita un enlace para restablecer tu contraseña de ¡Alerta: Medicina!." },
      { property: "og:url", content: "https://alertamedicina.com/forgot-password" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Recuperar contraseña — ¡Alerta: Medicina!" },
      { name: "twitter:description", content: "Solicita un enlace para restablecer tu contraseña de ¡Alerta: Medicina!." },
    ],
    links: [{ rel: "canonical", href: "https://alertamedicina.com/forgot-password" }],
  }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Ingresa tu email");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Revisa tu correo para el enlace de recuperación");
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-center">Recuperar contraseña</h1>
        <p className="text-center text-sm text-muted-foreground mt-1">
          Te enviaremos un enlace para restablecer tu contraseña
        </p>

        {sent ? (
          <div className="mt-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Si el email existe en nuestra base de datos, recibirás un enlace de recuperación.
            </p>
            <Link
              to="/auth"
              className="inline-block text-sm text-primary hover:underline"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                maxLength={255}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
            >
              {loading ? "Enviando..." : "Enviar enlace"}
            </Button>
            <div className="text-center">
              <Link
                to="/auth"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ¿Recordaste tu contraseña? Entrar
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
