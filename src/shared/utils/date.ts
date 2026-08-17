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
  }).format(date)
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
