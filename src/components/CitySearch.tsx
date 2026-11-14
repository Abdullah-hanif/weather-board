import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { GeoDbError, searchCities } from '../api/geodb'
import { useDebounce } from '../hooks/useDebounce'
import type { City } from '../lib/types'

interface Props {
  onSelect: (city: City) => void
  disabled?: boolean
}

export function CitySearch({ onSelect, disabled }: Props) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [touched, setTouched] = useState(false)
  const [submittedEmpty, setSubmittedEmpty] = useState(false)
  const [suggestions, setSuggestions] = useState<City[]>([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [lockQuery, setLockQuery] = useState<string | null>(null)

  const debounced = useDebounce(query.trim(), 300)

  const emptyError =
    (touched || submittedEmpty) && query.trim().length === 0
      ? 'Enter a city name to search.'
      : null

  const tooShort =
    touched && query.trim().length === 1
      ? 'Type at least 2 characters to search.'
      : null

  useEffect(() => {
    if (debounced.length < 2) {
      setSuggestions([])
      setApiError(null)
      setLoading(false)
      return
    }

    // Don't re-query after the user picks a suggestion
    if (lockQuery && debounced === lockQuery.trim()) {
      setSuggestions([])
      setLoading(false)
      setOpen(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setApiError(null)

    searchCities(debounced, controller.signal)
      .then((cities) => {
        setSuggestions(cities)
        setOpen(true)
        setActiveIndex(-1)
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return
        setSuggestions([])
        setOpen(true)
        if (err instanceof GeoDbError) {
          setApiError(err.message)
        } else {
          setApiError('City search failed unexpectedly. Please try again.')
        }
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [debounced, lockQuery])

  const pick = (city: City) => {
    const label = `${city.name}, ${city.country}`
    setLockQuery(label)
    setQuery(label)
    setSuggestions([])
    setOpen(false)
    setApiError(null)
    setSubmittedEmpty(false)
    onSelect(city)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim().length === 0) {
      setSubmittedEmpty(true)
      setTouched(true)
      inputRef.current?.focus()
      return
    }
    if (suggestions[0]) {
      pick(suggestions[0])
      return
    }
    if (apiError) return
    setApiError('Pick a city from the suggestions list — typing alone isn’t enough.')
    setOpen(true)
  }

  return (
    <form className="search" onSubmit={onSubmit} noValidate>
      <label className="search__label" htmlFor="city-search">
        Search city
      </label>
      <div className={`search__field ${emptyError || tooShort || apiError ? 'is-invalid' : ''}`}>
        <input
          ref={inputRef}
          id="city-search"
          name="city"
          type="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          placeholder="Search any city…"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setLockQuery(null)
            setQuery(e.target.value)
            setSubmittedEmpty(false)
            setApiError(null)
            setOpen(true)
          }}
          onBlur={() => {
            setTouched(true)
            window.setTimeout(() => setOpen(false), 150)
          }}
          onFocus={() => {
            if (suggestions.length || apiError) setOpen(true)
          }}
          onKeyDown={(e) => {
            if (!open || (!suggestions.length && !apiError)) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
              e.preventDefault()
              pick(suggestions[activeIndex])
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        <button type="submit" className="btn btn--primary search__submit" disabled={disabled}>
          Search
        </button>
      </div>

      {(emptyError || tooShort) && (
        <p className="field-error" role="alert">
          {emptyError || tooShort}
        </p>
      )}

      {open && (loading || suggestions.length > 0 || apiError) && (
        <ul id={listId} className="search__list" role="listbox">
          {loading && (
            <li className="search__status" role="option" aria-disabled="true">
              Looking up cities…
            </li>
          )}
          {!loading && apiError && (
            <li className="search__status search__status--error" role="option" aria-disabled="true">
              {apiError}
            </li>
          )}
          {!loading &&
            suggestions.map((city, index) => (
              <li key={city.id} role="presentation">
                <button
                  type="button"
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`search__option ${index === activeIndex ? 'is-active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(city)}
                >
                  <span className="search__option-name">{city.name}</span>
                  <span className="search__option-meta">
                    {[city.region, city.country].filter(Boolean).join(', ')}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </form>
  )
}
