import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type MedicationMeta = {
  slug: string;
  name: string;
  active_ingredient: string;
  presentation: string | null;
  category: string | null;
  indication: string | null;
  manufacturer: string | null;
  image_url: string | null;
} | null;

/** Datos mínimos del medicamento para generar metadatos de la página. */
export const getMedicationMeta = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }): Promise<MedicationMeta> => {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
      const supabase = createClient(process.env["SUPABASE_URL"]!, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) => {
            const headers = new Headers(init?.headers);
            if (key.startsWith("sb_") && headers.get("Authorization") === "Bearer " + key) {
              headers.delete("Authorization");
            }
            headers.set("apikey", key);
            return fetch(input, { ...init, headers });
          },
        },
      });
      const { data: m } = await supabase
        .from("medications")
        .select("slug,name,active_ingredient,presentation,category,indication,indication_es,manufacturer,image_url")
        .eq("slug", data.slug)
        .maybeSingle();
      if (!m) return null;
      return {
        slug: m.slug,
        name: m.name,
        active_ingredient: m.active_ingredient,
        presentation: m.presentation ?? null,
        category: m.category ?? null,
        indication: m.indication_es ?? m.indication ?? null,
        manufacturer: m.manufacturer ?? null,
        image_url: m.image_url ?? null,
      };
    } catch (err) {
      console.error("getMedicationMeta failed:", err);
      return null;
    }
  });
