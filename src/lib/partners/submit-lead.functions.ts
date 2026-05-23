import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { enqueueTransactionalEmail } from '@/lib/email/enqueue.server'

const InputSchema = z.object({
  type: z.enum(['farmacia', 'drogueria']),
  name: z.string().trim().min(1).max(200),
  city: z.string().trim().max(200).optional().or(z.literal('')),
  reference: z.string().trim().max(500).optional().or(z.literal('')),
  hasDigital: z.boolean().optional(),
  whatsapp: z.string().trim().max(40).optional().or(z.literal('')),
  wantsBoost: z.boolean().optional(),
  details: z.string().trim().max(2000).optional().or(z.literal('')),
})

export const submitPartnerLead = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const clean = (s?: string) => (s && s.length ? s : null)
    const isFarmacia = data.type === 'farmacia'

    const row = {
      type: data.type,
      name: data.name,
      city: clean(data.city),
      reference: isFarmacia ? clean(data.reference) : null,
      has_digital: isFarmacia ? (data.hasDigital ?? null) : null,
      whatsapp: clean(data.whatsapp),
      wants_boost: isFarmacia ? (data.wantsBoost ?? null) : null,
      details: clean(data.details),
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('partner_leads')
      .insert(row)
      .select('id, created_at')
      .single()

    if (error || !inserted) {
      console.error('partner_leads insert failed', error)
      return { success: false, reason: 'insert_failed' as const }
    }

    await enqueueTransactionalEmail({
      supabase: supabaseAdmin,
      templateName: 'partner-lead',
      recipientEmail: 'somosninjalab@gmail.com',
      idempotencyKey: `partner-lead-${inserted.id}`,
      templateData: {
        type: data.type,
        name: data.name,
        city: row.city ?? undefined,
        reference: row.reference ?? undefined,
        hasDigital: row.has_digital,
        whatsapp: row.whatsapp ?? undefined,
        wantsBoost: row.wants_boost,
        details: row.details ?? undefined,
        createdAt: new Date(inserted.created_at).toLocaleString('es-VE'),
      },
    })

    return { success: true as const, id: inserted.id }
  })