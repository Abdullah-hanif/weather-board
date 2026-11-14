import type { City, ReminderSettings, TempUnit, ThemeMode, WeatherPayload } from './types'

const KEYS = {
  favourites: 'wb:favourites',
  lastWeather: 'wb:lastWeather',
  unit: 'wb:unit',
  theme: 'wb:theme',
  reminder: 'wb:reminder',
} as const

function canUseStorage(): boolean {
  try {
    const test = '__wb_test__'
    localStorage.setItem(test, '1')
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

export const storageAvailable = canUseStorage()

function read<T>(key: string, fallback: T): T {
  if (!storageAvailable) return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): boolean {
  if (!storageAvailable) return false
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function getFavourites(): City[] {
  return read<City[]>(KEYS.favourites, [])
}

export function setFavourites(cities: City[]): boolean {
  return write(KEYS.favourites, cities)
}

export function getLastWeather(): WeatherPayload | null {
  return read<WeatherPayload | null>(KEYS.lastWeather, null)
}

export function setLastWeather(payload: WeatherPayload): boolean {
  return write(KEYS.lastWeather, payload)
}

export function getUnit(): TempUnit {
  return read<TempUnit>(KEYS.unit, 'celsius')
}

export function setUnit(unit: TempUnit): boolean {
  return write(KEYS.unit, unit)
}

export function getTheme(): ThemeMode {
  return read<ThemeMode>(KEYS.theme, 'system')
}

export function setTheme(theme: ThemeMode): boolean {
  return write(KEYS.theme, theme)
}

export function getReminder(): ReminderSettings {
  return read<ReminderSettings>(KEYS.reminder, {
    enabled: false,
    hour: 8,
    minute: 0,
  })
}

export function setReminder(settings: ReminderSettings): boolean {
  return write(KEYS.reminder, settings)
}
