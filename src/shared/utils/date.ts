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

export function getLastSevenDaysRange(today = new Date()): {
  date_from: string
  date_to: string
} {
  return {
    date_from: formatDateInputValue(addDays(today, -7)),
    date_to: formatDateInputValue(today),
  }
}
