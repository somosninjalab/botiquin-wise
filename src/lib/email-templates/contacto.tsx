import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  email?: string
  whatsapp?: string
  subject?: string
  topic?: string
  message?: string
  createdAt?: string
}

const ContactoEmail = ({ name, email, whatsapp, subject, topic, message, createdAt }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Nuevo contacto: {subject ?? ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nuevo mensaje de contacto</Heading>
        <Text style={text}>
          Recibido desde el formulario de contacto de ¡Alerta: Medicina!
        </Text>

        <Section style={card}>
          <Row label="Nombre" value={name ?? '—'} />
          <Row label="Correo" value={email ?? '—'} />
          <Row label="WhatsApp" value={whatsapp ?? '—'} />
          <Row label="Tipo de solicitud" value={topic ?? '—'} />
          <Row label="Asunto" value={subject ?? '—'} />
          <Row label="Mensaje" value={message ?? '—'} />
          {createdAt && <Row label="Recibido" value={createdAt} />}
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Este correo se generó automáticamente desde el formulario de contacto.
        </Text>
      </Container>
    </Body>
  </Html>
)

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text style={rowText}>
      <strong style={rowLabel}>{label}:</strong> {value}
    </Text>
  )
}

export const template = {
  component: ContactoEmail,
  to: 'somosninjalab@gmail.com',
  subject: (data: Record<string, any>) =>
    `Contacto: ${data?.subject ?? 'nuevo mensaje'}`,
  displayName: 'Formulario de contacto',
  previewData: {
    name: 'María Pérez',
    email: 'maria@ejemplo.com',
    whatsapp: '+58 412 1234567',
    topic: 'Alianzas',
    subject: 'Propuesta de alianza',
    message: 'Nos gustaría conversar sobre una alianza.',
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
