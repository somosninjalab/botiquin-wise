import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hashChecked, setHashChecked] = useState(false);
  const [validHash, setValidHash] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery") || hash.includes("access_token");
    setHashChecked(true);
    setValidHash(isRecovery);
    if (!isRecovery) {
      toast.error("Enlace inválido o expirado");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("Contraseña actualizada correctamente");
    setTimeout(() => {
      navigate({ to: "/auth" });
    }, 2000);
  };

  if (!hashChecked) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Verificando enlace...</p>
        </Card>
      </div>
    );
  }

  if (!validHash) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card className="p-6 text-center space-y-4">
          <h1 className="text-2xl font-bold">Enlace inválido</h1>
          <p className="text-sm text-muted-foreground">
            El enlace de recuperación es inválido o ha expirado.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block text-primary hover:underline"
          >
            Solicitar nuevo enlace
          </Link>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card className="p-6 text-center space-y-4">
          <h1 className="text-2xl font-bold text-green-600">¡Listo!</h1>
          <p className="text-sm text-muted-foreground">
            Tu contraseña ha sido actualizada. Redirigiendo al inicio de sesión...
          </p>
          <Link
            to="/auth"
            className="inline-block text-primary hover:underline"
          >
            Ir al inicio de sesión ahora
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-center">Nueva contraseña</h1>
        <p className="text-center text-sm text-muted-foreground mt-1">
          Crea una contraseña segura para tu cuenta
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div>
            <Label>Nueva contraseña</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={100}
              required
            />
          </div>
          <div>
            <Label>Confirmar contraseña</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              maxLength={100}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
          >
            {loading ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
