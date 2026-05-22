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

const WeeklyReminderEmail = ({ name }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Antes de comprar tu medicina, compara en {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `Hola ${name},` : 'Hola,'}</Heading>
        <Text style={text}>
          Esta semana, antes de pagar de más por tus medicinas, recuerda revisar los
          precios en <strong>{SITE_NAME}</strong>. Comparamos farmacias para que siempre
          pagues el mejor precio.
        </Text>
        <Text style={text}>
          👉 Antes de comprar medicinas, <strong>¡Alerta: Medicina!</strong>
        </Text>
        <Button href={SITE_URL} style={btn}>Comparar precios ahora</Button>
        <Hr style={hr} />
        <Text style={footer}>
          Recibes este recordatorio semanal porque estás registrado en {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WeeklyReminderEmail,
  subject: 'Antes de comprar medicinas, ¡Alerta: Medicina!',
  displayName: 'Recordatorio semanal',
  previewData: { name: 'María' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }
const btn = { backgroundColor: '#0f766e', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', fontSize: '15px', textDecoration: 'none', display: 'inline-block', marginTop: '8px', fontWeight: 'bold' as const }
const hr = { borderColor: '#e2e8f0', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '0' }