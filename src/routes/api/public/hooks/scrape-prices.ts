import { createFileRoute } from "@tanstack/react-router";
import Firecrawl from "@mendable/firecrawl-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type PharmRow = { id: string; slug: string; name: string; website_url: string | null };
type MedRow = { id: string; name: string; active_ingredient: string; presentation: string | null };

// Strip protocol + www to use as a `site:` filter.
function siteHost(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const extractionPrompt = `From this pharmacy product page or search result, extract the LOWEST listed price for the medication. Return JSON with fields:
- price (number): numeric price value, no symbols
- currency (string): "USD" if dollars, "VES" if bolívares, "COP" if Colombian pesos, otherwise best guess
- in_stock (boolean): true unless explicitly out of stock
- product_url (string): canonical URL of the product, or empty string
If no price is visible, set price to 0.`;

async function scrapeOne(
  fc: Firecrawl,
  med: MedRow,
  pharm: PharmRow
): Promise<{ price: number; currency: string; in_stock: boolean; product_url: string } | null> {
  const host = siteHost(pharm.website_url);
  if (!host) return null;
  const query = `${med.name} ${med.active_ingredient}`.trim();
  try {
    const res: any = await fc.search(`site:${host} ${query}`, {
      limit: 1,
      scrapeOptions: {
        formats: [
          { type: "json", prompt: extractionPrompt } as any,
          "markdown",
        ] as any,
        onlyMainContent: true,
      } as any,
    } as any);
    const items: any[] = res?.web ?? res?.data ?? res?.results?.web ?? [];
    const first = items[0];
    if (!first) return null;
    const j = first.json ?? first.extract ?? first.data?.json;
    if (!j || typeof j.price !== "number" || j.price <= 0) return null;
    return {
      price: Number(j.price),
      currency: String(j.currency || "USD").toUpperCase().slice(0, 8),
      in_stock: j.in_stock !== false,
      product_url: String(j.product_url || first.url || ""),
    };
  } catch (e) {
    console.error(`[scrape] ${pharm.slug} / ${med.name}`, (e as Error).message);
    return null;
  }
}

export const Route = createFileRoute("/api/public/hooks/scrape-prices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          return Response.json({ ok: false, error: "FIRECRAWL_API_KEY missing" }, { status: 500 });
        }
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 0) || 100, 100);
        const medSlug = url.searchParams.get("med");

        const fc = new Firecrawl({ apiKey });

        const { data: pharms } = await supabaseAdmin
          .from("pharmacies")
          .select("id,slug,name,website_url");

        let medsQuery = supabaseAdmin
          .from("medications")
          .select("id,name,active_ingredient,presentation")
          .order("name");
        if (medSlug) medsQuery = medsQuery.eq("slug", medSlug);
        const { data: meds } = await medsQuery.limit(limit);

        const pharmList = (pharms ?? []) as PharmRow[];
        const medList = (meds ?? []) as MedRow[];

        let inserted = 0;
        let attempted = 0;
        const errors: string[] = [];

        for (const med of medList) {
          for (const pharm of pharmList) {
            attempted++;
            const result = await scrapeOne(fc, med, pharm);
            if (!result) continue;
            const { error } = await supabaseAdmin.from("medication_prices").insert({
              medication_id: med.id,
              pharmacy_id: pharm.id,
              price: result.price,
              currency: result.currency,
              in_stock: result.in_stock,
              product_url: result.product_url || null,
            });
            if (error) errors.push(`${pharm.slug}/${med.name}: ${error.message}`);
            else inserted++;
          }
        }

        return Response.json({
          ok: true,
          attempted,
          inserted,
          medications: medList.length,
          pharmacies: pharmList.length,
          errors: errors.slice(0, 10),
        });
      },
    },
  },
});
