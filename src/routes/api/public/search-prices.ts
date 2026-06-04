import { createFileRoute } from "@tanstack/react-router";

const API_BASE = "https://admin.clubestarbien.com/api/scraper/search";
const SEARCH_TIMEOUT_MS = 25_000;

const ALLOWED_SOURCES = new Set([
  "farmatodo",
  "locatel",
  "farmago",
  "farmaciasaas",
  "tufarmaciaactual",
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
        const requestedSources = (incoming.searchParams.get("sources") ?? "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter((s) => ALLOWED_SOURCES.has(s));

        const upstreamUrl = new URL(API_BASE);
        upstreamUrl.searchParams.set("product", q);
        if (requestedSources.length) upstreamUrl.searchParams.set("sources", requestedSources.join(","));

        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
          let res: Response;
          try {
            res = await fetch(upstreamUrl.toString(), {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
              signal: ctrl.signal,
            });
          } finally {
            clearTimeout(tid);
          }

          if (!res.ok) {
            const body = await res.text().catch(() => "");
            console.warn(`[search-prices-api] HTTP ${res.status} body=${body.slice(0, 200)}`);
            return Response.json({ ok: false, product: q, count: 0, products: [], error: "search temporarily unavailable" });
          }

          const json = await res.json();
          const products = Array.isArray(json?.products) ? json.products.slice(0, limit) : [];
          return Response.json({ ok: true, product: q, count: products.length, products });
        } catch (err) {
          console.warn(`[search-prices-api] fetch failed for "${q}":`, err);
          return Response.json({ ok: false, product: q, count: 0, products: [], error: "search temporarily unavailable" });
        }
      },
    },
  },
});