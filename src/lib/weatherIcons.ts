/** Maps OpenWeather icon codes + Open-Meteo WMO codes to a shared visual key */
export type ConditionKey =
  | 'clear'
  | 'partly'
  | 'cloud'
  | 'rain'
  | 'drizzle'
  | 'thunder'
  | 'snow'
  | 'fog'
  | 'wind'

export function fromOpenWeatherIcon(icon: string): ConditionKey {
  const code = icon.slice(0, 2)
  switch (code) {
    case '01':
      return 'clear'
    case '02':
      return 'partly'
    case '03':
    case '04':
      return 'cloud'
    case '09':
      return 'rain'
    case '10':
      return 'drizzle'
    case '11':
      return 'thunder'
    case '13':
      return 'snow'
    case '50':
      return 'fog'
    default:
      return 'cloud'
  }
}

export function fromWmoCode(code: number): ConditionKey {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly'
  if (code === 3) return 'cloud'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow'
  if (code >= 95) return 'thunder'
  return 'cloud'
}

export function conditionLabel(key: ConditionKey): string {
  const labels: Record<ConditionKey, string> = {
    clear: 'Clear sky',
    partly: 'Partly cloudy',
    cloud: 'Cloudy',
    rain: 'Rain',
    drizzle: 'Drizzle',
    thunder: 'Thunderstorm',
    snow: 'Snow',
    fog: 'Fog',
    wind: 'Windy',
  }
  return labels[key]
}

export function openWeatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`
}
