import type { City } from '../lib/types'
import { searchCitiesFallback } from './geocodeFallback'

const HOST = 'wft-geo-db.p.rapidapi.com'
const BASE = `https://${HOST}/v1/geo/cities`

export class GeoDbError extends Error {
  readonly kind: 'config' | 'network' | 'rate' | 'empty' | 'api'

  constructor(message: string, kind: 'config' | 'network' | 'rate' | 'empty' | 'api') {
    super(message)
    this.name = 'GeoDbError'
    this.kind = kind
  }
}

interface GeoDbCity {
  id: number
  city: string
  name: string
  country: string
  countryCode: string
  region?: string
  latitude: number
  longitude: number
}

interface GeoDbResponse {
  data?: GeoDbCity[]
  message?: string
}

async function searchGeoDb(
  trimmed: string,
  key: string,
  signal?: AbortSignal,
): Promise<City[]> {
  const url = new URL(BASE)
  url.searchParams.set('namePrefix', trimmed)
  url.searchParams.set('limit', '8')
  url.searchParams.set('offset', '0')
  url.searchParams.set('sort', '-population')
  url.searchParams.set('types', 'CITY')
  url.searchParams.set('hateoasMode', 'false')

  let res: Response
  try {
    res = await fetch(url.toString(), {
      signal,
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': HOST,
      },
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new GeoDbError(
      'Couldn’t reach city search. Check your connection and try again.',
      'network',
    )
  }

  if (res.status === 429) {
    throw new GeoDbError(
      'City search is rate-limited. Wait a second, then type again.',
      'rate',
    )
  }

  if (!res.ok) {
    throw new GeoDbError(
      `City search failed (HTTP ${res.status}). Try again in a moment.`,
      'api',
    )
  }

  const json = (await res.json()) as GeoDbResponse
  const rows = json.data ?? []
  if (rows.length === 0) {
    throw new GeoDbError(
      `No cities found for “${trimmed}”. Try a different spelling.`,
      'empty',
    )
  }

  return rows.map((row) => ({
    id: String(row.id),
    name: row.city || row.name,
    country: row.country || row.countryCode,
    region: row.region,
    lat: row.latitude,
    lon: row.longitude,
  }))
}

function cityKey(c: City): string {
  return `${c.name.toLowerCase()}|${c.country.toLowerCase()}|${c.lat.toFixed(2)}|${c.lon.toFixed(2)}`
}

function mergeCities(primary: City[], secondary: City[], limit = 8): City[] {
  const seen = new Set<string>()
  const out: City[] = []
  for (const city of [...primary, ...secondary]) {
    const key = cityKey(city)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(city)
    if (out.length >= limit) break
  }
  return out
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<City[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const key = import.meta.env.VITE_RAPIDAPI_KEY as string | undefined
  const hasKey = Boolean(key && key !== 'your_rapidapi_key')

  // Always try Open-Meteo geocoding in parallel as enrichment — GeoDB free tier
  // often returns a sparse subset, but we still call GeoDB first for the challenge.
  const fallbackPromise = searchCitiesFallback(trimmed, signal)

  if (hasKey) {
    try {
      const geo = await searchGeoDb(trimmed, key!, signal)
      try {
        const extra = await fallbackPromise
        return mergeCities(geo, extra)
      } catch {
        return geo
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err
      if (err instanceof GeoDbError && err.kind === 'empty') {
        // If GeoDB says empty, still try Open-Meteo before failing
        return fallbackPromise
      }
      // Rate-limit / network / API — fall through to Open-Meteo geocoding
    }
  }

  return fallbackPromise
}
