import { useState } from 'react'
import { CitySearch } from './components/CitySearch'
import { CurrentWeather } from './components/CurrentWeather'
import { Favourites } from './components/Favourites'
import { Forecast } from './components/Forecast'
import { NotificationSettings } from './components/NotificationSettings'
import { OfflineBanner } from './components/OfflineBanner'
import { WeatherScene3D } from './components/WeatherScene3D'
import { useFavourites } from './hooks/useFavourites'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useTheme } from './hooks/useTheme'
import { useUnits } from './hooks/useUnits'
import { useWeather } from './hooks/useWeather'
import type { City } from './lib/types'

export default function App() {
  const online = useOnlineStatus()
  const { unit, toggle: toggleUnit } = useUnits()
  const { mode, resolved, cycle: cycleTheme } = useTheme()
  const { favourites, isFavourite, addFavourite, removeFavourite, storageWarning, max } =
    useFavourites()
  const { data, error, isLoading, selectedCity, load } = useWeather()
  const [favMessage, setFavMessage] = useState<string | null>(null)

  const onSelectCity = (city: City) => {
    setFavMessage(null)
    void load(city)
  }

  const onToggleFavourite = () => {
    if (!data) return
    if (isFavourite(data.city)) {
      // Removal goes through Favourites panel with confirmation
      setFavMessage('To remove a favourite, use × in the Favourites panel (asks for confirmation).')
      return
    }
    const result = addFavourite(data.city)
    setFavMessage(result.ok ? null : result.reason ?? null)
  }

  const themeLabel =
    mode === 'system' ? `Theme: system (${resolved})` : `Theme: ${mode}`

  const condition = data?.current.icon ?? 'partly'

  return (
    <div className={`app atmosphere atmosphere--${condition}`}>
      <div className="app__veil" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <div>
            <p className="brand__name">WeatherBoard</p>
            <p className="brand__tag">Harbor observatory · live forecast</p>
          </div>
        </div>
        <div className="topbar__actions">
          <button type="button" className="btn btn--ghost btn--chip" onClick={toggleUnit}>
            °{unit === 'celsius' ? 'C' : 'F'}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--chip"
            onClick={cycleTheme}
            aria-label={themeLabel}
            title={themeLabel}
          >
            {resolved === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
      </header>

      <OfflineBanner
        online={online}
        showingCache={data?.source === 'cache' || (!online && Boolean(data))}
      />

      <main className="layout">
        <div className="layout__primary">
          <CitySearch onSelect={onSelectCity} disabled={!online} />

          {isLoading && (
            <div className="panel skeleton" aria-busy="true" aria-live="polite">
              <div className="skeleton__block skeleton__block--lg" />
              <div className="skeleton__block" />
              <div className="skeleton__row">
                <div className="skeleton__block" />
                <div className="skeleton__block" />
                <div className="skeleton__block" />
              </div>
              <p className="muted">Fetching live weather…</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="panel panel--error" role="alert">
              <h2>Couldn’t load weather</h2>
              <p>{error}</p>
              {selectedCity && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void load(selectedCity)}
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {!isLoading && data && (
            <>
              <CurrentWeather
                data={data}
                unit={unit}
                isFavourite={isFavourite(data.city)}
                onToggleFavourite={onToggleFavourite}
                favouriteDisabledReason={favMessage}
              />
              <Forecast days={data.forecast} unit={unit} />
            </>
          )}

          {!isLoading && !data && !error && (
            <div className="panel empty empty--hero">
              <div className="empty__scene-wrap">
                <WeatherScene3D condition="partly" className="empty__scene" />
              </div>
              <div className="empty__copy">
                <p className="brand__name">WeatherBoard</p>
                <h1>Check any city in seconds</h1>
                <p>
                  Search to load live conditions and a 5-day forecast. Favourites and the last
                  viewed city stay on this device.
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="layout__side">
          <Favourites
            favourites={favourites}
            activeId={selectedCity?.id}
            onSelect={onSelectCity}
            onRemove={removeFavourite}
            storageWarning={storageWarning}
            max={max}
          />
          <NotificationSettings />
        </aside>
      </main>

      <footer className="footer">
        <span>Data · OpenWeatherMap · Open-Meteo · GeoDB Cities</span>
        <span>Offline ready · last viewed city stays cached</span>
      </footer>
    </div>
  )
}
