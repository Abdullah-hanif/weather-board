import type { City, WeatherPayload } from '../lib/types'
import { conditionLabel, fromWmoCode } from '../lib/weatherIcons'
import { WeatherApiError } from './openweather'

interface OpenMeteoResponse {
  current: {
    time: string
    temperature_2m: number
    relative_humidity_2m: number
    weather_code: number
    wind_speed_10m: number
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}

export async function fetchOpenMeteo(
  city: City,
  signal?: AbortSignal,
): Promise<WeatherPayload> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(city.lat))
  url.searchParams.set('longitude', String(city.lon))
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
  )
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min',
  )
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '6')
  url.searchParams.set('wind_speed_unit', 'ms')

  let res: Response
  try {
    res = await fetch(url.toString(), { signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new WeatherApiError(
      'Couldn’t reach Open-Meteo either. Check your network, then retry.',
      'network',
    )
  }

  if (!res.ok) {
    throw new WeatherApiError(
      `Open-Meteo failed (HTTP ${res.status}). Try again shortly.`,
      'api',
    )
  }

  const data = (await res.json()) as OpenMeteoResponse
  const currentCode = data.current.weather_code
  const currentKey = fromWmoCode(currentCode)

  const forecast = data.daily.time.slice(1, 6).map((date, i) => {
    const idx = i + 1
    const code = data.daily.weather_code[idx]
    const key = fromWmoCode(code)
    return {
      date,
      tempMin: data.daily.temperature_2m_min[idx],
      tempMax: data.daily.temperature_2m_max[idx],
      description: conditionLabel(key),
      icon: key,
      weatherCode: code,
    }
  })

  return {
    city,
    current: {
      temp: data.current.temperature_2m,
      feelsLike: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      description: conditionLabel(currentKey),
      icon: currentKey,
      weatherCode: currentCode,
      updatedAt: new Date(data.current.time).getTime(),
    },
    forecast,
    source: 'open-meteo',
    fetchedAt: Date.now(),
  }
}
