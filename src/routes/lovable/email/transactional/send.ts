import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { enqueueTransactionalEmail } from '@/lib/email/enqueue.server'

export const Route = createFileRoute('/lovable/email/transactional/send')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const token = authHeader.slice('Bearer '.length).trim()
        const supabase = createClient<any>(supabaseUrl, supabaseServiceKey) as any

        // Accept either a user JWT or the service role key (for server-to-server triggers)
        let isAuthorized = false
        if (token === supabaseServiceKey) {
          isAuthorized = true
        } else {
          const { data: { user }, error } = await supabase.auth.getUser(token)
          if (!error && user) isAuthorized = true
        }
        if (!isAuthorized) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let templateName: string, recipientEmail: string, idempotencyKey: string | undefined, templateData: Record<string, any> = {}
        try {
          const body = await request.json()
          templateName = body.templateName || body.template_name
          recipientEmail = body.recipientEmail || body.recipient_email
          idempotencyKey = body.idempotencyKey || body.idempotency_key
          if (body.templateData && typeof body.templateData === 'object') templateData = body.templateData
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        if (!templateName) return Response.json({ error: 'templateName is required' }, { status: 400 })

        const result = await enqueueTransactionalEmail({
          supabase, templateName, recipientEmail, templateData, idempotencyKey,
        })

        if (!result.success) {
          return Response.json(result, { status: result.status ?? 200 })
        }
        return Response.json(result)
      },
    },
  },
})
