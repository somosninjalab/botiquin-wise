import * as React from 'react'
import { renderAsync } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = '¡Alerta: Medicina!'
const SENDER_DOMAIN = 'notify.alertamedicina.com'
const FROM_DOMAIN = 'alertamedicina.com'
const FROM_LOCAL = 'tualerta'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

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

export async function enqueueTransactionalEmail(p: EnqueueParams): Promise<EnqueueResult> {
  const { supabase, templateName, recipientEmail } = p
  const templateData = p.templateData ?? {}
  const messageId = crypto.randomUUID()
  const idempotencyKey = p.idempotencyKey || messageId

  const template = TEMPLATES[templateName]
  if (!template) return { success: false, reason: 'template_not_found', status: 404, error: `Template '${templateName}' not registered` }

  const effectiveRecipient = template.to || recipientEmail
  if (!effectiveRecipient) return { success: false, reason: 'recipient_missing', status: 400 }

  const normalizedEmail = effectiveRecipient.toLowerCase()

  // Suppression check
  const { data: suppressed, error: supErr } = await supabase
    .from('suppressed_emails').select('id').eq('email', normalizedEmail).maybeSingle()
  if (supErr) {
    console.error('Suppression check failed', supErr)
    return { success: false, reason: 'suppression_check_failed', status: 500 }
  }
  if (suppressed) {
    await supabase.from('email_send_log').insert({
      message_id: messageId, template_name: templateName, recipient_email: effectiveRecipient, status: 'suppressed',
    })
    return { success: false, reason: 'email_suppressed' }
  }

  // Get-or-create unsubscribe token
  let unsubscribeToken: string
  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens').select('token, used_at').eq('email', normalizedEmail).maybeSingle()
  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token
  } else if (!existing) {
    unsubscribeToken = generateToken()
    await supabase.from('email_unsubscribe_tokens').upsert(
      { token: unsubscribeToken, email: normalizedEmail },
      { onConflict: 'email', ignoreDuplicates: true },
    )
    const { data: stored } = await supabase
      .from('email_unsubscribe_tokens').select('token').eq('email', normalizedEmail).maybeSingle()
    if (stored?.token) unsubscribeToken = stored.token
  } else {
    return { success: false, reason: 'email_suppressed' }
  }

  // Render
  const element = React.createElement(template.component, templateData)
  const html = await renderAsync(element)
  const text = await renderAsync(element, { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  await supabase.from('email_send_log').insert({
    message_id: messageId, template_name: templateName, recipient_email: effectiveRecipient, status: 'pending',
  })

  const { error: enqErr } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: effectiveRecipient,
      from: `${SITE_NAME} <${FROM_LOCAL}@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqErr) {
    console.error('Enqueue failed', enqErr, redactEmail(effectiveRecipient))
    await supabase.from('email_send_log').insert({
      message_id: messageId, template_name: templateName, recipient_email: effectiveRecipient,
      status: 'failed', error_message: 'Failed to enqueue email',
    })
    return { success: false, reason: 'enqueue_failed', status: 500 }
  }

  return { success: true, queued: true, messageId }
}