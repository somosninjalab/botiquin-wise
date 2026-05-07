import { createFileRoute } from "@tanstack/react-router";
import Firecrawl from "@mendable/firecrawl-js";
import * as cheerio from "cheerio";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Descubre nuevos medicamentos recorriendo los catálogos de las farmacias
// configuradas. Para cada URL candidata extrae nombre y (si puede)
// principio activo + dosis, e inserta el medicamento si no existe.

type PharmRow = { id: string; slug: string; name: string; website_url: string | null };

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-VE,es;q=0.9",
};

// Búsquedas semilla para descubrir catálogo: principios activos comunes.
const SEED_QUERIES = [
  "acetaminofen", "ibuprofeno", "amoxicilina", "loratadina", "omeprazol",
  "metformina", "losartan", "atorvastatina", "azitromicina", "cetirizina",
  "diclofenaco", "naproxeno", "salbutamol", "levotiroxina", "enalapril",
  "ciprofloxacina", "fluconazol", "prednisona", "ranitidina", "amlodipina",
  "vitamina c", "vitamina d", "complejo b", "hierro", "calcio",
  "aspirina", "dipirona", "sertralina", "alprazolam", "clonazepam",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function siteHost(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return null; }
}

function isProductUrl(url: string, host: string): boolean {
  try {
    const u = new URL(url);
    if (u.host.replace(/^www\./, "") !== host) return false;
    const path = u.pathname.replace(/\/+$/, "");
    if (!path || path === "/") return false;
    if (/\/(lander|search|login|cart|checkout|category|categoria|categories|inicio|home|nosotros|tag|tags|coleccion|catalogo|brand|marca)(\/|$)/i.test(path)) return false;
    return /producto|product|\/p\/|\/p$|-\d+\/p$|\d{5,}|\/shop\/[^/]+/i.test(path);
  } catch { return false; }
}

async function fetchHtml(url: string, timeoutMs = 12000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

const DOSE_RE = /(\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|µg|ui|%))/i;
const FORM_RE = /(tabletas?|capsulas?|cápsulas?|jarabe|suspensi[oó]n|crema|gel|ungüento|inhalador|gotas|colirio|ampolla|sobre|grageas?|comprimidos?)/i;

// Lista mínima de principios activos conocidos para detectar en títulos.
const KNOWN_AI = [
  "acetaminofen","paracetamol","ibuprofeno","diclofenaco","naproxeno","ketoprofeno","ketorolaco","aspirina","dipirona","tramadol",
  "loratadina","cetirizina","desloratadina","fexofenadina","difenhidramina","clorfeniramina","levocetirizina",
  "amoxicilina","azitromicina","claritromicina","cefalexina","cefadroxilo","cefuroxima","ciprofloxacina","levofloxacina","doxiciclina","metronidazol","nitrofurantoina","clindamicina","eritromicina",
  "omeprazol","esomeprazol","pantoprazol","lansoprazol","ranitidina","famotidina","domperidona","metoclopramida","ondansetron","loperamida","simeticona","bisacodilo","lactulosa","hioscina",
  "losartan","valsartan","enalapril","captopril","lisinopril","amlodipina","nifedipina","atenolol","bisoprolol","metoprolol","carvedilol","hidroclorotiazida","furosemida","espironolactona","atorvastatina","rosuvastatina","simvastatina","clopidogrel","warfarina",
  "metformina","glibenclamida","glimepirida","sitagliptina","empagliflozina","dapagliflozina","insulina",
  "salbutamol","budesonida","montelukast","ambroxol","acetilcisteina","bromhexina","dextrometorfano","oseltamivir",
  "vitamina c","vitamina d","acido folico","sulfato ferroso","calcio","magnesio","zinc","omega 3","multivitaminico",
  "fluconazol","clotrimazol","tamsulosina","sildenafilo","tadalafilo","finasterida","levotiroxina","metimazol",
  "prednisona","prednisolona","dexametasona","hidrocortisona","betametasona",
  "sertralina","fluoxetina","escitalopram","paroxetina","venlafaxina","duloxetina","amitriptilina","alprazolam","clonazepam","lorazepam","diazepam","zolpidem","risperidona","quetiapina","olanzapina",
  "carbamazepina","valproico","levetiracetam","fenitoina","pregabalina","gabapentina",
  "albendazol","mebendazol","ivermectina","nitazoxanida","secnidazol",
  "aciclovir","valaciclovir","ketoconazol","terbinafina","mupirocina","permetrina","tretinoina","adapaleno","isotretinoina","minoxidil",
  "alopurinol","colchicina","sumatriptan","ciclobenzaprina","tizanidina","diosmina","pentoxifilina","clorhexidina",
];

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function extractMedFromTitle(title: string): { name: string; ai: string; dose: string; form: string } | null {
  const t = title.replace(/\s+/g, " ").trim();
  if (!t || t.length < 5) return null;
  const norm = normalize(t);
  let ai = "";
  for (const cand of KNOWN_AI) {
    if (norm.includes(cand)) { ai = cand; break; }
  }
  if (!ai) return null;
  const dose = (t.match(DOSE_RE)?.[0] ?? "").replace(/\s+/g, " ").trim();
  const form = (t.match(FORM_RE)?.[0] ?? "").trim();
  // Nombre limpio: principio activo capitalizado + dosis + forma
  const aiCap = ai.charAt(0).toUpperCase() + ai.slice(1);
  const presentation = [dose, form].filter(Boolean).join(" ");
  const name = [aiCap, presentation].filter(Boolean).join(" ");
  return { name, ai: aiCap, dose, form };
}

function pickTitle(html: string): { title: string; ogImage: string | null } {
  const $ = cheerio.load(html);
  // Preferir JSON-LD Product.name
  let title = "";
  let img: string | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (title) return;
    try {
      const j = JSON.parse($(el).contents().text() || "{}");
      const arr = Array.isArray(j) ? j : [j];
      for (const node of arr) {
        const types = ([] as string[]).concat(node?.["@type"] ?? []);
        if (!types.some((t) => /product/i.test(String(t)))) continue;
        if (typeof node.name === "string") title = node.name;
        const im = node.image;
        if (!img) {
          const first = Array.isArray(im) ? im[0] : typeof im === "object" ? im?.url : im;
          if (typeof first === "string") img = first;
        }
        if (title) break;
      }
    } catch { /* ignore */ }
  });
  if (!title) {
    title =
      $('meta[property="og:title"]').attr("content") ??
      $("h1").first().text() ??
      $("title").first().text() ??
      "";
  }
  if (!img) img = $('meta[property="og:image"]').attr("content") ?? null;
  return { title: title.trim(), ogImage: img };
}

async function discoverPharmacy(
  fc: Firecrawl,
  pharm: PharmRow,
  maxUrls: number,
): Promise<{ candidates: number; created: number; updatedImages: number; errors: string[] }> {
  const host = siteHost(pharm.website_url);
  const errors: string[] = [];
  if (!host || !pharm.website_url) return { candidates: 0, created: 0, updatedImages: 0, errors: ["sin website_url"] };

  // 1) Recolectar URLs candidatas usando map() + search por seed queries.
  const seen = new Set<string>();
  for (const q of SEED_QUERIES) {
    if (seen.size >= maxUrls) break;
    try {
      const mapRes: any = await fc.map(pharm.website_url, { search: q, limit: 30, includeSubdomains: false } as any);
      const links: any[] = mapRes?.links ?? mapRes?.data?.links ?? [];
      for (const l of links) {
        const u = typeof l === "string" ? l : l?.url;
        if (typeof u !== "string") continue;
        if (!isProductUrl(u, host)) continue;
        if (!seen.has(u)) seen.add(u);
        if (seen.size >= maxUrls) break;
      }
    } catch (e: any) {
      errors.push(`map(${q}): ${e?.message ?? e}`);
    }
  }

  // 2) Para cada URL: fetch HTML, extraer nombre, parsear, insertar si nuevo.
  let created = 0;
  let updatedImages = 0;
  const slugs = new Set<string>();
  for (const url of seen) {
    const html = await fetchHtml(url);
    if (!html) continue;
    const { title, ogImage } = pickTitle(html);
    if (!title) continue;
    const med = extractMedFromTitle(title);
    if (!med) continue;
    const slug = slugify(med.name);
    if (!slug || slugs.has(slug)) continue;
    slugs.add(slug);

    // ¿Existe ya?
    const { data: existing } = await supabaseAdmin
      .from("medications")
      .select("id,image_url")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      if (!existing.image_url && ogImage) {
        await supabaseAdmin.from("medications").update({ image_url: ogImage }).eq("id", existing.id);
        updatedImages++;
      }
      continue;
    }

    const { error } = await supabaseAdmin.from("medications").insert({
      name: med.name,
      active_ingredient: med.ai,
      brand_names: [],
      brand_names_text: "",
      presentation: [med.dose, med.form].filter(Boolean).join(" ") || null,
      slug,
      symptoms_text: "",
      image_url: ogImage,
    });
    if (error) {
      errors.push(`insert ${slug}: ${error.message}`);
    } else {
      created++;
    }
  }

  return { candidates: seen.size, created, updatedImages, errors };
}

export const Route = createFileRoute("/api/public/hooks/discover-meds")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          return Response.json({ ok: false, error: "FIRECRAWL_API_KEY missing" }, { status: 500 });
        }
        const url = new URL(request.url);
        const maxUrls = Math.min(Number(url.searchParams.get("max") ?? 60) || 60, 200);
        const pharmSlug = url.searchParams.get("pharm");

        const fc = new Firecrawl({ apiKey });

        let q = supabaseAdmin.from("pharmacies").select("id,slug,name,website_url");
        if (pharmSlug) q = q.eq("slug", pharmSlug);
        const { data: pharms } = await q;
        const list = (pharms ?? []) as PharmRow[];

        const summary: Record<string, { candidates: number; created: number; updatedImages: number; errors: string[] }> = {};
        for (const p of list) {
          summary[p.slug] = await discoverPharmacy(fc, p, maxUrls);
        }

        const totalCreated = Object.values(summary).reduce((s, v) => s + v.created, 0);
        const totalImages = Object.values(summary).reduce((s, v) => s + v.updatedImages, 0);
        return Response.json({ ok: true, totalCreated, totalImagesUpdated: totalImages, byPharmacy: summary });
      },
    },
  },
});