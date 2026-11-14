import type { ConditionKey } from '../lib/weatherIcons'

interface Props {
  condition: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function asKey(condition: string): ConditionKey {
  const allowed: ConditionKey[] = [
    'clear',
    'partly',
    'cloud',
    'rain',
    'drizzle',
    'thunder',
    'snow',
    'fog',
    'wind',
  ]
  return (allowed.includes(condition as ConditionKey)
    ? condition
    : 'cloud') as ConditionKey
}

export function WeatherIcon({ condition, size = 'md', className = '' }: Props) {
  const key = asKey(condition)
  return (
    <span
      className={`wx-icon wx-icon--${size} wx-icon--${key} ${className}`}
      aria-hidden="true"
    >
      <span className="wx-icon__orb" />
      <span className="wx-icon__layer wx-icon__layer--a" />
      <span className="wx-icon__layer wx-icon__layer--b" />
    </span>
  )
}
