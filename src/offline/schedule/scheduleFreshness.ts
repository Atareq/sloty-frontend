export const SCHEDULE_FRESHNESS_RECENT_MS = 15 * 60 * 1000
export const SCHEDULE_FRESHNESS_OLDER_MS = 2 * 60 * 60 * 1000
export const SCHEDULE_FRESHNESS_VERY_OLD_MS = 24 * 60 * 60 * 1000

function formatCairoTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ar-EG', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Cairo',
  }).format(date)
}

export function getScheduleFreshnessLabel(
  syncedAt: string | null,
  now = new Date(),
): { tone: 'neutral' | 'warning' | 'danger'; text: string } | null {
  if (!syncedAt) {
    return null
  }

  const syncedDate = new Date(syncedAt)

  if (Number.isNaN(syncedDate.getTime())) {
    return {
      tone: 'warning',
      text: 'البيانات محفوظة محليًا وقد تكون اتغيرت.',
    }
  }

  const ageMs = now.getTime() - syncedDate.getTime()
  const lastUpdate = `آخر تحديث ${formatCairoTime(syncedAt)}`

  if (ageMs >= SCHEDULE_FRESHNESS_VERY_OLD_MS) {
    return {
      tone: 'danger',
      text: `${lastUpdate} · البيانات قد تكون اتغيرت من وقت طويل.`,
    }
  }

  if (ageMs >= SCHEDULE_FRESHNESS_OLDER_MS) {
    return {
      tone: 'warning',
      text: `${lastUpdate} · البيانات قد تكون اتغيرت.`,
    }
  }

  return {
    tone: 'neutral',
    text: lastUpdate,
  }
}
