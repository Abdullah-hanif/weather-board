import { useCallback, useEffect, useRef, useState } from 'react'
import { WeatherApiError } from '../api/openweather'
import { fetchWeather, loadCachedWeather } from '../api/weather'
import type { City, WeatherPayload } from '../lib/types'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function useWeather() {
  const [status, setStatus] = useState<Status>('idle')
  const [data, setData] = useState<WeatherPayload | null>(() => loadCachedWeather())
  const [error, setError] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<City | null>(
    () => loadCachedWeather()?.city ?? null,
  )
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const cached = loadCachedWeather()
    if (cached) {
      setData(cached)
      setSelectedCity(cached.city)
      setStatus('success')
    }
  }, [])

  const load = useCallback(async (city: City) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setSelectedCity(city)
    setStatus('loading')
    setError(null)

    try {
      const payload = await fetchWeather(city, controller.signal)
      setData(payload)
      setStatus('success')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const message =
        err instanceof WeatherApiError
          ? err.message
          : 'Weather request failed. Check your connection and try again.'
      setError(message)
      setStatus('error')
    }
  }, [])

  return {
    status,
    data,
    error,
    selectedCity,
    load,
    isLoading: status === 'loading',
  }
}
