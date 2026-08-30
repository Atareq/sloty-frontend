import { addDays, formatDateInputValue } from '../../shared/utils/date'

export const SCHEDULE_SYNC_WINDOW_DAYS = 31

const EGYPT_TIME_ZONE = 'Africa/Cairo'

function getEgyptToday(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: EGYPT_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(now)
  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value)

  return new Date(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
  )
}

/** Returns Sloty's bounded Schedule cache window: today + next 30 days. */
export function getScheduleSyncWindow(now = new Date()): {
  dateFrom: string
  dateTo: string
  dates: string[]
} {
  const today = getEgyptToday(now)
  const dates = Array.from(
    { length: SCHEDULE_SYNC_WINDOW_DAYS },
    (_, index) => formatDateInputValue(addDays(today, index)),
  )

  return {
    dateFrom: dates[0],
    dateTo: dates[dates.length - 1],
    dates,
  }
}

export function isDateInsideScheduleSyncWindow(
  dateValue: string,
  now = new Date(),
): boolean {
  const { dateFrom, dateTo } = getScheduleSyncWindow(now)

  return dateValue >= dateFrom && dateValue <= dateTo
}
