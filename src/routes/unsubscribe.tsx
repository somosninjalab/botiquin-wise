import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { fallback, zodValidator } from '@tanstack/zod-adapter'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

const schema = z.object({ token: fallback(z.string(), '').default('') })

export const Route = createFileRoute('/unsubscribe')({
  validateSearch: zodValidator(schema),
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Gestionar suscripción — ¡Alerta: Medicina!" },
      { name: "description", content: "Gestiona tus preferencias de correo de ¡Alerta: Medicina!. Confirma o cancela tu suscripción a nuestras alertas de precios." },
      { property: "og:title", content: "Gestionar suscripción — ¡Alerta: Medicina!" },
      { property: "og:description", content: "Gestiona tus preferencias de correo de ¡Alerta: Medicina!." },
      { property: "og:url", content: "https://alertamedicina.com/unsubscribe" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Gestionar suscripción — ¡Alerta: Medicina!" },
      { name: "twitter:description", content: "Gestiona tus preferencias de correo de ¡Alerta: Medicina!." },
    ],
    links: [{ rel: "canonical", href: "https://alertamedicina.com/unsubscribe" }],
  }),
})

type State = 'checking' | 'valid' | 'already' | 'invalid' | 'submitting' | 'done' | 'error'

function UnsubscribePage() {
  const { token } = Route.useSearch()
  const [state, setState] = useState<State>('checking')

  useEffect(() => {
    if (!token) { setState('invalid'); return }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.valid) setState('valid')
        else if (j.reason === 'already_unsubscribed') setState('already')
        else setState('invalid')
      })
      .catch(() => setState('error'))
  }, [token])

  async function confirm() {
    setState('submitting')
    try {
      const r = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const j = await r.json()
      if (j.success || j.reason === 'already_unsubscribed') setState('done')
      else setState('error')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card className="p-8 text-center">
        {state === 'checking' && <><Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" /><p className="mt-3 text-muted-foreground">Validando enlace…</p></>}
        {state === 'valid' && (
          <>
            <h1 className="text-xl font-semibold mb-2">¿Confirmas la desuscripción?</h1>
            <p className="text-sm text-muted-foreground mb-6">Dejarás de recibir correos de ¡Alerta: Medicina! en esta dirección.</p>
            <Button onClick={confirm} variant="destructive">Confirmar desuscripción</Button>
          </>
        )}
        {state === 'submitting' && <><Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" /><p className="mt-3 text-muted-foreground">Procesando…</p></>}
        {state === 'done' && <><CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" /><h1 className="text-xl font-semibold mt-3">Listo</h1><p className="text-sm text-muted-foreground mt-2">No recibirás más correos en esta dirección.</p></>}
        {state === 'already' && <><CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground" /><p className="mt-3 text-muted-foreground">Ya estás desuscrito.</p></>}
        {state === 'invalid' && <><XCircle className="h-10 w-10 mx-auto text-destructive" /><p className="mt-3 text-muted-foreground">Enlace inválido o expirado.</p></>}
        {state === 'error' && <><XCircle className="h-10 w-10 mx-auto text-destructive" /><p className="mt-3 text-muted-foreground">Ocurrió un error. Intenta más tarde.</p></>}
      </Card>
    </div>
  )
}