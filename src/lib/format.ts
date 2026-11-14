import type { TempUnit } from './types'

export function cToF(c: number): number {
  return (c * 9) / 5 + 32
}

export function formatTemp(celsius: number, unit: TempUnit): string {
  const value = unit === 'fahrenheit' ? cToF(celsius) : celsius
  return `${Math.round(value)}°${unit === 'fahrenheit' ? 'F' : 'C'}`
}

export function formatWind(mps: number, unit: TempUnit): string {
  if (unit === 'fahrenheit') {
    return `${Math.round(mps * 2.237)} mph`
  }
  return `${Math.round(mps * 3.6)} km/h`
}

export function formatDay(dateStr: string): string {
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatTime(hour: number, minute: number): string {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
