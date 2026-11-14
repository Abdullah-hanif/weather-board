import { useCallback, useState } from 'react'
import { getFavourites, setFavourites, storageAvailable } from '../lib/storage'
import type { City } from '../lib/types'

const MAX = 5

export function useFavourites() {
  const [favourites, setFavState] = useState<City[]>(() => getFavourites())
  const [storageWarning, setStorageWarning] = useState(!storageAvailable)

  const persist = useCallback((next: City[]) => {
    const ok = setFavourites(next)
    if (!ok) setStorageWarning(true)
    setFavState(next)
    return ok
  }, [])

  const isFavourite = useCallback(
    (city: City) => favourites.some((f) => f.id === city.id),
    [favourites],
  )

  const addFavourite = useCallback(
    (city: City): { ok: boolean; reason?: string } => {
      if (isFavourite(city)) return { ok: true }
      if (favourites.length >= MAX) {
        return {
          ok: false,
          reason: `You can save up to ${MAX} favourites. Remove one to add another.`,
        }
      }
      const ok = persist([...favourites, city])
      if (!ok) {
        return {
          ok: false,
          reason:
            'localStorage is unavailable (private mode or blocked). Favourites won’t persist.',
        }
      }
      return { ok: true }
    },
    [favourites, isFavourite, persist],
  )

  const removeFavourite = useCallback(
    (cityId: string) => {
      persist(favourites.filter((f) => f.id !== cityId))
    },
    [favourites, persist],
  )

  return {
    favourites,
    isFavourite,
    addFavourite,
    removeFavourite,
    storageWarning,
    max: MAX,
  }
}
