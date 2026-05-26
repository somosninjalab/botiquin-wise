import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader, getRequestIP } from '@tanstack/react-start/server'

type Geo = {
  city: string | null
  region: string | null
  country: string | null
  ip: string | null
}

// Resolves geolocation for the current request, preferring Cloudflare
// edge headers (free, no rate limit) and falling back to ipapi.co.
export const lookupRequestGeo = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Geo> => {
    const ip =
      getRequestHeader('cf-connecting-ip') ||
      getRequestIP({ xForwardedFor: true }) ||
      null

    // Cloudflare Workers inject these when the request hits the edge.
    const cfCity = getRequestHeader('cf-ipcity') || null
    const cfRegion = getRequestHeader('cf-region') || null
    const cfCountry =
      getRequestHeader('cf-ipcountry-name') ||
      getRequestHeader('cf-ipcountry') ||
      null

    if (cfCity || cfRegion || cfCountry) {
      return {
        city: cfCity,
        region: cfRegion,
        country: cfCountry,
        ip,
      }
    }

    // Fallback: ipapi.co server-side (no browser CORS / extension issues).
    if (ip) {
      try {
        const r = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: { 'User-Agent': 'alertamedicina/1.0' },
        })
        if (r.ok) {
          const j: any = await r.json()
          return {
            city: j.city ?? null,
            region: j.region ?? null,
            country: j.country_name ?? null,
            ip,
          }
        }
      } catch {
        // ignore
      }
    }

    return { city: null, region: null, country: null, ip }
  },
)