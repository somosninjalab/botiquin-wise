import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const LOGO_URL = 'https://tgbgjztpacrdaqlxduvb.supabase.co/storage/v1/object/public/email-assets/alertamedicina-logo.png'

const SITE_NAME = '¡Alerta: Medicina!'
const SITE_URL = 'https://alertamedicina.com'

interface Props {
  name?: string
}

const NuevaVersionEmail = ({ name }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Ya estamos al 100%: nueva versión de {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Alerta Medicina" style={logo} />
        <Heading style={h1}>{name ? `¡Buenas noticias, ${name}!` : '¡Buenas noticias!'}</Heading>
        <Text style={text}>
          Ya está disponible la <strong>nueva versión de {SITE_NAME}</strong>. Corregimos
          todos los errores y fallas técnicas que estábamos presentando y la plataforma
          se encuentra <strong>funcionando al 100%</strong>.
        </Text>
        <Text style={text}>
          Ahora la búsqueda es más rápida y muestra los precios de las farmacias
          a medida que van llegando, para que compares y pagues siempre el mejor precio.
        </Text>
        <Text style={text}>
          Gracias por tu paciencia y por seguir con nosotros. 💚
        </Text>
        <Button href={SITE_URL} style={btn}>Probar la nueva versión</Button>
        <Hr style={hr} />
        <Text style={footer}>
          Recibes este correo porque estás registrado en {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NuevaVersionEmail,
  subject: '¡Ya estamos al 100%! Nueva versión de ¡Alerta: Medicina!',
  displayName: 'Nueva versión (todo corregido)',
  previewData: { name: 'María' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const logo = { width: '160px', maxWidth: '100%', height: 'auto', margin: '0 1px 20px 1px', display: 'block' as const }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }
const btn = { backgroundColor: '#0f766e', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', fontSize: '15px', textDecoration: 'none', display: 'inline-block', marginTop: '8px', fontWeight: 'bold' as const }
const hr = { borderColor: '#e2e8f0', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '0' }