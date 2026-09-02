import { EmailAPIError } from '@lovable.dev/email-js'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { sendTemplateEmail } from '@/lib/email-templates/send-email'

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [l, d] = email.split('@')
  if (!l || !d) return '***'
  return `${l[0]}***@${d}`
}

export interface EnqueueParams {
  supabase: any
  templateName: string
  recipientEmail: string
  templateData?: Record<string, any>
  idempotencyKey?: string
}

export type EnqueueResult =
  | { success: true; queued: true; messageId: string }
  | { success: false; reason: string; status?: number; error?: string }

async function logSend(
  supabase: any,
  row: {
    template_name: string
    recipient_email: string
    status: string
    error_message?: string
  },
) {
  const { error } = await supabase.from('email_send_log').insert(row)
  if (error) console.error('email_send_log insert failed', error)
}

/**
 * Sends a registered transactional template through Lovable's managed email
 * delivery. Keeps the app's own idempotency guard (`email_idempotency_keys`)
 * and its `email_send_log` bookkeeping.
 */
export async function enqueueTransactionalEmail(p: EnqueueParams): Promise<EnqueueResult> {
  const { supabase, templateName, recipientEmail } = p
  const templateData = p.templateData ?? {}
  const messageId = crypto.randomUUID()
  const idempotencyKey = p.idempotencyKey || messageId

  const template = TEMPLATES[templateName]
  if (!template) {
    return {
      success: false,
      reason: 'template_not_found',
      status: 404,
      error: `Template '${templateName}' not registered`,
    }
  }

  const effectiveRecipient = template.to || recipientEmail
  if (!effectiveRecipient) return { success: false, reason: 'recipient_missing', status: 400 }

  // Idempotency: si ya se envió un email con esta clave, no lo volvemos a enviar.
  if (p.idempotencyKey) {
    const { error: idemErr } = await supabase
      .from('email_idempotency_keys')
      .insert({ key: p.idempotencyKey })
    if (idemErr) {
      // Conflicto de unique → ya enviado. Cualquier otro error también lo tratamos como "no reenviar".
      return { success: false, reason: 'duplicate_idempotency_key' }
    }
  }

  try {
    const result = await sendTemplateEmail(templateName, effectiveRecipient, {
      templateData,
      idempotencyKey,
    })

    if (!result.sent) {
      await logSend(supabase, {
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'suppressed',
      })
      return { success: false, reason: 'email_suppressed' }
    }

    await logSend(supabase, {
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'sent',
    })
    return { success: true, queued: true, messageId }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Email send failed', errorMsg, redactEmail(effectiveRecipient))
    await logSend(supabase, {
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: errorMsg.slice(0, 1000),
    })
    const status = error instanceof EmailAPIError ? error.status : 500
    return { success: false, reason: 'send_failed', status: status ?? 500, error: errorMsg }
  }
}
