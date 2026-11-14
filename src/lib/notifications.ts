import { getReminder, setReminder } from './storage'
import type { ReminderSettings } from './types'

export type NotificationSupport =
  | 'supported'
  | 'no-api'
  | 'no-service-worker'
  | 'denied'
  | 'granted'
  | 'default'

export function getNotificationCapability(): {
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  reason?: string
} {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      supported: false,
      permission: 'unsupported',
      reason:
        'This browser doesn’t support notifications. Try Chrome or Edge on desktop/Android.',
    }
  }
  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      permission: 'unsupported',
      reason:
        'Service workers are required for reminders when the tab is closed. Use a modern browser over HTTPS.',
    }
  }
  return {
    supported: true,
    permission: Notification.permission,
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
        'Notification permission is blocked. Enable it in browser settings for this site, then try again.',
    }
  }

  if (Notification.permission !== 'granted') {
    return {
      ok: false,
      message: 'Permission not granted yet.',
    }
  }

  setReminder(settings)

  if (!settings.enabled) {
    const reg = await navigator.serviceWorker.ready
    reg.active?.postMessage({ type: 'CANCEL_REMINDER' })
    return { ok: true, message: 'Morning reminder turned off.' }
  }

  const when = nextTriggerTimestamp(settings.hour, settings.minute)
  const reg = await navigator.serviceWorker.ready
  reg.active?.postMessage({
    type: 'SCHEDULE_REMINDER',
    payload: {
      hour: settings.hour,
      minute: settings.minute,
      timestamp: when,
    },
  })

  const label = new Date(when).toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

  return {
    ok: true,
    message: `Reminder scheduled for ${label}. It can fire even when this tab is closed.`,
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return Notification.requestPermission()
}

export function loadReminderSettings(): ReminderSettings {
  return getReminder()
}
