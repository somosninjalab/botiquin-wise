import { createFileRoute } from "@tanstack/react-router";

const API_BASE = "https://admin.clubestarbien.com/api/scraper/search";

const FALLBACK_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhcGlfY2xpZW50IiwibmFtZSI6IkFQSSIsImxhc3RfbmFtZSI6IkNsaWVudCIsInVzZXJfdHlwZV9pZCI6MSwidXNlcl90eXBlX25hbWUiOiJTdXBlckFkbWluIiwidXNlcl9wcm9maWxlX2lkIjoxLCJ0b2tlbl9zeXN0ZW0iOiIiLCJwZXJtaXNzaW9ucyI6WyJzY3JhcGVyX2FjY2VzcyJdLCJpc19hZG1pbiI6MSwicmVzdHJpY3RlZF9hZ3JlZW1lbnRzIjpbXSwiaXNfYXBpX3Rva2VuIjp0cnVlLCJpYXQiOjE3ODA2MTEzNTN9.kZ3yrvCQN8ojkm7m8wvZ0-QK46aCER2P02wXDvhqaUQ";

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
        const token = process.env.PRICE_SCRAPER_API_TOKEN ?? FALLBACK_TOKEN;

        const incoming = new URL(request.url);
        const q = (incoming.searchParams.get("q") ?? incoming.searchParams.get("product") ?? "").trim();
        if (q.length < 2 || q.length > 120) {
          return Response.json({ ok: false, error: "query length" }, { status: 400 });
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
          const tid = setTimeout(() => ctrl.abort(), 110_000);
          const res = await fetch(upstreamUrl.toString(), {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            signal: ctrl.signal,
          });
          clearTimeout(tid);

          if (!res.ok) {
            const body = await res.text().catch(() => "");
            console.warn(`[search-prices-api] HTTP ${res.status} body=${body.slice(0, 200)}`);
            return Response.json({ ok: false, error: "external api failed", status: res.status }, { status: 502 });
          }

          const json = await res.json();
          const products = Array.isArray(json?.products) ? json.products.slice(0, limit) : [];
          return Response.json({ ok: true, source: "external-api", product: q, count: products.length, products });
        } catch (err) {
          console.warn(`[search-prices-api] fetch failed for "${q}":`, err);
          return Response.json({ ok: false, error: "external api unavailable" }, { status: 502 });
        }
      },
    },
  },
});