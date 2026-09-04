import { createFileRoute } from "@tanstack/react-router";
import { getScraperToken, scraperFetch } from "@/lib/scraper-session.server";
import {
  reportFailure,
  reportSuccess,
  reportThrottled,
  scheduleUpstream,
} from "@/lib/scraper-throttle.server";

const API_ROOT = "https://admin.clubestarbien.com/api/scraper";
// Tiempo máximo por intento y tiempo total antes de responder al usuario.
const SEARCH_TIMEOUT_MS = 75_000;
const TOTAL_BUDGET_MS = 160_000;

const SOURCES = new Set([
  "farmatodo",
  "fundafarmacia",
  "locatel",
  "farmadon",
  "farmago",
  "farmaciasaas",
  "tufarmaciaactual",
  "gopharma",
  "farmabien",
  "nuevosiglo",
  "gama",
  "badan",
]);

// Caché en memoria: evita repetir consultas idénticas al proveedor,
// que limita fuertemente las peticiones simultáneas.
// - "fresco": se responde tal cual.
// - "vencido pero útil": se responde al instante y se refresca por detrás.
const CACHE_TTL_MS = 10 * 60 * 1000;
const STALE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; products: unknown[] }>();

// Una sola petición al proveedor por término, aunque muchos usuarios
// busquen lo mismo a la vez.
const inflight = new Map<string, Promise<unknown[] | null>>();



// Traduce un código de barras (EAN/UPC) al nombre del producto usando
// bases públicas. El proveedor solo busca por nombre.
type BarcodeInfo = { query: string; keywords: string[] } | null;
const barcodeCache = new Map<string, BarcodeInfo>();

const STOPWORDS = new Set(["de", "la", "el", "con", "para", "und", "unidad", "plaza", "lata", "x"]);

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveBarcode(code: string): Promise<BarcodeInfo> {
  if (barcodeCache.has(code)) return barcodeCache.get(code) ?? null;
  const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  let info: BarcodeInfo = null;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8_000);
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_es,generic_name,brands`,
      { headers: { Accept: "application/json", "User-Agent": "AlertaMedicina/1.0" }, signal: ctrl.signal },
    );
    clearTimeout(tid);
    if (res.ok) {
      const j: any = await res.json();
      const p = j?.product ?? {};
      const brand = clean(p.brands).split(",")[0]?.trim() ?? "";
      const name = clean(p.product_name_es) || clean(p.product_name) || clean(p.generic_name);
      const tokens = normalizeText(`${brand} ${name}`)
        .split(" ")
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
      // Consulta corta y distintiva: marca primero, luego palabras clave.
      const query = (normalizeText(brand) || tokens.slice(0, 2).join(" ")).trim();
      if (query) info = { query, keywords: tokens.slice(0, 4) };
    }
  } catch (err) {
    console.warn(`[search-prices-api] barcode lookup failed for ${code}:`, err);
  }
  barcodeCache.set(code, info);
  return info;
}


export const Route = createFileRoute("/api/public/search-prices")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Sesión activa en el panel del proveedor (login usuario/clave).
        const token = await getScraperToken();

        const incoming = new URL(request.url);
        const q = (incoming.searchParams.get("q") ?? incoming.searchParams.get("product") ?? "").trim();
        if (q.length < 2 || q.length > 120) {
          return Response.json({ ok: false, error: "query length" }, { status: 400 });
        }
        if (!token) {
          console.warn("[search-prices-api] no provider session (login failed)");
          return Response.json({ ok: false, product: q, count: 0, products: [], error: "search temporarily unavailable" });
        }

        const limit = Math.min(Number(incoming.searchParams.get("limit") ?? 80) || 80, 120);
        const source = (incoming.searchParams.get("source") ?? "").trim().toLowerCase();
        if (source && !SOURCES.has(source)) {
          return Response.json({ ok: false, error: "unknown source" }, { status: 400 });
        }

        // Códigos de barras: el proveedor no los indexa, así que primero
        // traducimos el código a un nombre de producto y buscamos por nombre.
        let term = q;
        let resolvedFrom: string | null = null;
        let keywords: string[] = [];
        if (/^\d{8,14}$/.test(q)) {
          const info = await resolveBarcode(q);
          if (info) {
            term = info.query;
            keywords = info.keywords;
            resolvedFrom = q;
          }
          // Si no se reconoce, igual intentamos con el código: algunas
          // farmacias lo tienen indexado.
        }


        // Una sola llamada agregada (/api/scraper/search) que devuelve todas
        // las farmacias a la vez: es mucho más rápida y estable que pedir
        // farmacia por farmacia (esas rutas suelen agotar el tiempo).


        const cacheKey = `${source || "all"}::${term.toLowerCase()}`;

        // En búsquedas por código de barras: primero coincidencia exacta por
        // código/SKU; si no hay, exigimos alguna palabra clave del producto.
        const relevant = (list: any[]) => {
          if (!resolvedFrom) return list;
          const exact = list.filter(
            (p: any) => String(p?.code ?? "") === resolvedFrom || String(p?.sku ?? "") === resolvedFrom,
          );
          if (exact.length) return exact;
          if (!keywords.length) return list;
          const byKeyword = list.filter((p: any) => {
            const text = normalizeText(`${p?.name ?? ""} ${p?.brand ?? ""}`);
            return keywords.some((k) => text.includes(k));
          });
          return byKeyword.length ? byKeyword : list;
        };

        const bySource = (list: any[]) =>
          relevant(source ? list.filter((p: any) => (p?.source ?? "").toLowerCase() === source) : list).slice(0, limit);

        // Consulta a UNA farmacia del proveedor (ruta por farmacia, que es la
        // que usa su comparador web y la única que devuelve datos frescos).
        const callSource = async (
          searchTerm: string,
          src: string,
          deadline: number,
        ): Promise<any[] | null> => {
          const u = new URL(`${API_ROOT}/${src}`);
          u.searchParams.set("product", searchTerm);
          let r: Response | null = null;
          for (let attempt = 0; attempt < 2; attempt++) {
            if (Date.now() > deadline) break;
            const left = Math.max(5_000, Math.min(SEARCH_TIMEOUT_MS, deadline - Date.now()));
            // El regulador adaptativo decide cuándo puede salir esta llamada.
            r = await scheduleUpstream(async () => {
              try {
                return await scraperFetch(u.toString(), {}, left);
              } catch (error) {
                console.warn(`[search-prices-api] ${src} attempt ${attempt + 1} failed:`, error);
                reportFailure();
                return null;
              }
            }, deadline);
            if (r && r.status !== 429 && r.status !== 503 && r.status !== 403) {
              reportSuccess();
              break;
            }
            if (r) reportThrottled();
            const wait = Math.min(800 * 2 ** attempt, 3000);
            if (Date.now() + wait > deadline) break;
            await new Promise((rs) => setTimeout(rs, wait));
          }

          if (!r || !r.ok) {
            const body = r ? await r.text().catch(() => "") : "";
            console.warn(`[search-prices-api] ${src} HTTP ${r?.status} body=${body.slice(0, 160)}`);
            return null;
          }
          const json: any = await r.json().catch(() => null);
          const raw = Array.isArray(json?.products) ? json.products : [];
          return raw
            .filter((p2: any) => p2?.name && p2.name !== "No encontrado" && p2.name !== "Error en consulta")
            // Algunas farmacias devuelven un nombre comercial en "source"
            // (ej. "Farmacias Nuevo Siglo"): normalizamos al identificador.
            .map((p2: any) => {
              const raw = String(p2?.source ?? "").toLowerCase();
              return { ...p2, source: SOURCES.has(raw) ? raw : src };
            });
        };

        // Sin farmacia específica: consultamos todas en paralelo (de a 3, como
        // el comparador original). La ruta agregada del proveedor devuelve una
        // caché vacía y no sirve como fuente.
        const callUpstream = async (
          searchTerm: string,
        ): Promise<{ products: any[]; cached: boolean } | null> => {
          const deadline = Date.now() + TOTAL_BUDGET_MS;
          if (source) {
            const products = await callSource(searchTerm, source, deadline);
            return products ? { products, cached: false } : null;
          }
          const ids = [...SOURCES];
          const all: any[] = [];
          let anyOk = false;
          let idx = 0;
          const worker = async () => {
            while (idx < ids.length && Date.now() < deadline) {
              const src = ids[idx++]!;
              const products = await callSource(searchTerm, src, deadline);
              if (products) {
                anyOk = true;
                all.push(...products);
              }
            }
          };
          await Promise.all([worker(), worker(), worker()]);
          return anyOk ? { products: all, cached: false } : null;
        };


        // Consulta al proveedor, compartida entre peticiones simultáneas
        // del mismo término (una sola llamada aunque busquen 50 personas).
        const fetchUpstream = (): Promise<unknown[] | null> => {
          const existing = inflight.get(cacheKey);
          if (existing) return existing;
          const p = (async () => {
            try {
              let out = await callUpstream(term);
              // Si el origen responde vacío, repetimos exactamente la misma
              // consulta. Alterar el término podía mezclar productos ajenos.
              if (source && out && out.products.length === 0) {
                const retry = await callUpstream(term);
                if (retry?.products.length) out = retry;
              }
              if (!out) return null;
              const products = out.products;
              // No guardamos respuestas vacías: así conservamos el último
              // resultado bueno y reintentamos más tarde.
              if (products.length) {
                cache.set(cacheKey, { at: Date.now(), products });
                if (cache.size > 800) {
                  // Purga los más antiguos (nunca borramos por edad: el último
                  // resultado bueno sirve de respaldo si el proveedor falla).
                  const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 200);
                  for (const [k] of oldest) cache.delete(k);
                }
              }
              return products;
            } catch (err) {
              console.warn(`[search-prices-api] fetch failed for "${q}":`, err);
              return null;
            } finally {
              inflight.delete(cacheKey);
            }
          })();
          inflight.set(cacheKey, p);
          return p;
        };


        const hit = cache.get(cacheKey);
        const age = hit ? Date.now() - hit.at : Infinity;

        // Caché fresco → respuesta inmediata.
        if (hit && age < CACHE_TTL_MS) {
          const products = bySource(hit.products as any[]);
          return Response.json({ ok: true, product: term, barcode: resolvedFrom, source: source || null, cached: true, count: products.length, products });
        }

        // Caché vencido pero aún útil → respondemos ya y refrescamos por detrás.
        if (hit && age < STALE_TTL_MS) {
          void fetchUpstream();
          const stale = bySource(hit.products as any[]);
          return Response.json({ ok: true, product: term, barcode: resolvedFrom, source: source || null, cached: true, stale: true, count: stale.length, products: stale });
        }

        const products = await fetchUpstream();
        // Si el proveedor falla o devuelve vacío pero antes sí tuvimos
        // resultados, servimos el último resultado bueno (sin importar su edad):
        // nunca mostramos "sin resultados" cuando ya sabemos que existen.
        if ((!products || products.length === 0) && hit && hit.products.length) {
          const stale = bySource(hit.products as any[]);
          return Response.json({ ok: true, product: term, barcode: resolvedFrom, source: source || null, cached: true, stale: true, count: stale.length, products: stale });
        }
        if (!products) {
          return Response.json({ ok: false, product: term, barcode: resolvedFrom, count: 0, products: [], error: "search temporarily unavailable" });
        }
        const out = bySource(products as any[]);
        return Response.json({ ok: true, product: term, barcode: resolvedFrom, source: source || null, count: out.length, products: out });


      },
    },
  },
});