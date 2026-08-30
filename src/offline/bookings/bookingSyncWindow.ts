import { addDays, formatDateInputValue } from '../../shared/utils/date'

export const BOOKING_SYNC_WINDOW_DAYS = 7

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

/**
 * Returns Sloty's bounded Booking History cache window:
 * previous 7 calendar days including today.
 */
export function getBookingSyncWindow(now = new Date()): {
  dateFrom: string
  dateTo: string
} {
  const today = getEgyptToday(now)

  return {
    dateFrom: formatDateInputValue(
      addDays(today, -(BOOKING_SYNC_WINDOW_DAYS - 1)),
    ),
    dateTo: formatDateInputValue(today),
  }
}

export function isBookingDateRangeInsideSyncWindow(
  params: {
    date?: string
    date_from?: string
    date_to?: string
  },
  now = new Date(),
): boolean {
  const window = getBookingSyncWindow(now)
  const requestedFrom = params.date ?? params.date_from ?? window.dateFrom
  const requestedTo = params.date ?? params.date_to ?? window.dateTo

  return requestedFrom >= window.dateFrom && requestedTo <= window.dateTo
}
