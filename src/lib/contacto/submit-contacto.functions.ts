import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const InputSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    email: z.string().trim().max(255).optional().or(z.literal('')),
    whatsapp: z.string().trim().max(40).optional().or(z.literal('')),
    topic: z.string().trim().max(100).optional().or(z.literal('')),
    subject: z.string().trim().min(2).max(200),
    message: z.string().trim().max(2000).optional().or(z.literal('')),
  })
  .refine((d) => Boolean(d.email?.length) || Boolean(d.whatsapp?.length), {
    message: 'Indica un correo o un WhatsApp',
  })

export const submitContacto = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { enqueueTransactionalEmail } = await import('@/lib/email/enqueue.server')

    const clean = (s?: string) => (s && s.length ? s : undefined)

    const result = await enqueueTransactionalEmail({
      supabase: supabaseAdmin,
      templateName: 'contacto',
      recipientEmail: 'somosninjalab@gmail.com',
      idempotencyKey: `contacto-${crypto.randomUUID()}`,
      templateData: {
        name: data.name,
        email: clean(data.email),
        whatsapp: clean(data.whatsapp),
        topic: clean(data.topic),
        subject: data.subject,
        message: clean(data.message),
        createdAt: new Date().toLocaleString('es-VE'),
      },
    })

    if (!result.success) {
      console.error('contacto email failed', result)
      throw new Error('No pudimos enviar tu mensaje. Intenta de nuevo.')
    }

    return { success: true as const }
  })
