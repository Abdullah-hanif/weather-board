import { formatTemp, formatWind } from '../lib/format'
import type { TempUnit, WeatherPayload } from '../lib/types'
import { WeatherScene3D } from './WeatherScene3D'

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
      <div className="current__stage">
        <WeatherScene3D condition={current.icon} className="current__scene" />
        <div className="current__overlay">
          <p className="eyebrow">Current conditions</p>
          <h2 id="current-heading">
            {city.name}
            {city.country ? <span className="current__country">, {city.country}</span> : null}
          </h2>
          <p className="current__desc">{current.description}</p>
          <div className="current__temp">{formatTemp(current.temp, unit)}</div>
        </div>
      </div>

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
          {source === 'cache'
            ? 'Cached'
            : source === 'openweathermap'
              ? 'OpenWeather'
              : 'Open-Meteo'}
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
