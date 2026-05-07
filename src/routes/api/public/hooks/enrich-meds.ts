import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Enriquece medicamentos consultando RxNorm (NIH) y OpenFDA. Ambas APIs son
// gratuitas y no requieren API key. Útil para completar indication, category,
// manufacturer e image_url cuando faltan.

type Med = {
  id: string;
  name: string;
  active_ingredient: string;
  category: string | null;
  indication: string | null;
  manufacturer: string | null;
  image_url: string | null;
};

// Mapeo simple inglés → español para principios activos comunes.
const AI_EN: Record<string, string> = {
  acetaminofen: "acetaminophen", paracetamol: "acetaminophen",
  ibuprofeno: "ibuprofen", diclofenaco: "diclofenac", naproxeno: "naproxen",
  aspirina: "aspirin", dipirona: "metamizole",
  amoxicilina: "amoxicillin", azitromicina: "azithromycin",
  ciprofloxacina: "ciprofloxacin", levofloxacina: "levofloxacin",
  metronidazol: "metronidazole", omeprazol: "omeprazole",
  losartan: "losartan", enalapril: "enalapril", amlodipina: "amlodipine",
  metformina: "metformin", atorvastatina: "atorvastatin",
  loratadina: "loratadine", cetirizina: "cetirizine",
  salbutamol: "albuterol", levotiroxina: "levothyroxine",
  sertralina: "sertraline", fluoxetina: "fluoxetine",
  prednisona: "prednisone", aciclovir: "acyclovir",
  fluconazol: "fluconazole", ranitidina: "ranitidine",
  sildenafilo: "sildenafil", tadalafilo: "tadalafil",
  alprazolam: "alprazolam", clonazepam: "clonazepam",
  ivermectina: "ivermectin", albendazol: "albendazole",
};

function toEnglish(ai: string): string {
  const norm = ai.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  for (const [es, en] of Object.entries(AI_EN)) {
    if (norm.startsWith(es)) return en;
  }
  return norm;
}

async function safeJson(url: string, timeoutMs = 8000): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchOpenFda(termEn: string): Promise<{ indication: string | null; manufacturer: string | null }> {
  const q = encodeURIComponent(`openfda.generic_name:"${termEn}"`);
  const j = await safeJson(`https://api.fda.gov/drug/label.json?search=${q}&limit=1`);
  const r = j?.results?.[0];
  if (!r) return { indication: null, manufacturer: null };
  const indication = (r.indications_and_usage?.[0] ?? r.purpose?.[0] ?? "").toString().slice(0, 500) || null;
  const manufacturer = r.openfda?.manufacturer_name?.[0] ?? null;
  return { indication, manufacturer };
}

async function fetchRxNormImage(termEn: string): Promise<string | null> {
  const j = await safeJson(`https://rximage.nlm.nih.gov/api/rximage/1/rxnav?name=${encodeURIComponent(termEn)}&resolution=120`);
  const url = j?.nlmRxImages?.[0]?.imageUrl;
  return typeof url === "string" ? url : null;
}

function categoryFromAi(ai: string): string | null {
  const a = ai.toLowerCase();
  if (/acetaminof|paracet|ibuprof|diclofenac|naproxe|ketorolac|ketoprof|aspirin|dipirona|tramadol/.test(a)) return "Analgésico";
  if (/loratadi|cetirizi|desloratadi|fexofenadi|clorfenirami|difenhidrami|levocetirizi/.test(a)) return "Antihistamínico";
  if (/amoxicil|azitromici|ciprofloxac|levofloxac|cefal|cefadrox|cefurox|claritromic|metronidazol|nitrofurant|clindamici|eritromici|doxicicli/.test(a)) return "Antibiótico";
  if (/omeprazol|esomeprazol|pantoprazol|lansoprazol|ranitidi|famotidi/.test(a)) return "Antiulceroso";
  if (/losart|valsart|enalapril|captopril|lisinopril|amlodipi|nifedipi|atenolol|bisoprol|metoprol|carvedil|hidroclorotiazi|furosemi|espironolac|clortalido/.test(a)) return "Antihipertensivo";
  if (/atorvastat|rosuvastat|simvastat/.test(a)) return "Hipolipemiante";
  if (/metformi|glibenclami|glimepiri|sitaglipti|empaglifloz|dapaglifloz|insulina/.test(a)) return "Antidiabético";
  if (/salbutamol|budesoni|montelukast|formoter|salmeter|fluticaso|ipratropi|ambroxol|acetilcistei|bromhexi|dextrometorfa/.test(a)) return "Respiratorio";
  if (/sertrali|fluoxeti|escitalopr|paroxeti|venlafaxi|duloxeti|amitriptili/.test(a)) return "Antidepresivo";
  if (/alprazol|clonazep|lorazep|diazep|zolpide/.test(a)) return "Ansiolítico";
  if (/aciclov|valaciclov|oseltami/.test(a)) return "Antiviral";
  if (/fluconaz|clotrimaz|ketoconaz|terbinafi/.test(a)) return "Antimicótico";
  if (/predniso|prednisolo|dexametason|hidrocortison|betametason/.test(a)) return "Corticoide";
  if (/vitamina|complejo b|acido folic|sulfato ferr|calcio|magnesio|zinc|omega/.test(a)) return "Vitamina/Suplemento";
  return null;
}

export const Route = createFileRoute("/api/public/hooks/enrich-meds")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 40) || 40, 100);
        const force = url.searchParams.get("force") === "1";

        // Selecciona medicamentos con campos faltantes.
        let q = supabaseAdmin
          .from("medications")
          .select("id,name,active_ingredient,category,indication,manufacturer,image_url")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (!force) q = q.or("indication.is.null,category.is.null,image_url.is.null,manufacturer.is.null");

        const { data, error } = await q;
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const meds = (data ?? []) as Med[];
        let updated = 0;
        const errors: string[] = [];

        for (const m of meds) {
          const patch: Partial<Med> = {};
          if (!m.category) {
            const c = categoryFromAi(m.active_ingredient);
            if (c) patch.category = c;
          }
          const en = toEnglish(m.active_ingredient);
          if (!m.indication || !m.manufacturer) {
            const fda = await fetchOpenFda(en);
            if (!m.indication && fda.indication) patch.indication = fda.indication;
            if (!m.manufacturer && fda.manufacturer) patch.manufacturer = fda.manufacturer;
          }
          if (!m.image_url) {
            const img = await fetchRxNormImage(en);
            if (img) patch.image_url = img;
          }
          if (Object.keys(patch).length === 0) continue;
          const { error: upErr } = await supabaseAdmin.from("medications").update(patch).eq("id", m.id);
          if (upErr) errors.push(`${m.name}: ${upErr.message}`);
          else updated++;
        }

        return Response.json({ ok: true, scanned: meds.length, updated, errors: errors.slice(0, 10) });
      },
    },
  },
});