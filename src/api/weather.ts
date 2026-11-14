import { getLastWeather, setLastWeather } from '../lib/storage'
import type { City, WeatherPayload } from '../lib/types'
import { fetchOpenMeteo } from './openmeteo'
import { fetchOpenWeather, WeatherApiError } from './openweather'

export async function fetchWeather(
  city: City,
  signal?: AbortSignal,
): Promise<WeatherPayload> {
  try {
    const payload = await fetchOpenWeather(city, signal)
    setLastWeather(payload)
    return payload
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err

    try {
      const fallback = await fetchOpenMeteo(city, signal)
      setLastWeather(fallback)
      return fallback
    } catch (fallbackErr) {
      if ((fallbackErr as Error).name === 'AbortError') throw fallbackErr

      const cached = getLastWeather()
      if (cached && cached.city.id === city.id) {
        return { ...cached, source: 'cache' }
      }

      const message =
        fallbackErr instanceof WeatherApiError
          ? fallbackErr.message
          : 'Weather data couldn’t be loaded. Check your connection and try again.'
      throw new WeatherApiError(message, 'network')
    }
  }
}

export function loadCachedWeather(): WeatherPayload | null {
  return getLastWeather()
}
