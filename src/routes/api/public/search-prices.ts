import { createFileRoute } from "@tanstack/react-router";

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

export const Route = createFileRoute("/api/public/search-prices")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = process.env.PRICE_SCRAPER_API_TOKEN;

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

        try {
          // El API upstream limita las peticiones simultáneas (429): reintentamos
          // con espera creciente hasta que nos atienda.
          let res: Response | null = null;
          for (let attempt = 0; attempt < 5; attempt++) {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
            try {
              res = await fetch(upstreamUrl.toString(), {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                signal: ctrl.signal,
              });
            } finally {
              clearTimeout(tid);
            }
            if (res.status !== 429 && res.status !== 503) break;
            const wait = 700 * (attempt + 1) + Math.floor(Math.random() * 400);
            await new Promise((r) => setTimeout(r, wait));
          }

          if (!res || !res.ok) {
            const body = res ? await res.text().catch(() => "") : "";
            console.warn(`[search-prices-api] HTTP ${res?.status} body=${body.slice(0, 200)}`);
            return Response.json({ ok: false, product: q, count: 0, products: [], error: "search temporarily unavailable" });
          }

          const json = await res.json();
          const raw = Array.isArray(json?.products) ? json.products : [];
          const products = raw
            .filter((p: any) => p?.name !== "No encontrado" && p?.name !== "Error en consulta")
            .map((p: any) => (source ? { ...p, source } : p))
            .slice(0, limit);
          return Response.json({ ok: true, product: q, source: source || null, count: products.length, products });
        } catch (err) {
          console.warn(`[search-prices-api] fetch failed for "${q}":`, err);
          return Response.json({ ok: false, product: q, count: 0, products: [], error: "search temporarily unavailable" });
        }
      },
    },
  },
});