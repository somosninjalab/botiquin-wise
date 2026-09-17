import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, ImageUp, RefreshCw } from "lucide-react";
import { identifyMedicationFromPhoto } from "@/lib/vision/identify-medication.functions";

async function fileToDataUrl(file: File, maxSide = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function PhotoIdentifyDialog({
  open,
  onOpenChange,
  onIdentified,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onIdentified: (term: string) => void;
}) {
  const identify = useServerFn(identifyMedicationFromPhoto);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
      const result = await identify({ data: { image: dataUrl } });
      if (!result.ok || !result.name) {
        setError(result.error ?? "No reconocimos el medicamento en la foto.");
        return;
      }
      onOpenChange(false);
      onIdentified(result.name);
    } catch {
      setError("No pudimos procesar la foto. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buscar con una foto</DialogTitle>
          <DialogDescription>
            Toma una foto de la caja, el blíster o el frasco. Identificamos el medicamento y
            buscamos su mejor precio.
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-xl bg-muted aspect-[4/3] flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="Foto del medicamento" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-10 w-10 text-muted-foreground" />
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Identificando medicamento…
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            disabled={loading}
            onClick={() => cameraRef.current?.click()}
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {preview ? <RefreshCw className="h-4 w-4 mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
            {preview ? "Tomar otra" : "Tomar foto"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => galleryRef.current?.click()}
            className="flex-1"
          >
            <ImageUp className="h-4 w-4 mr-2" /> Subir imagen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
