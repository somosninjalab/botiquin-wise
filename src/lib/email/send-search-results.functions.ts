import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";

const RowSchema = z.object({
  pharmacy: z.string().min(1).max(120),
  price: z.number().positive().max(1_000_000),
  currency: z.string().min(1).max(8),
  productUrl: z.string().url().max(500).optional(),
  inStock: z.boolean().optional(),
});

const MedSchema = z.object({
  medication: z.string().min(1).max(200),
  ingredient: z.string().max(200).optional(),
  rows: z.array(RowSchema).min(1).max(20),
});

const InputSchema = z.object({
  query: z.string().max(200).optional(),
  meds: z.array(MedSchema).min(1).max(10),
});

export const sendSearchResultsEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("email, full_name").eq("user_id", userId).maybeSingle();
    if (!profile?.email) return { success: false, reason: "no_email" };

    const r = await enqueueTransactionalEmail({
      supabase: supabaseAdmin,
      templateName: "search-results",
      recipientEmail: profile.email,
      idempotencyKey: `search-${userId}-${Date.now()}`,
      templateData: { query: data.query, meds: data.meds },
    });
    return r;
  });