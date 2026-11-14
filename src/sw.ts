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

type StoredReminder = {
  enabled: boolean
  hour: number
  minute: number
}

const REMINDER_TAG = 'weatherboard-daily-reminder'
const REMINDER_STORE = 'wb-reminder-store'
const REMINDER_URL = '/__wb_reminder__'

async function saveReminderPrefs(prefs: StoredReminder | null) {
  const cache = await caches.open(REMINDER_STORE)
  if (!prefs || !prefs.enabled) {
    await cache.delete(REMINDER_URL)
    return
  }
  await cache.put(
    REMINDER_URL,
    new Response(JSON.stringify(prefs), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

async function loadReminderPrefs(): Promise<StoredReminder | null> {
  const cache = await caches.open(REMINDER_STORE)
  const res = await cache.match(REMINDER_URL)
  if (!res) return null
  try {
    return (await res.json()) as StoredReminder
  } catch {
    return null
  }
}

async function cancelReminder() {
  const notes = await self.registration.getNotifications({ tag: REMINDER_TAG })
  for (const n of notes) n.close()
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

  // Notification Triggers: fire even with the tab closed (no push server needed)
  type TriggerCtor = new (ts: number) => { timestamp: number }
  const Trigger = (self as unknown as { TimestampTrigger?: TriggerCtor }).TimestampTrigger

  if (typeof Trigger === 'function') {
    options.showTrigger = new Trigger(payload.timestamp)
    await self.registration.showNotification(title, options)
    return
  }

  const delay = payload.timestamp - Date.now()
  if (delay <= 0) {
    await self.registration.showNotification(title, options)
    const next = nextTimestamp(payload.hour, payload.minute)
    await scheduleReminder({ ...payload, timestamp: next })
    return
  }

  // Best-effort while the SW stays alive; prefs restore on activate / periodicsync
  self.setTimeout(async () => {
    await self.registration.showNotification(title, {
      ...options,
      body: 'Time to check today’s weather on WeatherBoard.',
    })
    const next = nextTimestamp(payload.hour, payload.minute)
    await scheduleReminder({ ...payload, timestamp: next })
  }, Math.min(delay, 2147483647))
}

async function restorePersistedReminder() {
  const prefs = await loadReminderPrefs()
  if (!prefs?.enabled) return
  const timestamp = nextTimestamp(prefs.hour, prefs.minute)
  await scheduleReminder({ hour: prefs.hour, minute: prefs.minute, timestamp })
}

self.addEventListener('activate', (event) => {
  event.waitUntil(restorePersistedReminder())
})

self.addEventListener('periodicsync', (event) => {
  const syncEvent = event as ExtendableEvent & { tag: string }
  if (syncEvent.tag !== 'weatherboard-reminder-sync') return
  syncEvent.waitUntil(restorePersistedReminder())
})

self.addEventListener('message', (event) => {
  const data = event.data as
    | {
        type?: string
        payload?: ReminderPayload & StoredReminder
      }
    | undefined
  if (!data?.type) return

  if (data.type === 'SCHEDULE_REMINDER' && data.payload) {
    event.waitUntil(scheduleReminder(data.payload))
  }
  if (data.type === 'PERSIST_REMINDER' && data.payload) {
    event.waitUntil(
      saveReminderPrefs({
        enabled: Boolean(data.payload.enabled),
        hour: data.payload.hour,
        minute: data.payload.minute,
      }),
    )
  }
  if (data.type === 'CANCEL_REMINDER') {
    event.waitUntil(
      (async () => {
        await cancelReminder()
        await saveReminderPrefs(null)
      })(),
    )
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data as { hour?: number; minute?: number } | undefined

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus()
          break
        }
      }
      if (allClients.length === 0) {
        await self.clients.openWindow('/')
      }

      if (typeof data?.hour === 'number' && typeof data?.minute === 'number') {
        const timestamp = nextTimestamp(data.hour, data.minute)
        await scheduleReminder({ hour: data.hour, minute: data.minute, timestamp })
        await saveReminderPrefs({
          enabled: true,
          hour: data.hour,
          minute: data.minute,
        })
      }
    })(),
  )
})

self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data as { hour?: number; minute?: number } | undefined
  if (typeof data?.hour !== 'number' || typeof data?.minute !== 'number') return
  const timestamp = nextTimestamp(data.hour, data.minute)
  event.waitUntil(
    (async () => {
      await scheduleReminder({ hour: data.hour!, minute: data.minute!, timestamp })
      await saveReminderPrefs({
        enabled: true,
        hour: data.hour!,
        minute: data.minute!,
      })
    })(),
  )
})

export {}
