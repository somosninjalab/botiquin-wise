import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getRequestHeader, getRequestIP } from '@tanstack/react-start/server'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

const InputSchema = z.object({
  query: z.string().max(200).optional().nullable(),
  medication_id: z.string().uuid().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  result_count: z.number().int().min(0).max(100000).optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
})

// In-memory cache per worker instance to avoid hitting ipapi.co on every search.
const ipGeoCache = new Map<string, { city: string | null; region: string | null; country: string | null; at: number }>()
const IP_CACHE_TTL_MS = 1000 * 60 * 60 * 6 // 6h

async function resolveGeo() {
  const ip =
    getRequestHeader('cf-connecting-ip') ||
    getRequestHeader('x-real-ip') ||
    getRequestIP({ xForwardedFor: true }) ||
    null

  const cfCity = getRequestHeader('cf-ipcity') || null
  const cfRegion = getRequestHeader('cf-region') || null
  const cfCountry =
    getRequestHeader('cf-ipcountry-name') ||
    getRequestHeader('cf-ipcountry') ||
    null

  if (cfCity || cfRegion || cfCountry) {
    return { ip, city: cfCity, region: cfRegion, country: cfCountry }
  }

  if (ip) {
    const cached = ipGeoCache.get(ip)
    if (cached && Date.now() - cached.at < IP_CACHE_TTL_MS) {
      return { ip, city: cached.city, region: cached.region, country: cached.country }
    }
    try {
      const r = await fetch(`https://ipapi.co/${ip}/json/`, {
        headers: { 'User-Agent': 'alertamedicina/1.0' },
      })
      if (r.ok) {
        const j: any = await r.json()
        const out = {
          city: (j.city as string) ?? null,
          region: (j.region as string) ?? null,
          country: (j.country_name as string) ?? null,
        }
        ipGeoCache.set(ip, { ...out, at: Date.now() })
        return { ip, ...out }
      }
    } catch {
      // ignore
    }
  }

  return { ip, city: null, region: null, country: null }
}

export const trackSearchServer = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const geo = await resolveGeo()
      await supabaseAdmin.from('search_events').insert({
        query: data.query ?? null,
        medication_id: data.medication_id ?? null,
        category: data.category ?? null,
        result_count: data.result_count ?? null,
        user_id: data.user_id ?? null,
        city: geo.city,
        region: geo.region,
        country: geo.country,
      })
      return { ok: true }
    } catch {
      return { ok: false }
    }
  })