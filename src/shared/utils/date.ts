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
