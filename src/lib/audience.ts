import { supabase } from "@/integrations/supabase/client";
import type { MedicationRow } from "@/lib/medications";

export type Audience = "pediatric" | "adult" | "any";

const PEDIATRIC_RE =
  /pediatr|ni[nñ]o|infant|junior|gotas?|jarabe|suspensi[oó]n|125\s*mg(?!\/?5)|120\s*mg(?!\/?5)|100\s*mg\s*\/?\s*5|80\s*mg|160\s*mg\s*\/?\s*5|65\s*mg|100mg(?!\d)|jbe\b/i;

const ADULT_RE =
  /\b(500|650|750|850|875|1000)\s*mg\b|tablet|comprimid|c[aá]psul|grageas?|extra fuerte|forte/i;

/** Heurística para clasificar un medicamento como pediátrico, adulto o ambiguo. */
export function classifyAudience(m: Pick<MedicationRow, "name" | "presentation" | "category" | "indication">): Audience {
  const text = [m.name, m.presentation, m.category, m.indication].filter(Boolean).join(" ");
  const peds = PEDIATRIC_RE.test(text);
  const adult = ADULT_RE.test(text);
  if (peds && !adult) return "pediatric";
  if (adult && !peds) return "adult";
  if (peds && adult) return "adult"; // dosis alta pero forma jarabe → trata como adulto
  return "any";
}

export function audienceLabel(a: Audience): string {
  if (a === "pediatric") return "Niños";
  if (a === "adult") return "Adultos";
  return "Cualquiera";
}

/**
 * Busca presentaciones alternativas con el mismo principio activo y agrupa
 * por audiencia. Devuelve también la audiencia detectada del med original.
 */
export async function fetchAudienceAlternatives(med: MedicationRow) {
  const { data } = await supabase
    .from("medications")
    .select("id,slug,name,active_ingredient,presentation,category,indication,image_url")
    .eq("active_ingredient", med.active_ingredient)
    .order("name")
    .limit(40);
  const rows = ((data ?? []) as MedicationRow[]).map((m) => ({
    med: m,
    audience: classifyAudience(m),
  }));
  const pediatric = rows.filter((r) => r.audience === "pediatric");
  const adult = rows.filter((r) => r.audience === "adult");
  const ambiguous = rows.filter((r) => r.audience === "any");
  const selectedAudience = classifyAudience(med);
  // Necesita confirmación si existen presentaciones para ambas audiencias
  // o si el med original es ambiguo y hay alguna presentación clara.
  const needsChoice =
    (pediatric.length > 0 && adult.length > 0) ||
    (selectedAudience === "any" && (pediatric.length > 0 || adult.length > 0));
  return { pediatric, adult, ambiguous, selectedAudience, needsChoice };
}
