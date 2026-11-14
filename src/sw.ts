/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { createHandlerBoundToURL } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//],
  }),
)

registerRoute(
  ({ url }) =>
    url.hostname.includes('openweathermap.org') ||
    url.hostname.includes('open-meteo.com'),
  new NetworkFirst({
    cacheName: 'weather-api',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 60 * 60 * 12,
      }),
    ],
  }),
)

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 64,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  }),
)

registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts',
  }),
)

type ReminderPayload = {
  hour: number
  minute: number
  timestamp: number
}

const REMINDER_TAG = 'weatherboard-daily-reminder'

async function cancelReminder() {
  const notes = await self.registration.getNotifications({ tag: REMINDER_TAG })
  for (const n of notes) n.close()
  // Also clear any scheduled trigger notifications
  try {
    const all = await self.registration.getNotifications({
      includeTriggered: true,
    } as GetNotificationOptions)
    for (const n of all) {
      if (n.tag === REMINDER_TAG) n.close()
    }
  } catch {
    // includeTriggered not supported
  }
}

function nextTimestamp(hour: number, minute: number, from = Date.now()): number {
  const next = new Date(from)
  next.setHours(hour, minute, 0, 0)
  if (next.getTime() <= from + 5000) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime()
}

async function scheduleReminder(payload: ReminderPayload) {
  await cancelReminder()

  const title = 'WeatherBoard'
  const options: NotificationOptions & { showTrigger?: { timestamp: number } } = {
    body: 'Good morning — open WeatherBoard to check today’s forecast.',
    tag: REMINDER_TAG,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { hour: payload.hour, minute: payload.minute },
    renotify: true,
  }

  // Prefer Notification Triggers (fires with tab closed, no push server)
  type TriggerCtor = new (ts: number) => { timestamp: number }
  const Trigger = (self as unknown as { TimestampTrigger?: TriggerCtor }).TimestampTrigger

  if (typeof Trigger === 'function') {
    options.showTrigger = new Trigger(payload.timestamp)
    await self.registration.showNotification(title, options)
    return
  }

  // Fallback: show immediately if due within a grace window when SW wakes;
  // otherwise store intent via a short-delay notification when possible.
  const delay = payload.timestamp - Date.now()
  if (delay <= 0) {
    await self.registration.showNotification(title, options)
    return
  }

  // Best-effort: schedule via setTimeout while SW is alive, then reschedule on events
  self.setTimeout(async () => {
    await self.registration.showNotification(title, {
      ...options,
      body: 'Time to check today’s weather on WeatherBoard.',
    })
    const next = nextTimestamp(payload.hour, payload.minute)
    await scheduleReminder({ ...payload, timestamp: next })
  }, Math.min(delay, 2147483647))
}

self.addEventListener('message', (event) => {
  const data = event.data as { type?: string; payload?: ReminderPayload } | undefined
  if (!data?.type) return

  if (data.type === 'SCHEDULE_REMINDER' && data.payload) {
    event.waitUntil(scheduleReminder(data.payload))
  }
  if (data.type === 'CANCEL_REMINDER') {
    event.waitUntil(cancelReminder())
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data as { hour?: number; minute?: number } | undefined

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus()
          return
        }
      }
      await self.clients.openWindow('/')

      if (typeof data?.hour === 'number' && typeof data?.minute === 'number') {
        const timestamp = nextTimestamp(data.hour, data.minute)
        await scheduleReminder({ hour: data.hour, minute: data.minute, timestamp })
      }
    })(),
  )
})

self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data as { hour?: number; minute?: number } | undefined
  if (typeof data?.hour !== 'number' || typeof data?.minute !== 'number') return
  const timestamp = nextTimestamp(data.hour, data.minute)
  event.waitUntil(scheduleReminder({ hour: data.hour, minute: data.minute, timestamp }))
})

export {}
