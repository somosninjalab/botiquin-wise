import { createFileRoute } from "@tanstack/react-router";
import { verifyCronAuth } from "@/lib/cron-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Fallback en vivo: cuando una búsqueda no devuelve nada, este endpoint
// consulta CIMA (AEMPS) por el término y crea cualquier medicamento nuevo
// que aparezca, junto con su alias comercial. Sin Firecrawl ni rate limit.

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
function norm(s: string): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
const FORM_MAP: Array<[RegExp, string]> = [
  [/comprimid|tableta/i, "tableta"], [/c[aá]psula/i, "capsula"],
  [/jarabe/i, "jarabe"], [/suspensi[oó]n/i, "suspension"],
  [/crema/i, "crema"], [/gel/i, "gel"], [/ung[uü]ento|pomada/i, "unguento"],
  [/inhalad/i, "inhalador"], [/gotas/i, "gotas"], [/colirio/i, "colirio"],
  [/ampolla|inyect|vial/i, "ampolla"], [/sobres?/i, "sobre"], [/grageas?/i, "gragea"],
];
const DOSE_RE = /(\d+(?:[.,]\d+)?)\s*(mg|g|ml|mcg|µg|ui|%)/i;

function parseFromCima(item: { nombre?: string; pactivos?: string; labtitular?: string }) {
  const nombre = (item?.nombre ?? "").toString();
  const principios = (item?.pactivos ?? "").toString().split(",")[0].trim();
  if (!nombre || !principios) return null;
  const ai = principios.replace(/\s+/g, " ").trim();
  const m = nombre.match(DOSE_RE);
  const dose = m ? `${m[1].replace(",", ".")}${m[2].toLowerCase()}`.replace(/\s+/g, "") : "";
  let form = "";
  for (const [re, val] of FORM_MAP) { if (re.test(nombre)) { form = val; break; } }
  const aiCap = ai.charAt(0).toUpperCase() + ai.slice(1).toLowerCase();
  const presentation = [dose, form].filter(Boolean).join(" ");
  const cleanName = [aiCap, presentation].filter(Boolean).join(" ");
  const brand = nombre.split(/\s+/)[0]?.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ-]/g, "") ?? "";
  const brands = brand && norm(brand) !== norm(ai.split(" ")[0]) ? [brand] : [];
  return { name: cleanName, ai: aiCap, dose, form, brands, manufacturer: item?.labtitular ?? null, fullCommercial: nombre };
}

async function fetchCima(term: string): Promise<any[]> {
  // CIMA es estricto: `nombre=` solo coincide por palabra completa (no tolera
  // typos ni prefijos parciales). Probamos varias estrategias para maximizar
  // descubrimiento: nombre exacto, principio activo, y prefijos del término.
  const tryOne = async (url: string): Promise<any[]> => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
      clearTimeout(t);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json?.resultados) ? json.resultados : [];
    } catch { return []; }
  };
  const base = "https://cima.aemps.es/cima/rest/medicamentos";
  const variants: string[] = [];
  // 1) nombre exacto
  variants.push(`${base}?nombre=${encodeURIComponent(term)}`);
  // 2) principio activo exacto
  variants.push(`${base}?practiv1=${encodeURIComponent(term)}`);
  // 3) prefijos progresivamente más cortos (tolerancia a typos al final)
  if (term.length >= 5) {
    variants.push(`${base}?practiv1=${encodeURIComponent(term.slice(0, term.length - 1))}`);
  }
  if (term.length >= 6) {
    variants.push(`${base}?practiv1=${encodeURIComponent(term.slice(0, term.length - 2))}`);
  }
  if (term.length >= 4) {
    variants.push(`${base}?nombre=${encodeURIComponent(term.slice(0, Math.max(4, term.length - 2)))}`);
  }
  const all: any[] = [];
  const seen = new Set<string>();
  for (const url of variants) {
    const items = await tryOne(url);
    for (const it of items) {
      const k = it?.nregistro ?? it?.nombre;
      if (!k || seen.has(String(k))) continue;
      seen.add(String(k));
      all.push(it);
      if (all.length >= 20) return all;
    }
    if (all.length >= 20) break;
  }
  return all;
}

export const Route = createFileRoute("/api/public/hooks/discover-on-demand")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = verifyCronAuth(request);
        if (unauthorized) return unauthorized;
        let q = "";
        try {
          const body = (await request.json()) as { q?: string };
          q = (body?.q ?? "").toString().trim();
        } catch { /* ignore */ }
        if (q.length < 3 || q.length > 60) {
          return Response.json({ ok: false, created: 0, error: "query length" }, { status: 400 });
        }

        const items = await fetchCima(q);
        if (!items.length) return Response.json({ ok: true, created: 0 });

        let created = 0;
        const seen = new Set<string>();
        for (const it of items) {
          const parsed = parseFromCima(it);
          if (!parsed) continue;
          const slug = slugify(parsed.name);
          if (!slug || seen.has(slug)) continue;
          seen.add(slug);
          const { data: existing } = await supabaseAdmin
            .from("medications").select("id").eq("slug", slug).maybeSingle();
          let medId = existing?.id;
          if (!medId) {
            const { data, error } = await supabaseAdmin.from("medications").insert({
              name: parsed.name,
              active_ingredient: parsed.ai,
              brand_names: parsed.brands,
              brand_names_text: parsed.brands.join(" "),
              presentation: [parsed.dose, parsed.form].filter(Boolean).join(" ") || null,
              slug,
              symptoms_text: "",
              manufacturer: parsed.manufacturer,
            }).select("id").maybeSingle();
            if (error || !data?.id) continue;
            medId = data.id;
            created++;
          }
          if (parsed.fullCommercial) {
            await supabaseAdmin.from("medication_aliases")
              .insert({ medication_id: medId, alias: parsed.fullCommercial })
              .select("id").maybeSingle();
          }
        }
        return Response.json({ ok: true, created });
      },
    },
  },
});