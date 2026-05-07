import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Carga masiva desde CIMA (AEMPS, España). API pública sin key:
// https://cima.aemps.es/cima/rest/medicamentos?nombre=<termino>&pagina=N
// Cada término retorna hasta ~25 resultados; iteramos páginas hasta agotar.

export const SEED_TERMS = [
  "paracetamol","ibuprofeno","amoxicilina","azitromicina","cefalexina","ciprofloxacino","levofloxacino","claritromicina","metronidazol","clindamicina","doxiciclina","nitrofurantoina","eritromicina",
  "loratadina","cetirizina","desloratadina","fexofenadina","clorfeniramina","difenhidramina",
  "omeprazol","esomeprazol","pantoprazol","lansoprazol","ranitidina","famotidina","domperidona","metoclopramida","ondansetron","loperamida","simeticona","lactulosa","hioscina",
  "losartan","valsartan","enalapril","captopril","lisinopril","amlodipino","nifedipino","atenolol","bisoprolol","metoprolol","carvedilol","hidroclorotiazida","furosemida","espironolactona",
  "atorvastatina","rosuvastatina","simvastatina","clopidogrel","warfarina",
  "metformina","glibenclamida","glimepirida","sitagliptina","empagliflozina","dapagliflozina","insulina",
  "salbutamol","budesonida","montelukast","ambroxol","acetilcisteina","bromhexina","dextrometorfano","oseltamivir","fluticasona","ipratropio","formoterol","salmeterol",
  "diclofenaco","naproxeno","ketoprofeno","ketorolaco","aspirina","metamizol","tramadol","codeina",
  "vitamina","acido folico","sulfato ferroso","calcio","magnesio","zinc","omega",
  "fluconazol","clotrimazol","ketoconazol","terbinafina","mupirocina","permetrina","tretinoina","adapaleno","isotretinoina","minoxidil",
  "prednisona","prednisolona","dexametasona","hidrocortisona","betametasona",
  "sertralina","fluoxetina","escitalopram","paroxetina","venlafaxina","duloxetina","amitriptilina","alprazolam","clonazepam","lorazepam","diazepam","zolpidem","risperidona","quetiapina","olanzapina",
  "carbamazepina","valproico","levetiracetam","fenitoina","pregabalina","gabapentina",
  "albendazol","mebendazol","ivermectina","nitazoxanida","secnidazol",
  "aciclovir","valaciclovir","tamsulosina","sildenafilo","tadalafilo","finasterida","levotiroxina","metimazol",
  "alopurinol","colchicina","sumatriptan","ciclobenzaprina","tizanidina","diosmina",
];

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
function norm(s: string): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const FORM_MAP: Array<[RegExp, string]> = [
  [/comprimid/i, "tableta"], [/tableta/i, "tableta"],
  [/c[aá]psula/i, "capsula"], [/jarabe/i, "jarabe"], [/suspensi[oó]n/i, "suspension"],
  [/crema/i, "crema"], [/gel/i, "gel"], [/ung[uü]ento|pomada/i, "unguento"],
  [/inhalad/i, "inhalador"], [/gotas/i, "gotas"], [/colirio/i, "colirio"],
  [/ampolla|inyect|vial/i, "ampolla"], [/sobres?/i, "sobre"], [/grageas?/i, "gragea"],
  [/polvo/i, "polvo"], [/parche/i, "parche"], [/[oó]vulo/i, "ovulo"],
];
const DOSE_RE = /(\d+(?:[.,]\d+)?)\s*(mg|g|ml|mcg|µg|ui|%)/i;

function parseFromCima(item: any): { name: string; ai: string; dose: string; form: string; brands: string[] } | null {
  const nombre: string = (item?.nombre ?? "").toString();
  const principios: string = (item?.pactivos ?? "").toString().split(",")[0].trim();
  if (!nombre || !principios) return null;
  const ai = principios.replace(/\s+/g, " ").trim();
  // Dosis y forma desde nombre
  const m = nombre.match(DOSE_RE);
  const dose = m ? `${m[1].replace(",", ".")}${m[2].toLowerCase()}`.replace(/\s+/g, "") : "";
  let form = "";
  for (const [re, val] of FORM_MAP) { if (re.test(nombre)) { form = val; break; } }
  const aiCap = ai.charAt(0).toUpperCase() + ai.slice(1).toLowerCase();
  const presentation = [dose, form].filter(Boolean).join(" ");
  const cleanName = [aiCap, presentation].filter(Boolean).join(" ");
  // Marca = primera palabra del nombre comercial (suele ser la marca)
  const brand = nombre.split(/\s+/)[0]?.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ-]/g, "") ?? "";
  const brands = brand && norm(brand) !== norm(ai.split(" ")[0]) ? [brand] : [];
  return { name: cleanName, ai: aiCap, dose, form, brands };
}

async function fetchCima(term: string, page: number): Promise<any[]> {
  const url = `https://cima.aemps.es/cima/rest/medicamentos?nombre=${encodeURIComponent(term)}&pagina=${page}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    clearTimeout(t);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.resultados) ? json.resultados : [];
  } catch { return []; }
}

export const Route = createFileRoute("/api/public/hooks/seed-cima")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const maxPerTerm = Math.min(Number(url.searchParams.get("pages") ?? 4) || 4, 10);
        const onlyTerm = url.searchParams.get("term");
        const terms = onlyTerm ? [onlyTerm] : SEED_TERMS;

        let scanned = 0;
        let createdMeds = 0;
        let createdAliases = 0;
        const errors: string[] = [];
        const seenSlug = new Set<string>();

        // Cache slugs ya existentes para minimizar consultas
        const { data: existingMeds } = await supabaseAdmin
          .from("medications").select("id,slug,brand_names").limit(10000);
        const slugToId = new Map<string, string>();
        const brandsMap = new Map<string, Set<string>>();
        for (const m of existingMeds ?? []) {
          slugToId.set(m.slug, m.id);
          brandsMap.set(m.id, new Set((m.brand_names ?? []).map((b: string) => norm(b))));
        }

        for (const term of terms) {
          for (let page = 1; page <= maxPerTerm; page++) {
            const items = await fetchCima(term, page);
            if (!items.length) break;
            for (const it of items) {
              scanned++;
              const parsed = parseFromCima(it);
              if (!parsed) continue;
              const slug = slugify(parsed.name);
              if (!slug || seenSlug.has(slug)) continue;
              seenSlug.add(slug);

              let medId = slugToId.get(slug);
              if (!medId) {
                const { data, error } = await supabaseAdmin.from("medications").insert({
                  name: parsed.name,
                  active_ingredient: parsed.ai,
                  brand_names: parsed.brands,
                  brand_names_text: parsed.brands.join(" "),
                  presentation: [parsed.dose, parsed.form].filter(Boolean).join(" ") || null,
                  slug,
                  symptoms_text: "",
                  manufacturer: it?.labtitular ?? null,
                }).select("id").maybeSingle();
                if (error) { errors.push(`insert ${slug}: ${error.message}`); continue; }
                if (!data?.id) continue;
                medId = data.id;
                slugToId.set(slug, medId);
                brandsMap.set(medId, new Set(parsed.brands.map(norm)));
                createdMeds++;
              }

              // Alias: nombre comercial completo de CIMA
              const aliasNombre: string = (it?.nombre ?? "").toString().trim();
              if (aliasNombre) {
                const { error: aErr } = await supabaseAdmin
                  .from("medication_aliases")
                  .insert({ medication_id: medId, alias: aliasNombre })
                  .select("id")
                  .maybeSingle();
                if (!aErr) createdAliases++;
              }
              // Alias adicional: marca corta
              for (const b of parsed.brands) {
                const set = brandsMap.get(medId)!;
                if (set.has(norm(b))) continue;
                set.add(norm(b));
                await supabaseAdmin.from("medication_aliases")
                  .insert({ medication_id: medId, alias: b })
                  .select("id").maybeSingle();
                createdAliases++;
              }
            }
            if (items.length < 25) break;
          }
        }

        return Response.json({ ok: true, scanned, createdMeds, createdAliases, errors: errors.slice(0, 10) });
      },
    },
  },
});