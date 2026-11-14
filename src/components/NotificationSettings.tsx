import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  getNotificationCapability,
  loadReminderSettings,
  requestNotificationPermission,
  scheduleDailyReminder,
} from '../lib/notifications'
import { formatTime } from '../lib/format'

export function NotificationSettings() {
  const [enabled, setEnabled] = useState(false)
  const [hour, setHour] = useState(8)
  const [minute, setMinute] = useState(0)
  const [explained, setExplained] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [permission, setPermission] = useState<string>('default')
  const [supported, setSupported] = useState(true)
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null)

  useEffect(() => {
    const saved = loadReminderSettings()
    setEnabled(saved.enabled)
    setHour(saved.hour)
    setMinute(saved.minute)

    const cap = getNotificationCapability()
    setSupported(cap.supported)
    setPermission(cap.permission)
    if (!cap.supported) setUnsupportedReason(cap.reason ?? null)
  }, [])

  const onEnableFlow = async () => {
    setError(null)
    if (!explained) {
      setExplained(true)
      setStatus(
        'WeatherBoard can send one local reminder each morning so you remember to check the forecast — even if this tab is closed. No weather data is sent to a push server; the reminder is scheduled on your device via the service worker.',
      )
      return
    }

    const result = await requestNotificationPermission()
    setPermission(result)

    if (result !== 'granted') {
      setError(
        result === 'denied'
          ? 'Permission denied. The rest of the app still works — enable notifications in browser settings if you change your mind.'
          : 'Permission wasn’t granted. You can try again anytime.',
      )
      setEnabled(false)
      return
    }

    const schedule = await scheduleDailyReminder({ enabled: true, hour, minute })
    setEnabled(true)
    setStatus(schedule.message)
    if (!schedule.ok) setError(schedule.message)
  }

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!supported) {
      setError(unsupportedReason)
      return
    }

    if (!enabled) {
      const result = await scheduleDailyReminder({ enabled: false, hour, minute })
      setStatus(result.message)
      return
    }

    if (Notification.permission !== 'granted') {
      await onEnableFlow()
      return
    }

    const result = await scheduleDailyReminder({ enabled: true, hour, minute })
    setStatus(result.message)
    if (!result.ok) setError(result.message)
  }

  if (!supported) {
    return (
      <section className="reminders" aria-labelledby="remind-heading">
        <div className="section-head">
          <h2 id="remind-heading">Morning reminder</h2>
          <p>Optional daily nudge to check the weather.</p>
        </div>
        <div className="empty">
          <p>Notifications unavailable</p>
          <span>{unsupportedReason}</span>
        </div>
      </section>
    )
  }

  return (
    <section className="reminders" aria-labelledby="remind-heading">
      <div className="section-head">
        <h2 id="remind-heading">Morning reminder</h2>
        <p>Get a local nudge even when the tab is closed.</p>
      </div>

      <form className="reminders__form" onSubmit={onSave} noValidate>
        <label className="toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={async (e) => {
              const next = e.target.checked
              setEnabled(next)
              setError(null)
              if (next) {
                await onEnableFlow()
              } else {
                const result = await scheduleDailyReminder({
                  enabled: false,
                  hour,
                  minute,
                })
                setStatus(result.message)
                setExplained(false)
              }
            }}
          />
          <span>Enable daily reminder</span>
        </label>

        <div className="reminders__time">
          <label htmlFor="remind-hour">
            Hour
            <select
              id="remind-hour"
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              onBlur={() => {
                if (hour < 0 || hour > 23) setError('Hour must be between 0 and 23.')
              }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="remind-minute">
            Minute
            <select
              id="remind-minute"
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
            >
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="muted">
          Reminder time: <strong>{formatTime(hour, minute)}</strong>
          {permission === 'granted' ? ' · permission granted' : ''}
          {permission === 'denied' ? ' · permission blocked' : ''}
        </p>

        {explained && enabled && permission !== 'granted' && (
          <div className="callout" role="note">
            <p>
              Before the browser asks: this reminder is a local notification scheduled by
              WeatherBoard’s service worker. It only reminds you to open the app — it does
              not share your location with a push vendor.
            </p>
            <button type="button" className="btn btn--primary" onClick={onEnableFlow}>
              Continue & allow notifications
            </button>
          </div>
        )}

        <button type="submit" className="btn btn--secondary">
          Save reminder
        </button>
      </form>

      {status && (
        <p className="field-success" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
