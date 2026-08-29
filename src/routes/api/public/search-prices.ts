import { createFileRoute } from "@tanstack/react-router";
import { getScraperToken, scraperFetch } from "@/lib/scraper-session.server";

const API_ROOT = "https://admin.clubestarbien.com/api/scraper";
// Tiempo máximo por intento y tiempo total antes de responder al usuario.
const SEARCH_TIMEOUT_MS = 18_000;
const TOTAL_BUDGET_MS = 35_000;

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

// Cola global: solo una petición al proveedor a la vez por instancia,
// con un espacio mínimo entre llamadas para no disparar su límite.
const MIN_GAP_MS = 1200;
let lastCallAt = 0;
let chain: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const step = async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastCallAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await fn();
    } finally {
      lastCallAt = Date.now();
    }
  };
  const run = chain.then(step, step);
  chain = run.catch(() => undefined);
  return run;
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

        // Una sola llamada agregada (/api/scraper/search) que devuelve todas
        // las farmacias a la vez: es mucho más rápida y estable que pedir
        // farmacia por farmacia (esas rutas suelen agotar el tiempo).
        const upstreamUrl = new URL(`${API_ROOT}/search`);
        upstreamUrl.searchParams.set("product", q);

        const cacheKey = `all::${q.toLowerCase()}`;
        const bySource = (list: any[]) =>
          (source ? list.filter((p: any) => (p?.source ?? "").toLowerCase() === source) : list).slice(0, limit);

        // Consulta al proveedor, compartida entre peticiones simultáneas
        // del mismo término (una sola llamada aunque busquen 50 personas).
        const fetchUpstream = (): Promise<unknown[] | null> => {
          const existing = inflight.get(cacheKey);
          if (existing) return existing;
          const p = (async () => {
            try {
              const deadline = Date.now() + TOTAL_BUDGET_MS;
              const res = await enqueue(async () => {
                let r: Response | null = null;
                for (let attempt = 0; attempt < 4; attempt++) {
                  if (Date.now() > deadline) break;
                  const left = Math.max(3_000, Math.min(SEARCH_TIMEOUT_MS, deadline - Date.now()));
                  // scraperFetch mantiene la sesión y la renueva ante 401/403.
                  r = await scraperFetch(upstreamUrl.toString(), {}, left);
                  if (!r) break;
                  if (r.status !== 429 && r.status !== 503) break;
                  const wait = Math.min(800 * 2 ** attempt, 4000) + Math.floor(Math.random() * 300);
                  if (Date.now() + wait > deadline) break;
                  await new Promise((rs) => setTimeout(rs, wait));
                }
                return r;
              });
              if (!res || !res.ok) {
                const body = res ? await res.text().catch(() => "") : "";
                console.warn(`[search-prices-api] HTTP ${res?.status} body=${body.slice(0, 200)}`);
                return null;
              }
              const json = await res.json();
              const raw = Array.isArray(json?.products) ? json.products : [];
              const products = raw.filter(
                (p2: any) => p2?.name && p2.name !== "No encontrado" && p2.name !== "Error en consulta",
              );
              cache.set(cacheKey, { at: Date.now(), products });
              if (cache.size > 500) {
                for (const [k, v] of cache) if (Date.now() - v.at > STALE_TTL_MS) cache.delete(k);
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
          return Response.json({ ok: true, product: q, source: source || null, cached: true, count: products.length, products });
        }

        // Caché vencido pero aún útil → respondemos ya y refrescamos por detrás.
        if (hit && age < STALE_TTL_MS) {
          void fetchUpstream();
          const stale = bySource(hit.products as any[]);
          return Response.json({ ok: true, product: q, source: source || null, cached: true, stale: true, count: stale.length, products: stale });
        }

        const products = await fetchUpstream();
        if (!products) {
          if (hit) {
            const stale = bySource(hit.products as any[]);
            return Response.json({ ok: true, product: q, source: source || null, cached: true, stale: true, count: stale.length, products: stale });
          }
          return Response.json({ ok: false, product: q, count: 0, products: [], error: "search temporarily unavailable" });
        }
        const out = bySource(products as any[]);
        return Response.json({ ok: true, product: q, source: source || null, count: out.length, products: out });

      },
    },
  },
});