import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = '¡Alerta: Medicina!'
const SITE_URL = 'https://alertamedicina.com'

interface PriceAlertItem {
  medication: string
  ingredient?: string
  pharmacy: string
  previousPrice: number
  newPrice: number
  pctChange: number
  currency: string
  productUrl?: string
}

interface Props {
  name?: string
  items?: PriceAlertItem[]
}

function fmt(price: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(price)
  } catch {
    return `${currency} ${price.toFixed(2)}`
  }
}

const PriceAlertEmail = ({ name, items = [] }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Cambios de precio en los medicamentos que sigues</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `Hola ${name},` : 'Hola,'}</Heading>
        <Text style={text}>
          Detectamos cambios de precio en los medicamentos que sigues. Aquí el resumen:
        </Text>

        {items.map((it, i) => {
          const isDown = it.pctChange < 0
          return (
            <Section key={i} style={card}>
              <Text style={medName}>{it.medication}</Text>
              {it.ingredient && <Text style={ingredient}>{it.ingredient}</Text>}
              <Text style={pharmacy}>📍 {it.pharmacy}</Text>
              <Text style={priceRow}>
                <span style={oldPrice}>{fmt(it.previousPrice, it.currency)}</span>
                {' → '}
                <span style={newPriceStyle}>{fmt(it.newPrice, it.currency)}</span>
                {' '}
                <span style={isDown ? badgeDown : badgeUp}>
                  {isDown ? '▼' : '▲'} {Math.abs(it.pctChange).toFixed(1)}%
                </span>
              </Text>
              {it.productUrl && (
                <Button href={it.productUrl} style={btn}>Ver en farmacia</Button>
              )}
            </Section>
          )
        })}

        <Hr style={hr} />
        <Text style={footer}>
          Recibes este email porque sigues medicamentos en {SITE_NAME}.
        </Text>
        <Button href={SITE_URL} style={btnSecondary}>Ir a {SITE_NAME}</Button>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PriceAlertEmail,
  subject: (data: Record<string, any>) => {
    const n = (data?.items?.length ?? 0) as number
    return n > 0 ? `🔔 ${n} cambio${n === 1 ? '' : 's'} de precio en tus medicamentos` : '🔔 Alerta de precio'
  },
  displayName: 'Alerta de cambio de precio',
  previewData: {
    name: 'María',
    items: [{
      medication: 'Ibuprofeno 400 mg',
      ingredient: 'Ibuprofeno',
      pharmacy: 'Farmatodo',
      previousPrice: 4.50,
      newPrice: 3.20,
      pctChange: -28.9,
      currency: 'USD',
      productUrl: 'https://example.com',
    }],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px' }
const card = { padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', margin: '0 0 14px', backgroundColor: '#f8fafc' }
const medName = { fontSize: '16px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 2px' }
const ingredient = { fontSize: '12px', color: '#64748b', margin: '0 0 8px' }
const pharmacy = { fontSize: '13px', color: '#475569', margin: '0 0 8px' }
const priceRow = { fontSize: '15px', color: '#0f172a', margin: '0 0 12px' }
const oldPrice = { textDecoration: 'line-through', color: '#94a3b8' }
const newPriceStyle = { fontWeight: 'bold' as const, color: '#0f172a' }
const badgeDown = { backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' as const, marginLeft: '6px' }
const badgeUp = { backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' as const, marginLeft: '6px' }
const btn = { backgroundColor: '#0f766e', color: '#ffffff', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }
const btnSecondary = { backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', fontSize: '14px', textDecoration: 'none', display: 'inline-block', marginTop: '8px' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '0 0 12px' }