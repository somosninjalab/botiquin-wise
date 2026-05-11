import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = '¡Alerta: Medicina!'
const SITE_URL = 'https://alertamedicina.com'

interface ResultRow {
  pharmacy: string
  price: number
  currency: string
  productUrl?: string
  inStock?: boolean
}

interface MedBlock {
  medication: string
  ingredient?: string
  rows: ResultRow[]
}

interface Props {
  query?: string
  meds?: MedBlock[]
}

function fmt(p: number, c: string) {
  try {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(p)
  } catch {
    return `${c} ${p.toFixed(2)}`
  }
}

const SearchResultsEmail = ({ query, meds = [] }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Resultados de tu búsqueda en {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Tu búsqueda reciente</Heading>
        {query && <Text style={text}>Buscaste: <strong>{query}</strong></Text>}
        <Text style={text}>Estos son los precios actuales que encontramos:</Text>

        {meds.map((m, i) => (
          <Section key={i} style={card}>
            <Text style={medName}>{m.medication}</Text>
            {m.ingredient && <Text style={ingredient}>{m.ingredient}</Text>}
            {m.rows
              .slice()
              .sort((a, b) => a.price - b.price)
              .map((r, j) => (
                <Text key={j} style={row}>
                  <span style={pharmacyName}>{r.pharmacy}</span>
                  <span style={priceVal}>{fmt(r.price, r.currency)}</span>
                  {r.inStock === false && <span style={oos}> · sin stock</span>}
                  {r.productUrl && <> · <a href={r.productUrl} style={link}>ver</a></>}
                </Text>
              ))}
          </Section>
        ))}

        <Hr style={hr} />
        <Button href={SITE_URL} style={btn}>Volver a {SITE_NAME}</Button>
        <Text style={footer}>
          Te enviamos este resumen porque lo solicitaste desde el comparador.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SearchResultsEmail,
  subject: (data: Record<string, any>) =>
    data?.query ? `Resultados para "${data.query}" en ${SITE_NAME}` : `Resultados de tu búsqueda en ${SITE_NAME}`,
  displayName: 'Resultados de búsqueda',
  previewData: {
    query: 'ibuprofeno',
    meds: [{
      medication: 'Ibuprofeno 400 mg',
      ingredient: 'Ibuprofeno',
      rows: [
        { pharmacy: 'Farmatodo', price: 3.2, currency: 'USD', productUrl: 'https://example.com', inStock: true },
        { pharmacy: 'SAAS', price: 4.1, currency: 'USD', inStock: true },
      ],
    }],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 14px' }
const card = { padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', margin: '0 0 14px', backgroundColor: '#f8fafc' }
const medName = { fontSize: '16px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 2px' }
const ingredient = { fontSize: '12px', color: '#64748b', margin: '0 0 10px' }
const row = { fontSize: '14px', color: '#0f172a', margin: '0 0 6px' }
const pharmacyName = { display: 'inline-block', minWidth: '140px', color: '#475569' }
const priceVal = { fontWeight: 'bold' as const }
const oos = { color: '#dc2626', fontSize: '12px' }
const link = { color: '#0f766e', textDecoration: 'underline' }
const btn = { backgroundColor: '#0f766e', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', fontSize: '14px', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '14px 0 0' }