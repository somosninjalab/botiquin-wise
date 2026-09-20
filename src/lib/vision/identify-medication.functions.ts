import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  // data URL (image/jpeg o image/png) en base64
  image: z.string().min(100).max(8_000_000),
});

export type IdentifyResult = {
  ok: boolean;
  /** Término de búsqueda final (nombre + concentración cuando es legible). */
  name?: string;
  /** Nombre comercial sin concentración. */
  brand?: string;
  activeIngredient?: string;
  strength?: string;
  form?: string;
  presentation?: string;
  confidence?: "alta" | "media" | "baja";
  error?: string;
};

/**
 * Identifica el medicamento de una foto (caja, blíster o frasco) usando IA de
 * visión y devuelve el término de búsqueda más útil para el comparador.
 */
export const identifyMedicationFromPhoto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<IdentifyResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "IA no configurada" };

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          reasoning_effort: "low",
          messages: [
            {
              role: "system",
              content:
                "Eres un farmacéutico. Miras la foto de un empaque, blíster o frasco de medicamento y lees TODOS los detalles impresos. Devuelves SOLO un JSON con las claves: name (nombre comercial tal como aparece, sin laboratorio y SIN la concentración), active_ingredient (principio activo si es legible, si no cadena vacía), strength (concentración exacta tal como aparece, ej. '500 mg', '100 mg/5 ml', '50 mg/12,5 mg'; cadena vacía si no es legible), form (forma farmacéutica: tabletas, cápsulas, jarabe, suspensión, gotas, crema, ampolla… o cadena vacía), pack (cantidad por empaque, ej. '20 tabletas' o cadena vacía), presentation (resumen, ej. '500 mg x 10 tabletas' o cadena vacía), confidence ('alta' | 'media' | 'baja'). Lee la concentración incluso si está en letra pequeña o en otra cara del empaque visible. Si no es un medicamento o no puedes leerlo, devuelve name vacío y confidence 'baja'. Nada de texto extra.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "¿Qué medicamento es? Responde solo con el JSON." },
                { type: "image_url", image_url: { url: data.image } },
              ],
            },
          ],
        }),
      });
    } catch {
      return { ok: false, error: "No pudimos conectar con el identificador de fotos." };
    }

    if (res.status === 429) return { ok: false, error: "Demasiadas fotos seguidas. Intenta en unos segundos." };
    if (res.status === 402) return { ok: false, error: "El servicio de identificación por foto no está disponible ahora." };
    if (!res.ok) return { ok: false, error: "No pudimos analizar la foto. Intenta con otra más nítida." };

    const json = (await res.json().catch(() => null)) as
      | { choices?: { message?: { content?: string } }[] }
      | null;
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, error: "No reconocimos el medicamento en la foto." };

    try {
      const parsed = JSON.parse(match[0]) as Record<string, unknown>;
      const str = (k: string) => String(parsed[k] ?? "").trim();
      const name = str("name");
      const active = str("active_ingredient");
      const strength = str("strength");
      const form = str("form");
      const pack = str("pack");
      const base = name || active;
      if (!base) return { ok: false, error: "No reconocimos el medicamento en la foto." };
      // Añade la concentración al término si aún no está incluida en el nombre.
      const normalized = base.toLowerCase().replace(/\s+/g, " ");
      const strengthKey = strength.toLowerCase().replace(/\s+/g, " ");
      const term = strength && !normalized.includes(strengthKey) ? `${base} ${strength}` : base;
      const conf = str("confidence") || "media";
      const presentation =
        str("presentation") || [strength, form, pack].filter(Boolean).join(" ") || undefined;
      return {
        ok: true,
        name: term,
        brand: name || undefined,
        activeIngredient: active || undefined,
        strength: strength || undefined,
        form: form || undefined,
        presentation,
        confidence: conf === "alta" || conf === "baja" ? conf : "media",
      };
    } catch {
      return { ok: false, error: "No reconocimos el medicamento en la foto." };
    }
  });
