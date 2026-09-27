function padDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Formats dates for native date inputs.
 *
 * The current frontend uses local calendar dates consistently; Egypt-specific
 * timezone handling can be centralized here later if product flows need it.
 */
export function formatDateInputValue(date: Date): string {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-')
}

export function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date)

  nextDate.setDate(nextDate.getDate() + days)

  return nextDate
}

/**
 * Returns the calendar date (YYYY-MM-DD) exactly one calendar day before the given date string.
 *
 * Uses noon (12:00:00) instantiation to avoid daylight saving time or midnight drift.
 */
export function getPreviousCalendarDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12, 0, 0)

  return formatDateInputValue(addDays(date, -1))
}

export function getRollingDateValues(
  startDate = new Date(),
  days = 7,
): string[] {
  return Array.from({ length: days }, (_, index) =>
    formatDateInputValue(addDays(startDate, index)),
  )
}

export function formatArabicDateWithWeekday(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return dateValue
  }

  return new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function formatArabicCompactDay(dateValue: string): {
  weekday: string
  day: string
} {
  const date = new Date(`${dateValue}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return {
      weekday: dateValue,
      day: '',
    }
  }

  return {
    weekday: new Intl.DateTimeFormat('ar-EG', {
      weekday: 'short',
    }).format(date),
    day: new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
    }).format(date),
  }
}

export function formatArabicDateTime(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo',
  }).format(date)
}

/**
 * Formats a future conflict timestamp for recurring-unavailable feedback.
 *
 * Uses the browser local timezone and returns a compact Arabic label such as
 * `الجمعة 25 سبتمبر، 2:00 م`.
 */
export function formatArabicConflictMoment(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const parts = new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'long',
    weekday: 'long',
  }).formatToParts(date)
  const weekday = parts.find((part) => part.type === 'weekday')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const hour = parts.find((part) => part.type === 'hour')?.value
  const minute = parts.find((part) => part.type === 'minute')?.value
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value
  const dateLabel = [weekday, day, month].filter(Boolean).join(' ')
  const timeLabel = [hour, minute].filter(Boolean).join(':')
  const timeWithPeriod = [timeLabel, dayPeriod].filter(Boolean).join(' ')

  if (!dateLabel || !timeWithPeriod) {
    return null
  }

  return `${dateLabel}، ${timeWithPeriod}`
}

const cairoPeriodFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  month: 'long',
  timeZone: 'Africa/Cairo',
  weekday: 'long',
  year: 'numeric',
})

/**
 * Formats one business period bound as weekday + date + time in Egypt time.
 *
 * Example: الجمعة 4 سبتمبر 2026 · 11:00 ص
 */
export function formatArabicPeriodBound(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const parts = cairoPeriodFormatter.formatToParts(date)
  const weekday = parts.find((part) => part.type === 'weekday')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const year = parts.find((part) => part.type === 'year')?.value
  const hour = parts.find((part) => part.type === 'hour')?.value
  const minute = parts.find((part) => part.type === 'minute')?.value
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value
  const dateLabel = [weekday, day, month, year].filter(Boolean).join(' ')
  const timeLabel = [hour, minute].filter(Boolean).join(':')
  const timeWithPeriod = [timeLabel, dayPeriod].filter(Boolean).join(' ')

  if (!dateLabel || !timeWithPeriod) {
    return cairoPeriodFormatter.format(date)
  }

  return `${dateLabel} · ${timeWithPeriod}`
}

/**
 * Formats a backend period as two labeled lines for money and settlement cards.
 */
export function formatArabicPeriodRange(
  start: string | null | undefined,
  end: string | null | undefined,
): { startLabel: string; endLabel: string } | null {
  const startLabel = formatArabicPeriodBound(start)
  const endLabel = formatArabicPeriodBound(end)

  if (!startLabel && !endLabel) {
    return null
  }

  return {
    startLabel: startLabel ?? '...',
    endLabel: endLabel ?? '...',
  }
}

export function getLastSevenDaysRange(today = new Date()): {
  date_from: string
  date_to: string
} {
  return {
    date_from: formatDateInputValue(addDays(today, -7)),
    date_to: formatDateInputValue(today),
  }
}

export interface GlobalFreshnessLabelOptions {
  timestamp: string | null | undefined
  isOfflineLike?: boolean
  isSyncing?: boolean
  now?: Date
}

/**
 * Formats a last-update timestamp for the global header and sync indicators.
 * Uses Egypt/Cairo timezone. Shows only the time if the timestamp is today in Cairo;
 * otherwise includes the short day/month date.
 */
export function formatCairoLastUpdate(
  timestamp: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!timestamp) {
    return null
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const cairoTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Cairo',
  })
  const timeLabel = cairoTimeFormatter.format(date)

  const cairoDateDayFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const isToday =
    cairoDateDayFormatter.format(date) === cairoDateDayFormatter.format(now)

  if (isToday) {
    return `آخر تحديث ${timeLabel}`
  }

  const cairoDateFormatter = new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Cairo',
  })
  const dateLabel = cairoDateFormatter.format(date)

  return `آخر تحديث ${dateLabel} · ${timeLabel}`
}

/**
 * Derives user-facing freshness copy for the global header sync indicator.
 */
export function getGlobalFreshnessLabel({
  timestamp,
  isOfflineLike = false,
  isSyncing = false,
  now = new Date(),
}: GlobalFreshnessLabelOptions): string {
  if (isSyncing) {
    return 'جاري التحديث...'
  }

  const formatted = formatCairoLastUpdate(timestamp, now)

  if (!formatted) {
    return isOfflineLike ? 'بدون إنترنت' : 'بانتظار أول تحديث'
  }

  return isOfflineLike ? `بدون إنترنت · ${formatted}` : formatted
}

/**
 * Returns the current calendar month formatted as YYYY-MM.
 */
export function getCurrentMonthValue(now = new Date()): string {
  return [now.getFullYear(), padDatePart(now.getMonth() + 1)].join('-')
}

/**
 * Returns the calendar month (YYYY-MM) immediately preceding the given month string.
 */
export function getPreviousMonthValue(monthValue: string): string {
  const [yearStr, monthStr] = monthValue.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  if (!year || !month || month < 1 || month > 12) {
    return monthValue
  }

  if (month === 1) {
    return `${year - 1}-12`
  }

  return `${year}-${padDatePart(month - 1)}`
}

/**
 * Returns the calendar month (YYYY-MM) immediately following the given month string.
 */
export function getNextMonthValue(monthValue: string): string {
  const [yearStr, monthStr] = monthValue.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  if (!year || !month || month < 1 || month > 12) {
    return monthValue
  }

  if (month === 12) {
    return `${year + 1}-01`
  }

  return `${year}-${padDatePart(month + 1)}`
}

/**
 * Formats a YYYY-MM month string into Arabic month and year with Western Arabic numerals.
 *
 * Example: `2026-09` → `سبتمبر 2026`
 */
export function formatArabicMonthYear(monthValue: string): string {
  const [yearStr, monthStr] = monthValue.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  if (!year || !month || month < 1 || month > 12) {
    return monthValue
  }

  const date = new Date(year, month - 1, 1)

  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}
