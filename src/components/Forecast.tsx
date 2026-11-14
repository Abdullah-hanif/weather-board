import { formatDay, formatTemp } from '../lib/format'
import type { DayForecast, TempUnit } from '../lib/types'
import { WeatherIcon } from './WeatherIcon'

interface Props {
  days: DayForecast[]
  unit: TempUnit
}

export function Forecast({ days, unit }: Props) {
  if (!days.length) return null

  return (
    <section className="forecast" aria-labelledby="forecast-heading">
      <div className="section-head">
        <h2 id="forecast-heading">5-day forecast</h2>
        <p>Daily highs and lows for the days ahead.</p>
      </div>
      <ul className="forecast__grid">
        {days.map((day) => (
          <li key={day.date} className="forecast__day">
            <p className="forecast__label">{formatDay(day.date)}</p>
            <WeatherIcon condition={day.icon} size="sm" />
            <p className="forecast__desc">{day.description}</p>
            <p className="forecast__temps">
              <span>{formatTemp(day.tempMax, unit)}</span>
              <span className="muted">{formatTemp(day.tempMin, unit)}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
