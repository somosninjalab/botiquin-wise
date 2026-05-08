import { createFileRoute } from "@tanstack/react-router";
import Firecrawl from "@mendable/firecrawl-js";
import * as cheerio from "cheerio";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// === Opción #6: Sitemap completo ============================================
// Recorre el sitemap completo de cada farmacia (fc.map sin filtro), filtra URLs
// de producto, extrae nombre + principio activo + precio (vía JSON-LD / og)
// y crea medicamentos nuevos + filas de precio en una sola pasada.
// Mucho más cobertura que las seed-queries por principio activo.

type PharmRow = { id: string; slug: string; name: string; website_url: string | null };

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-VE,es;q=0.9",
};

const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  VES: { min: 30, max: 5_000_000 },
  USD: { min: 0.3, max: 500 },
};

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

const DOSE_RE = /(\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|µg|ui|%))/i;
const FORM_RE = /(tabletas?|capsulas?|cápsulas?|jarabe|suspensi[oó]n|crema|gel|ungüento|inhalador|gotas|colirio|ampolla|sobre|grageas?|comprimidos?)/i;

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

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function extractMedFromTitle(title: string) {
  const t = title.replace(/\s+/g, " ").trim();
  if (!t || t.length < 5) return null;
  const norm = normalize(t);
  let ai = "";
  for (const cand of KNOWN_AI) { if (norm.includes(cand)) { ai = cand; break; } }
  if (!ai) return null;
  const doseRaw = (t.match(DOSE_RE)?.[0] ?? "").trim();
  const dose = doseRaw ? doseRaw.toLowerCase().replace(/\s+/g, "").replace(/µg/g, "mcg") : "";
  const formRaw = (t.match(FORM_RE)?.[0] ?? "").trim();
  const form = formRaw ? normalize(formRaw).toLowerCase().replace(/s$/, "") : "";
  const aiCap = ai.charAt(0).toUpperCase() + ai.slice(1);
  const presentation = [dose, form].filter(Boolean).join(" ");
  const name = [aiCap, presentation].filter(Boolean).join(" ");
  return { name, ai: aiCap, dose, form, presentation };
}

function parsePrice(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw > 0 ? raw : null;
  if (typeof raw !== "string") return null;
  let s = raw.replace(/[\s\u00A0]/g, "").replace(/(usd|ves|cop|bs\.?s?|us\$|\$|€)/gi, "");
  if (!s) return null;
  const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
  if (lc !== -1 && ld !== -1) s = lc > ld ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (lc !== -1) {
    const dec = s.length - lc - 1;
    s = dec > 0 && dec <= 2 ? s.slice(0, lc).replace(/,/g, "") + "." + s.slice(lc + 1) : s.replace(/,/g, "");
  } else if (ld !== -1) {
    const dec = s.length - ld - 1;
    if (dec === 3 && s.split(".").length > 1) s = s.replace(/\./g, "");
  }
  s = s.replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function guessCurrency(host: string, raw?: string): string {
  const s = String(raw ?? "").toUpperCase();
  if (/VES|VEF|^BS$|BSS|BOLIVAR/.test(s)) return "VES";
  if (/USD|US\$|^\$$/.test(s)) return "USD";
  if (/\.com\.ve$|farmatodo|farmago|gopharma|locatel|cinecitta|farmaciasaas|tufarmaciaactual|maraplus/i.test(host)) return "VES";
  return "USD";
}

function priceWithinRange(amount: number, currency: string): boolean {
  const r = PRICE_RANGES[currency.toUpperCase()];
  return r ? amount >= r.min && amount <= r.max : amount > 0;
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

function flatten(node: any, out: any[] = []): any[] {
  if (!node) return out;
  if (Array.isArray(node)) { for (const n of node) flatten(n, out); return out; }
  if (typeof node === "object") { out.push(node); if (node["@graph"]) flatten(node["@graph"], out); }
  return out;
}

function extractFromHtml(html: string, url: string) {
  const $ = cheerio.load(html);
  let title = "", image: string | null = null, price: number | null = null, currency = "", inStock = true;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const j = JSON.parse($(el).contents().text() || "{}");
      for (const node of flatten(j)) {
        const types = ([] as string[]).concat(node["@type"] ?? []);
        if (!types.some((t) => /product/i.test(String(t)))) continue;
        if (!title && typeof node.name === "string") title = node.name;
        if (!image) {
          const im = node.image;
          const first = Array.isArray(im) ? im[0] : typeof im === "object" ? im?.url : im;
          if (typeof first === "string") image = first;
        }
        const offers = ([] as any[]).concat(node.offers ?? []);
        for (const off of offers) {
          if (price !== null) break;
          const p = parsePrice(off?.price ?? off?.lowPrice);
          if (p) {
            price = p;
            currency = String(off?.priceCurrency ?? "");
            const av = String(off?.availability ?? "").toLowerCase();
            if (/outofstock|sold|discontinued/.test(av)) inStock = false;
          }
        }
      }
    } catch { /* ignore */ }
  });

  if (!title) title = $('meta[property="og:title"]').attr("content") ?? $("h1").first().text() ?? $("title").first().text() ?? "";
  if (!image) image = $('meta[property="og:image"]').attr("content") ?? null;
  if (price === null) {
    const og = $('meta[property="product:price:amount"]').attr("content") ?? $('meta[property="og:price:amount"]').attr("content") ?? $('meta[itemprop="price"]').attr("content");
    const cur = $('meta[property="product:price:currency"]').attr("content") ?? $('meta[property="og:price:currency"]').attr("content") ?? $('meta[itemprop="priceCurrency"]').attr("content");
    price = parsePrice(og);
    if (cur) currency = cur;
  }
  // Imagen absoluta
  if (image) {
    try { image = new URL(image, url).toString(); } catch { /* keep */ }
  }
  return { title: title.trim(), image, price, currency, inStock };
}

async function crawlPharmacy(fc: Firecrawl, pharm: PharmRow, maxUrls: number, concurrency: number) {
  const host = siteHost(pharm.website_url);
  if (!host || !pharm.website_url) return { mapped: 0, candidates: 0, created: 0, prices: 0, errors: ["sin website_url"] };
  const errors: string[] = [];

  // 1) Sitemap completo (sin filtro de búsqueda)
  let mapped = 0;
  const candidates: string[] = [];
  try {
    const mapRes: any = await fc.map(pharm.website_url, { limit: maxUrls, includeSubdomains: false } as any);
    const links: any[] = mapRes?.links ?? mapRes?.data?.links ?? [];
    mapped = links.length;
    const seen = new Set<string>();
    for (const l of links) {
      const u = typeof l === "string" ? l : l?.url;
      if (typeof u !== "string") continue;
      if (!isProductUrl(u, host)) continue;
      if (seen.has(u)) continue;
      seen.add(u);
      candidates.push(u);
      if (candidates.length >= maxUrls) break;
    }
  } catch (e: any) {
    errors.push(`map: ${e?.message ?? e}`);
  }

  if (!candidates.length) return { mapped, candidates: 0, created: 0, prices: 0, errors };

  // 2) Procesar con concurrencia limitada
  let created = 0, pricesIns = 0;
  const slugs = new Set<string>();

  async function worker(url: string) {
    const html = await fetchHtml(url);
    if (!html) return;
    const { title, image, price, currency, inStock } = extractFromHtml(html, url);
    if (!title) return;
    const med = extractMedFromTitle(title);
    if (!med) return;
    const slug = slugify(med.name);
    if (!slug || slugs.has(slug)) return;
    slugs.add(slug);

    let medId: string | null = null;
    const { data: existing } = await supabaseAdmin.from("medications").select("id, image_url").eq("slug", slug).maybeSingle();
    if (existing) {
      medId = existing.id;
      if (!existing.image_url && image) {
        await supabaseAdmin.from("medications").update({ image_url: image }).eq("id", existing.id);
      }
    } else {
      const { data: ins, error } = await supabaseAdmin.from("medications").insert({
        name: med.name,
        active_ingredient: med.ai,
        brand_names: [],
        brand_names_text: "",
        presentation: med.presentation || null,
        slug,
        symptoms_text: "",
        image_url: image,
      }).select("id").single();
      if (error) { errors.push(`insert ${slug}: ${error.message}`); return; }
      medId = ins?.id ?? null;
      if (medId) created++;
    }

    // 3) Insertar precio si lo extrajimos
    if (medId && price !== null) {
      const cur = guessCurrency(host, currency);
      if (priceWithinRange(price, cur)) {
        const { error: pe } = await supabaseAdmin.from("medication_prices").insert({
          medication_id: medId, pharmacy_id: pharm.id, price, currency: cur, in_stock: inStock, product_url: url,
        });
        if (!pe) pricesIns++;
      }
    }
  }

  // pool simple
  const queue = [...candidates];
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, 8)) }, async () => {
    while (queue.length) {
      const u = queue.shift()!;
      try { await worker(u); } catch (e: any) { errors.push(`worker ${u}: ${e?.message ?? e}`); }
    }
  }));

  return { mapped, candidates: candidates.length, created, prices: pricesIns, errors: errors.slice(0, 10) };
}

export const Route = createFileRoute("/api/public/hooks/sitemap-crawl")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) return Response.json({ ok: false, error: "FIRECRAWL_API_KEY missing" }, { status: 500 });
        const url = new URL(request.url);
        const maxUrls = Math.min(Number(url.searchParams.get("max") ?? 500) || 500, 2000);
        const concurrency = Math.min(Number(url.searchParams.get("c") ?? 4) || 4, 8);
        const pharmSlug = url.searchParams.get("pharm");

        const fc = new Firecrawl({ apiKey });
        const baseQ = supabaseAdmin.from("pharmacies").select("id,slug,name,website_url");
        const { data: pharms } = await (pharmSlug ? baseQ.eq("slug", pharmSlug) : baseQ);
        const list = (pharms ?? []) as PharmRow[];

        const summary: Record<string, any> = {};
        for (const p of list) {
          summary[p.slug] = await crawlPharmacy(fc, p, maxUrls, concurrency);
        }
        const totalCreated = Object.values(summary).reduce((s: number, v: any) => s + (v.created ?? 0), 0);
        const totalPrices = Object.values(summary).reduce((s: number, v: any) => s + (v.prices ?? 0), 0);
        return Response.json({ ok: true, totalCreated, totalPrices, byPharmacy: summary });
      },
    },
  },
});