import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Siren, Send, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { sendSupportMessage } from "@/lib/support/send-support-message.functions";

type Sent = { text: string };

export function SupportChat() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Sent[]>([]);
  const send = useServerFn(sendSupportMessage);

  const hidden =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/auth") ||
    location.pathname.startsWith("/forgot-password") ||
    location.pathname.startsWith("/reset-password");

  if (hidden) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await send({
        data: {
          message: text,
          email: user?.email ?? email.trim(),
          name: name.trim(),
          phone: phone.trim(),
          path: location.pathname,
        },
      });
      setSent((p) => [...p, { text }]);
      setMessage("");
      setName("");
      setPhone("");
      toast.success("Mensaje enviado. Te responderemos pronto.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "No pudimos enviar tu mensaje.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="SOS - Abrir chat de soporte"
          title="SOS - ¿Necesitas ayuda?"
          className="fixed left-3 md:left-6 z-40 h-14 w-14 md:h-16 md:w-16 rounded-full bg-destructive text-destructive-foreground shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform animate-bounce"
          style={{ bottom: `calc(72px + env(safe-area-inset-bottom))` }}
        >
          <span className="absolute inset-0 rounded-full bg-destructive opacity-75 animate-ping" />
          <span className="relative flex flex-col items-center justify-center leading-none">
            <Siren className="h-5 w-5 md:h-6 md:w-6" />
            <span className="text-[9px] md:text-[10px] font-black tracking-wider mt-0.5">SOS</span>
          </span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-start p-0 md:p-4 pointer-events-none">
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-sm md:hidden pointer-events-auto"
            onClick={() => setOpen(false)}
          />
          <div className="relative pointer-events-auto flex flex-col w-full md:w-[380px] h-[100dvh] md:h-auto md:max-h-[70vh] bg-card border border-border md:rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center">
                  <LifeBuoy className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Soporte</p>
                  <p className="text-xs text-muted-foreground">Te respondemos por correo</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[120px]">
              <p className="text-sm text-muted-foreground">
                Cuéntanos tu problema o sugerencia y nuestro equipo lo recibirá al instante.
              </p>
              {sent.map((m, i) => (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground whitespace-pre-wrap">
                    {m.text}
                  </div>
                </div>
              ))}
              {sent.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  ✅ Recibido. Puedes escribir otro mensaje si necesitas.
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-3 border-t space-y-2">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre (opcional)"
                maxLength={200}
              />
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Tu teléfono (opcional)"
                maxLength={200}
              />
              {!user && (
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu correo (opcional)"
                  maxLength={200}
                />
              )}
              <div className="flex gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe tu mensaje…"
                  rows={2}
                  maxLength={2000}
                  className="flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSubmit(e as unknown as React.FormEvent);
                    }
                  }}
                />
                <Button type="submit" size="icon" disabled={sending || !message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
