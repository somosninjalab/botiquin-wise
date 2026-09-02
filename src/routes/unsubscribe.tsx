import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import { MailX } from 'lucide-react'

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Gestionar suscripción — ¡Alerta: Medicina!" },
      { name: "description", content: "Gestiona tus preferencias de correo de ¡Alerta: Medicina!. Cancela tu suscripción desde el enlace al pie de cualquiera de nuestros correos." },
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

function UnsubscribePage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card className="p-8 text-center">
        <MailX className="h-10 w-10 mx-auto text-primary" />
        <h1 className="text-xl font-semibold mt-3">Gestiona tus correos</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Para dejar de recibir nuestros correos, usa el enlace de “Cancelar suscripción”
          que aparece al pie de cualquier correo de ¡Alerta: Medicina!. La baja es
          inmediata y no requiere iniciar sesión.
        </p>
      </Card>
    </div>
  )
}
