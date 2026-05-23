import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  type?: 'farmacia' | 'drogueria'
  name?: string
  city?: string
  reference?: string
  hasDigital?: boolean | null
  whatsapp?: string
  wantsBoost?: boolean | null
  details?: string
  createdAt?: string
}

function yesNo(v: boolean | null | undefined) {
  if (v === true) return 'Sí'
  if (v === false) return 'No'
  return '—'
}

const PartnerLeadEmail = ({
  type = 'farmacia', name, city, reference, hasDigital, whatsapp, wantsBoost, details, createdAt,
}: Props) => {
  const isFarmacia = type === 'farmacia'
  const title = isFarmacia ? 'Nueva farmacia interesada' : 'Nueva droguería interesada'
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>{title}: {name ?? ''}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{title}</Heading>
          <Text style={text}>
            Recibimos un nuevo interés desde el sitio web de ¡Alerta: Medicina!
          </Text>

          <Section style={card}>
            <Row label="Tipo" value={isFarmacia ? 'Farmacia' : 'Droguería'} />
            <Row label="Nombre" value={name ?? '—'} />
            <Row label="Ciudad" value={city ?? '—'} />
            {isFarmacia && <Row label="Punto de referencia" value={reference ?? '—'} />}
            {isFarmacia && <Row label="¿Tiene sistemas digitales?" value={yesNo(hasDigital)} />}
            <Row label="WhatsApp" value={whatsapp ?? '—'} />
            {isFarmacia && <Row label="¿Le interesa impulso a su farmacia?" value={yesNo(wantsBoost)} />}
            <Row label="Detalles / ¿Cómo podemos ayudarlos?" value={details ?? '—'} />
            {createdAt && <Row label="Recibido" value={createdAt} />}
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Este correo se generó automáticamente desde el formulario de partners.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text style={rowText}>
      <strong style={rowLabel}>{label}:</strong> {value}
    </Text>
  )
}

export const template = {
  component: PartnerLeadEmail,
  to: 'somosninjalab@gmail.com',
  subject: (data: Record<string, any>) =>
    data?.type === 'drogueria' ? 'Nueva droguería interesada' : 'Nueva farmacia interesada',
  displayName: 'Lead de farmacia/droguería',
  previewData: {
    type: 'farmacia',
    name: 'Farmacia Ejemplo',
    city: 'Caracas',
    reference: 'Av. Principal, frente a la plaza',
    hasDigital: true,
    whatsapp: '+58 412 1234567',
    wantsBoost: true,
    details: 'Queremos aparecer en el comparador.',
    createdAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px' }
const card = { padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', margin: '0 0 14px', backgroundColor: '#f8fafc' }
const rowText = { fontSize: '14px', color: '#0f172a', margin: '0 0 8px', lineHeight: '1.5' }
const rowLabel = { color: '#475569' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '0 0 12px' }