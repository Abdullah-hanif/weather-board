import { useEffect, useState } from 'react'
import { getTheme, setTheme as persistTheme } from '../lib/storage'
import type { ThemeMode } from '../lib/types'

function resolve(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return mode
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => getTheme())
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    typeof window === 'undefined' ? 'light' : resolve(getTheme()),
  )

  useEffect(() => {
    const applied = resolve(mode)
    setResolved(applied)
    document.documentElement.dataset.theme = applied
    persistTheme(mode)
  }, [mode])

  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setResolved(resolve('system'))
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const cycle = () => {
    setMode((prev) => {
      if (prev === 'system') return 'light'
      if (prev === 'light') return 'dark'
      return 'system'
    })
  }

  return { mode, resolved, setMode, cycle }
}
