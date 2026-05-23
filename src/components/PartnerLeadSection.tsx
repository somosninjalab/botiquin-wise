import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Pill, Send } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { submitPartnerLead } from "@/lib/partners/submit-lead.functions";

type LeadType = "farmacia" | "drogueria";

export function PartnerLeadSection() {
  const [open, setOpen] = useState<LeadType | null>(null);

  return (
    <section className="container mx-auto px-4 py-12 md:py-14">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-6 md:p-10">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">¿Eres farmacia o droguería?</h2>
          <p className="text-muted-foreground mt-2">
            Súmate a ¡Alerta: Medicina! y llega a más pacientes que buscan tus productos.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-8 max-w-4xl mx-auto">
          <Card className="p-6 flex flex-col">
            <div className="rounded-xl bg-primary/10 inline-flex p-3 text-primary w-fit">
              <Pill className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-semibold text-lg">Soy una farmacia</h3>
            <p className="text-sm text-muted-foreground mt-1 flex-1">
              Quiero mostrar los precios de mis medicinas aquí.
            </p>
            <Button
              className="mt-4 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
              onClick={() => setOpen("farmacia")}
            >
              Click aquí si eres farmacia
            </Button>
          </Card>

          <Card className="p-6 flex flex-col">
            <div className="rounded-xl bg-accent/10 inline-flex p-3 text-accent w-fit">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-semibold text-lg">Soy una droguería</h3>
            <p className="text-sm text-muted-foreground mt-1 flex-1">
              Quiero información sobre lo que ofrece ¡Alerta: Medicina!
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setOpen("drogueria")}>
              Click aquí si eres droguería
            </Button>
          </Card>
        </div>
      </div>

      <PartnerLeadDialog
        type={open}
        onClose={() => setOpen(null)}
      />
    </section>
  );
}

function PartnerLeadDialog({ type, onClose }: { type: LeadType | null; onClose: () => void }) {
  const submit = useServerFn(submitPartnerLead);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [reference, setReference] = useState("");
  const [hasDigital, setHasDigital] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [wantsBoost, setWantsBoost] = useState(false);
  const [details, setDetails] = useState("");

  const isFarmacia = type === "farmacia";

  const reset = () => {
    setName(""); setCity(""); setReference(""); setHasDigital(false);
    setWhatsapp(""); setWantsBoost(false); setDetails("");
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return;
    if (!name.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    setSubmitting(true);
    try {
      const r: any = await submit({
        data: {
          type,
          name: name.trim(),
          city: city.trim(),
          reference: reference.trim(),
          hasDigital: isFarmacia ? hasDigital : undefined,
          whatsapp: whatsapp.trim(),
          wantsBoost: isFarmacia ? wantsBoost : undefined,
          details: details.trim(),
        },
      });
      if (r?.success) {
        toast.success("¡Gracias! Recibimos tu información, te contactaremos pronto.");
        reset();
        onClose();
      } else {
        toast.error("No pudimos enviar tu solicitud. Intenta más tarde.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Error al enviar el formulario.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={type !== null} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isFarmacia ? "Suma tu farmacia a ¡Alerta: Medicina!" : "Cuéntanos sobre tu droguería"}
          </DialogTitle>
          <DialogDescription>
            {isFarmacia
              ? "Completa este formulario y te contactaremos para mostrar tus precios en el comparador."
              : "Déjanos tus datos y te enviaremos información sobre cómo podemos colaborar."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">
              {isFarmacia ? "Nombre de la farmacia *" : "Nombre de la droguería *"}
            </Label>
            <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-city">Ciudad</Label>
            <Input id="lead-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={200} />
          </div>

          {isFarmacia && (
            <div className="space-y-1.5">
              <Label htmlFor="lead-ref">Punto de referencia</Label>
              <Input
                id="lead-ref" value={reference} onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: frente a la plaza, C.C. Sambil..." maxLength={500}
              />
            </div>
          )}

          {isFarmacia && (
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label htmlFor="lead-digital" className="cursor-pointer">¿Tiene sistemas digitales para conectarse?</Label>
                <p className="text-xs text-muted-foreground">POS, inventario en línea, API, etc.</p>
              </div>
              <Switch id="lead-digital" checked={hasDigital} onCheckedChange={setHasDigital} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="lead-wa">Número de WhatsApp</Label>
            <Input
              id="lead-wa" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+58 412 1234567" maxLength={40}
            />
          </div>

          {isFarmacia && (
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label htmlFor="lead-boost" className="cursor-pointer">¿Le interesa impulso a su farmacia?</Label>
                <p className="text-xs text-muted-foreground">Promoción y visibilidad en el comparador.</p>
              </div>
              <Switch id="lead-boost" checked={wantsBoost} onCheckedChange={setWantsBoost} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="lead-details">¿Cómo podemos ayudarlos? (más detalle)</Label>
            <Textarea
              id="lead-details" value={details} onChange={(e) => setDetails(e.target.value)}
              rows={4} maxLength={2000}
              placeholder="Cuéntanos qué necesitas, horarios, sucursales, etc."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              <Send className="h-4 w-4" />
              {submitting ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}