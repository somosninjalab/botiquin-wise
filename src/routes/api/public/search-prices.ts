import { createFileRoute } from "@tanstack/react-router";
import { getScraperToken, scraperFetch } from "@/lib/scraper-session.server";

const API_ROOT = "https://admin.clubestarbien.com/api/scraper";
const SEARCH_TIMEOUT_MS = 60_000;

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

// Caché corto en memoria: evita repetir consultas idénticas al proveedor,
// que limita fuertemente las peticiones simultáneas.
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; products: unknown[] }>();

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
          console.warn("[search-prices-api] missing PRICE_SCRAPER_API_TOKEN");
          return Response.json({ ok: false, product: q, count: 0, products: [], error: "search temporarily unavailable" });
        }

        const limit = Math.min(Number(incoming.searchParams.get("limit") ?? 80) || 80, 120);
        const source = (incoming.searchParams.get("source") ?? "").trim().toLowerCase();
        if (source && !SOURCES.has(source)) {
          return Response.json({ ok: false, error: "unknown source" }, { status: 400 });
        }

        // Igual que el comparador de precios: una llamada por farmacia
        // (/api/scraper/{source}) para poder mostrar resultados a medida que llegan.
        const upstreamUrl = new URL(`${API_ROOT}/${source || "search"}`);
        upstreamUrl.searchParams.set("product", q);

        const cacheKey = `${source || "all"}::${q.toLowerCase()}`;
        const hit = cache.get(cacheKey);
        if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
          const products = hit.products.slice(0, limit);
          return Response.json({ ok: true, product: q, source: source || null, cached: true, count: products.length, products });
        }

        try {
          // El proveedor limita las peticiones simultáneas (429): las serializamos
          // en una cola y reintentamos con espera creciente hasta que nos atienda.
          const res = await enqueue(async () => {
            let r: Response | null = null;
            for (let attempt = 0; attempt < 8; attempt++) {
              const ctrl = new AbortController();
              const tid = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
              try {
                r = await fetch(upstreamUrl.toString(), {
                  headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                  signal: ctrl.signal,
                });
              } finally {
                clearTimeout(tid);
              }
              if (r.status !== 429 && r.status !== 503) break;
              const wait = Math.min(600 * 2 ** attempt, 6000) + Math.floor(Math.random() * 400);
              await new Promise((rs) => setTimeout(rs, wait));
            }
            return r;
          });

          if (!res || !res.ok) {
            const body = res ? await res.text().catch(() => "") : "";
            console.warn(`[search-prices-api] HTTP ${res?.status} body=${body.slice(0, 200)}`);
            // Si tenemos resultados previos (aunque vencidos), los servimos igual.
            if (hit) {
              const stale = hit.products.slice(0, limit);
              return Response.json({ ok: true, product: q, source: source || null, cached: true, stale: true, count: stale.length, products: stale });
            }
            return Response.json({ ok: false, product: q, count: 0, products: [], error: "search temporarily unavailable" });
          }

          const json = await res.json();
          const raw = Array.isArray(json?.products) ? json.products : [];
          const products = raw
            .filter((p: any) => p?.name !== "No encontrado" && p?.name !== "Error en consulta")
            .map((p: any) => (source ? { ...p, source } : p));
          cache.set(cacheKey, { at: Date.now(), products });
          if (cache.size > 500) {
            for (const [k, v] of cache) if (Date.now() - v.at > CACHE_TTL_MS) cache.delete(k);
          }
          const out = products.slice(0, limit);
          return Response.json({ ok: true, product: q, source: source || null, count: out.length, products: out });
        } catch (err) {
          console.warn(`[search-prices-api] fetch failed for "${q}":`, err);
          return Response.json({ ok: false, product: q, count: 0, products: [], error: "search temporarily unavailable" });
        }
      },
    },
  },
});