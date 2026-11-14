export interface City {
  id: string
  name: string
  country: string
  region?: string
  lat: number
  lon: number
}

export interface CurrentWeather {
  temp: number
  feelsLike: number
  humidity: number
  windSpeed: number
  description: string
  icon: string
  weatherCode?: number
  updatedAt: number
}

export interface DayForecast {
  date: string
  tempMin: number
  tempMax: number
  description: string
  icon: string
  weatherCode?: number
}

export interface WeatherPayload {
  city: City
  current: CurrentWeather
  forecast: DayForecast[]
  source: 'openweathermap' | 'open-meteo' | 'cache'
  fetchedAt: number
}

export type TempUnit = 'celsius' | 'fahrenheit'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface ReminderSettings {
  enabled: boolean
  hour: number
  minute: number
}
