import { getReminder, setReminder } from './storage'
import type { ReminderSettings } from './types'

export function getNotificationCapability(): {
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  reason?: string
  triggersSupported: boolean
} {
  const triggersSupported =
    typeof window !== 'undefined' &&
    'TimestampTrigger' in window &&
    'showTrigger' in Notification.prototype

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      supported: false,
      permission: 'unsupported',
      triggersSupported: false,
      reason:
        'This browser doesn’t support notifications. Try Chrome or Edge on desktop/Android.',
    }
  }
  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      permission: 'unsupported',
      triggersSupported: false,
      reason:
        'Service workers are required for reminders when the tab is closed. Use a modern browser over HTTPS.',
    }
  }
  return {
    supported: true,
    permission: Notification.permission,
    triggersSupported,
  }
}

function nextTriggerTimestamp(hour: number, minute: number): number {
  const now = new Date()
  const next = new Date()
  next.setHours(hour, minute, 0, 0)
  if (next.getTime() <= now.getTime() + 5_000) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime()
}

async function waitForActiveWorker(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.ready
  if (reg.active) return reg
  await new Promise<void>((resolve) => {
    const sw = reg.installing || reg.waiting
    if (!sw) {
      resolve()
      return
    }
    sw.addEventListener('statechange', () => {
      if (sw.state === 'activated') resolve()
    })
  })
  return navigator.serviceWorker.ready
}

export async function scheduleDailyReminder(
  settings: ReminderSettings,
): Promise<{ ok: boolean; message: string }> {
  const cap = getNotificationCapability()
  if (!cap.supported) {
    return { ok: false, message: cap.reason ?? 'Notifications unsupported.' }
  }

  if (Notification.permission === 'denied') {
    return {
      ok: false,
      message:
        'Notification permission is blocked. Enable it in browser settings for this site, then try again. Search, weather, and favourites still work.',
    }
  }

  if (Notification.permission !== 'granted') {
    return {
      ok: false,
      message: 'Permission not granted yet — allow notifications first.',
    }
  }

  setReminder(settings)

  const reg = await waitForActiveWorker()

  if (!settings.enabled) {
    reg.active?.postMessage({ type: 'CANCEL_REMINDER' })
    return { ok: true, message: 'Morning reminder turned off.' }
  }

  const when = nextTriggerTimestamp(settings.hour, settings.minute)
  reg.active?.postMessage({
    type: 'SCHEDULE_REMINDER',
    payload: {
      hour: settings.hour,
      minute: settings.minute,
      timestamp: when,
    },
  })

  // Ask SW to keep the schedule across updates (IndexedDB inside SW)
  reg.active?.postMessage({
    type: 'PERSIST_REMINDER',
    payload: {
      hour: settings.hour,
      minute: settings.minute,
      enabled: true,
    },
  })

  // Periodic Background Sync when available (extra wake-ups)
  try {
    type PeriodicSyncManager = {
      register: (tag: string, options: { minInterval: number }) => Promise<void>
    }
    const periodic = (
      reg as ServiceWorkerRegistration & {
        periodicSync?: PeriodicSyncManager
      }
    ).periodicSync
    if (periodic && 'permissions' in navigator) {
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync' as PermissionName,
      })
      if (status.state === 'granted') {
        await periodic.register('weatherboard-reminder-sync', {
          minInterval: 12 * 60 * 60 * 1000,
        })
      }
    }
  } catch {
    // optional capability
  }

  const label = new Date(when).toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

  const reliability = cap.triggersSupported
    ? 'Scheduled with Notification Triggers — can fire with the tab closed.'
    : 'Scheduled via the service worker. For the most reliable closed-tab delivery, use Chrome/Edge (Notification Triggers).'

  return {
    ok: true,
    message: `Reminder set for ${label}. ${reliability}`,
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return Notification.requestPermission()
}

export function loadReminderSettings(): ReminderSettings {
  return getReminder()
}

/** Re-arm SW schedule after reload / deploy when user already opted in */
export async function restoreReminderIfNeeded(): Promise<void> {
  const settings = getReminder()
  if (!settings.enabled) return
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (!('serviceWorker' in navigator)) return
  await scheduleDailyReminder(settings)
}
