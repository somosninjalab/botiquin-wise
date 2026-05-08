import { useEffect, useState } from "react";
import { Baby, User as UserIcon, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addToOrder } from "@/lib/order-store";
import { toast } from "sonner";
import {
  classifyAudience,
  fetchAudienceAlternatives,
  type Audience,
} from "@/lib/audience";
import type { MedicationRow } from "@/lib/medications";

type Group = { med: MedicationRow; audience: Audience };

function MedRow({ m, onPick }: { m: MedicationRow; onPick: (m: MedicationRow) => void }) {
  return (
    <li className="flex items-center gap-3 p-2 rounded-md border border-border">
      {m.image_url ? (
        <img src={m.image_url} alt="" className="h-9 w-9 rounded object-cover bg-muted" />
      ) : (
        <div className="h-9 w-9 rounded bg-muted" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{m.name}</div>
        {m.presentation && (
          <div className="text-xs text-muted-foreground truncate">{m.presentation}</div>
        )}
      </div>
      <Button size="sm" onClick={() => onPick(m)}>
        <Plus className="h-4 w-4 mr-1" /> Agregar
      </Button>
    </li>
  );
}

export function AudiencePickerDialog({
  open,
  med,
  onClose,
}: {
  open: boolean;
  med: MedicationRow | null;
  onClose: () => void;
}) {
  const [pediatric, setPediatric] = useState<Group[]>([]);
  const [adult, setAdult] = useState<Group[]>([]);
  const [view, setView] = useState<"choose" | "pediatric" | "adult">("choose");

  useEffect(() => {
    if (!open || !med) return;
    setView("choose");
    setPediatric([]);
    setAdult([]);
    (async () => {
      const alts = await fetchAudienceAlternatives(med);
      setPediatric(alts.pediatric);
      setAdult(alts.adult);
    })();
  }, [open, med?.id]);

  if (!med) return null;

  const pickAndAdd = (m: MedicationRow) => {
    addToOrder({
      medication_id: m.id,
      slug: m.slug,
      name: m.name,
      active_ingredient: m.active_ingredient,
      presentation: m.presentation,
      image_url: m.image_url,
    });
    toast.success(`${m.name} agregado`);
    onClose();
  };

  const list = view === "pediatric" ? pediatric : view === "adult" ? adult : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>¿Para quién es?</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{med.active_ingredient}</span> tiene
            presentaciones para adultos y para niños. Elige cuál necesitas.
          </DialogDescription>
        </DialogHeader>

        {view === "choose" && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setView("adult")}
              disabled={!adult.length}
              className="rounded-lg border border-border p-4 text-left hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <UserIcon className="h-6 w-6 mb-2 text-primary" />
              <div className="font-semibold">Adulto</div>
              <div className="text-xs text-muted-foreground">
                {adult.length} presentación{adult.length === 1 ? "" : "es"}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setView("pediatric")}
              disabled={!pediatric.length}
              className="rounded-lg border border-border p-4 text-left hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Baby className="h-6 w-6 mb-2 text-primary" />
              <div className="font-semibold">Niño</div>
              <div className="text-xs text-muted-foreground">
                {pediatric.length} presentación{pediatric.length === 1 ? "" : "es"}
              </div>
            </button>
            <button
              type="button"
              onClick={() => pickAndAdd(med)}
              className="col-span-2 text-xs text-muted-foreground underline hover:text-foreground"
            >
              Agregar el seleccionado tal cual ({med.name})
            </button>
          </div>
        )}

        {view !== "choose" && (
          <div className="space-y-2">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setView("choose")}
            >
              ← Volver
            </button>
            <ul className="space-y-2 max-h-80 overflow-auto">
              {list.map(({ med: m }) => (
                <MedRow key={m.id} m={m} onPick={pickAndAdd} />
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Decide si abrir el diálogo o agregar directamente el medicamento.
 * Devuelve `true` si abrió diálogo (el caller debe esperar onClose).
 */
export async function tryAddWithAudienceCheck(
  med: MedicationRow,
  openDialog: (m: MedicationRow) => void,
): Promise<boolean> {
  const alts = await fetchAudienceAlternatives(med);
  if (alts.needsChoice) {
    openDialog(med);
    return true;
  }
  // Sin ambigüedad: agrega directo.
  addToOrder({
    medication_id: med.id,
    slug: med.slug,
    name: med.name,
    active_ingredient: med.active_ingredient,
    presentation: med.presentation,
    image_url: med.image_url,
  });
  toast.success(`${med.name} agregado`);
  // Avisar audiencia detectada para feedback rápido
  const a = classifyAudience(med);
  if (a !== "any") {
    toast.message(a === "pediatric" ? "Presentación pediátrica" : "Presentación para adultos");
  }
  return false;
}
