import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, Handshake, Megaphone, Building2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitContacto } from "@/lib/contacto/submit-contacto.functions";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: "Contáctanos — ¡Alerta: Medicina!" },
      {
        name: "description",
        content:
          "Escríbenos para colaboraciones, publicidad, alianzas o si eres una farmacia que quiere aparecer en el comparador de ¡Alerta: Medicina!",
      },
      { property: "og:title", content: "Contáctanos — ¡Alerta: Medicina!" },
      {
        property: "og:description",
        content:
          "Colaboraciones, publicidad, alianzas y farmacias que quieran estar dentro de las opciones del comparador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://alertamedicina.com/contacto" }],
  }),
  component: ContactoPage,
});

const TOPICS = [
  { value: "Información", label: "Información", icon: Info },
  { value: "Colaborar", label: "Colaborar", icon: Handshake },
  { value: "Publicidad", label: "Publicidad", icon: Megaphone },
  { value: "Alianzas", label: "Alianzas", icon: Handshake },
  { value: "Farmacia", label: "Soy farmacia", icon: Building2 },
];

function ContactoPage() {
  const send = useServerFn(submitContacto);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [topic, setTopic] = useState("Información");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    if (name.trim().length < 2) return toast.error("Escribe tu nombre.");
    if (!email.trim() && !whatsapp.trim())
      return toast.error("Déjanos un correo o un WhatsApp para responderte.");
    if (subject.trim().length < 2) return toast.error("Escribe un asunto.");

    setSending(true);
    try {
      await send({
        data: {
          name: name.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          topic,
          subject: subject.trim(),
          message: message.trim(),
        },
      });
      setDone(true);
      setSubject("");
      setMessage("");
      toast.success("Mensaje enviado. Te responderemos pronto.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos enviar tu mensaje.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Contáctanos</h1>
          <p className="text-sm text-muted-foreground">Te respondemos por correo o WhatsApp</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Este formulario no es para pedir medicamentos.</p>
        <p className="mt-1">
          Es para información sobre el proyecto, colaboraciones, publicidad, alianzas y farmacias que
          quieran estar dentro de las opciones del comparador. Para buscar precios usa el buscador de
          la página principal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label>¿Sobre qué nos escribes?</Label>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((t) => {
              const Icon = t.icon;
              const active = topic === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTopic(t.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="c-name">Nombre</Label>
          <Input
            id="c-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre o el de tu empresa"
            maxLength={200}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="c-email">Correo</Label>
            <Input
              id="c-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-wa">WhatsApp</Label>
            <Input
              id="c-wa"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+58 412 1234567"
              maxLength={40}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Con uno de los dos basta para responderte.</p>

        <div className="space-y-2">
          <Label htmlFor="c-subject">Asunto</Label>
          <Input
            id="c-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej: Propuesta de alianza"
            maxLength={200}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c-msg">Mensaje (opcional)</Label>
          <Textarea
            id="c-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Cuéntanos un poco más…"
            rows={4}
            maxLength={2000}
          />
        </div>

        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? "Enviando…" : "Enviar mensaje"}
        </Button>

        {done && (
          <p className="text-center text-sm text-muted-foreground">
            ✅ Recibimos tu mensaje. Te responderemos pronto.
          </p>
        )}
      </form>
    </div>
  );
}
