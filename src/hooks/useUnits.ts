import { useState } from 'react'
import { getUnit, setUnit as persistUnit } from '../lib/storage'
import type { TempUnit } from '../lib/types'

export function useUnits() {
  const [unit, setUnitState] = useState<TempUnit>(() => getUnit())

  const setUnit = (next: TempUnit) => {
    setUnitState(next)
    persistUnit(next)
  }

  const toggle = () => {
    setUnit(unit === 'celsius' ? 'fahrenheit' : 'celsius')
  }

  return { unit, setUnit, toggle }
}
