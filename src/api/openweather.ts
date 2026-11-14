import type { City, CurrentWeather, DayForecast, WeatherPayload } from '../lib/types'
import { fromOpenWeatherIcon } from '../lib/weatherIcons'

export class WeatherApiError extends Error {
  readonly kind: 'config' | 'network' | 'rate' | 'api'

  constructor(message: string, kind: 'config' | 'network' | 'rate' | 'api') {
    super(message)
    this.name = 'WeatherApiError'
    this.kind = kind
  }
}

interface OwmCurrent {
  main: { temp: number; feels_like: number; humidity: number }
  wind: { speed: number }
  weather: { description: string; icon: string }[]
  dt: number
}

interface OwmForecastItem {
  dt: number
  main: { temp_min: number; temp_max: number; temp: number }
  weather: { description: string; icon: string }[]
  dt_txt: string
}

interface OwmForecast {
  list: OwmForecastItem[]
}

function getKey(): string {
  const key = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined
  if (!key || key === 'your_openweathermap_api_key') {
    throw new WeatherApiError(
      'OpenWeatherMap isn’t configured. Falling back to Open-Meteo…',
      'config',
    )
  }
  return key
}

async function owmFetch<T>(path: string, city: City, signal?: AbortSignal): Promise<T> {
  const key = getKey()
  const url = new URL(`https://api.openweathermap.org/data/2.5/${path}`)
  url.searchParams.set('lat', String(city.lat))
  url.searchParams.set('lon', String(city.lon))
  url.searchParams.set('appid', key)
  url.searchParams.set('units', 'metric')

  let res: Response
  try {
    res = await fetch(url.toString(), { signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new WeatherApiError(
      'Couldn’t reach OpenWeatherMap. Checking Open-Meteo…',
      'network',
    )
  }

  if (res.status === 401 || res.status === 403) {
    throw new WeatherApiError('OpenWeatherMap key rejected. Using Open-Meteo…', 'config')
  }
  if (res.status === 429) {
    throw new WeatherApiError('OpenWeatherMap rate limit hit. Using Open-Meteo…', 'rate')
  }
  if (!res.ok) {
    throw new WeatherApiError(
      `OpenWeatherMap error (HTTP ${res.status}). Using Open-Meteo…`,
      'api',
    )
  }

  return res.json() as Promise<T>
}

function aggregateForecast(list: OwmForecastItem[]): DayForecast[] {
  const byDay = new Map<string, OwmForecastItem[]>()
  for (const item of list) {
    const day = item.dt_txt.slice(0, 10)
    const bucket = byDay.get(day) ?? []
    bucket.push(item)
    byDay.set(day, bucket)
  }

  const today = new Date().toISOString().slice(0, 10)
  const days = [...byDay.entries()]
    .filter(([day]) => day !== today)
    .slice(0, 5)

  return days.map(([date, items]) => {
    const temps = items.map((i) => i.main.temp)
    const noon =
      items.find((i) => i.dt_txt.includes('12:00:00')) ??
      items[Math.floor(items.length / 2)]
    return {
      date,
      tempMin: Math.min(...temps),
      tempMax: Math.max(...temps),
      description: noon.weather[0]?.description ?? '—',
      icon: fromOpenWeatherIcon(noon.weather[0]?.icon ?? '03d'),
    }
  })
}

export async function fetchOpenWeather(
  city: City,
  signal?: AbortSignal,
): Promise<WeatherPayload> {
  const [current, forecast] = await Promise.all([
    owmFetch<OwmCurrent>('weather', city, signal),
    owmFetch<OwmForecast>('forecast', city, signal),
  ])

  const currentMapped: CurrentWeather = {
    temp: current.main.temp,
    feelsLike: current.main.feels_like,
    humidity: current.main.humidity,
    windSpeed: current.wind.speed,
    description: current.weather[0]?.description ?? '—',
    icon: fromOpenWeatherIcon(current.weather[0]?.icon ?? '03d'),
    updatedAt: current.dt * 1000,
  }

  return {
    city,
    current: currentMapped,
    forecast: aggregateForecast(forecast.list),
    source: 'openweathermap',
    fetchedAt: Date.now(),
  }
}
