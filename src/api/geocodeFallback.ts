import type { City } from '../lib/types'
import { GeoDbError } from './geodb'

interface MeteoResult {
  id: number
  name: string
  country?: string
  admin1?: string
  latitude: number
  longitude: number
}

interface MeteoResponse {
  results?: MeteoResult[]
}

/** Open-Meteo geocoding — used only when GeoDB is unavailable */
export async function searchCitiesFallback(
  query: string,
  signal?: AbortSignal,
): Promise<City[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', query.trim())
  url.searchParams.set('count', '8')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')

  let res: Response
  try {
    res = await fetch(url.toString(), { signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new GeoDbError(
      'Couldn’t reach city search. Check your connection and try again.',
      'network',
    )
  }

  if (!res.ok) {
    throw new GeoDbError(
      `City search failed (HTTP ${res.status}). Try again in a moment.`,
      'api',
    )
  }

  const json = (await res.json()) as MeteoResponse
  const rows = json.results ?? []
  if (rows.length === 0) {
    throw new GeoDbError(
      `No cities found for “${query.trim()}”. Try a different spelling.`,
      'empty',
    )
  }

  return rows.map((row) => ({
    id: `om-${row.id}`,
    name: row.name,
    country: row.country ?? '',
    region: row.admin1,
    lat: row.latitude,
    lon: row.longitude,
  }))
}
