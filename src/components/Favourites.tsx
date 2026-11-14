import { useState } from 'react'
import type { City } from '../lib/types'
import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  favourites: City[]
  activeId?: string
  onSelect: (city: City) => void
  onRemove: (cityId: string) => void
  storageWarning?: boolean
  max: number
}

export function Favourites({
  favourites,
  activeId,
  onSelect,
  onRemove,
  storageWarning,
  max,
}: Props) {
  const [pendingRemove, setPendingRemove] = useState<City | null>(null)

  return (
    <section className="favourites" aria-labelledby="fav-heading">
      <div className="section-head">
        <h2 id="fav-heading">Favourites</h2>
        <p>
          Quick access · {favourites.length}/{max} saved
        </p>
      </div>

      {storageWarning && (
        <p className="field-error" role="status">
          localStorage is unavailable, so favourites may not persist across sessions.
        </p>
      )}

      {favourites.length === 0 ? (
        <div className="empty">
          <p>No favourites yet</p>
          <span>Save up to {max} cities from the weather panel for one-tap access.</span>
        </div>
      ) : (
        <ul className="favourites__list">
          {favourites.map((city) => (
            <li key={city.id}>
              <button
                type="button"
                className={`favourites__chip ${activeId === city.id ? 'is-active' : ''}`}
                onClick={() => onSelect(city)}
              >
                <span>{city.name}</span>
                <span className="muted">{city.country}</span>
              </button>
              <button
                type="button"
                className="btn btn--icon"
                aria-label={`Remove ${city.name} from favourites`}
                onClick={() => setPendingRemove(city)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        title="Remove favourite?"
        message={
          pendingRemove
            ? `Remove ${pendingRemove.name} from your saved cities? You can add it again later.`
            : ''
        }
        confirmLabel="Remove"
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove) onRemove(pendingRemove.id)
          setPendingRemove(null)
        }}
      />
    </section>
  )
}
