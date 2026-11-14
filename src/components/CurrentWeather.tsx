import { formatTemp, formatWind } from '../lib/format'
import type { TempUnit, WeatherPayload } from '../lib/types'
import { WeatherIcon } from './WeatherIcon'

interface Props {
  data: WeatherPayload
  unit: TempUnit
  onToggleFavourite: () => void
  isFavourite: boolean
  favouriteDisabledReason?: string | null
}

export function CurrentWeather({
  data,
  unit,
  onToggleFavourite,
  isFavourite,
  favouriteDisabledReason,
}: Props) {
  const { city, current, source } = data

  return (
    <section className="current" aria-labelledby="current-heading">
      <div className="current__top">
        <div>
          <p className="eyebrow">Current conditions</p>
          <h2 id="current-heading">
            {city.name}
            <span className="current__country">{city.country}</span>
          </h2>
          <p className="current__desc">{current.description}</p>
        </div>
        <WeatherIcon condition={current.icon} size="lg" />
      </div>

      <div className="current__temp">{formatTemp(current.temp, unit)}</div>

      <dl className="stats">
        <div>
          <dt>Feels like</dt>
          <dd>{formatTemp(current.feelsLike, unit)}</dd>
        </div>
        <div>
          <dt>Humidity</dt>
          <dd>{current.humidity}%</dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd>{formatWind(current.windSpeed, unit)}</dd>
        </div>
      </dl>

      <div className="current__footer">
        <button
          type="button"
          className={`btn ${isFavourite ? 'btn--ghost' : 'btn--secondary'}`}
          onClick={onToggleFavourite}
          aria-pressed={isFavourite}
          title={favouriteDisabledReason ?? undefined}
        >
          {isFavourite ? 'Saved' : 'Save favourite'}
        </button>
        <span className="source-pill" title="Data provider">
          {source === 'cache' ? 'Cached' : source === 'openweathermap' ? 'OpenWeather' : 'Open-Meteo'}
        </span>
      </div>
      {favouriteDisabledReason && (
        <p className="field-error" role="status">
          {favouriteDisabledReason}
        </p>
      )}
    </section>
  )
}
