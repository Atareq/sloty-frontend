const BOOKING_DETAIL_TIME_ZONE = 'Africa/Cairo'

export interface BookingDetailTimePresentation {
  value: string
  clarification: string | null
}

export interface BookingDetailDateTimeRange {
  date: string
  start: BookingDetailTimePresentation
  end: BookingDetailTimePresentation
}

const bookingDetailDateFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  timeZone: BOOKING_DETAIL_TIME_ZONE,
  weekday: 'long',
})

const bookingDetailTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  timeZone: BOOKING_DETAIL_TIME_ZONE,
})

function parseBookingDateTime(
  value: string,
  fallbackDate?: string | null,
): Date | null {
  const dateTimeValue =
    value.includes('T') || !fallbackDate ? value : `${fallbackDate}T${value}`
  const date = new Date(dateTimeValue)

  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Adds the operational clarification only to the already displayed clock
 * value. It does not parse backend timestamps or alter timezone conversion.
 */
export function formatBookingDetailTime(
  displayedTime: string,
): BookingDetailTimePresentation {
  const match = displayedTime.match(/^(\d{1,2}):(\d{2})$/)

  if (!match) {
    return { value: displayedTime, clarification: null }
  }

  const hour = Number(match[1])
  const minute = match[2]
  const value = `${String(hour).padStart(2, '0')}:${minute}`

  return {
    value,
    clarification:
      minute === '00'
        ? hour === 0
          ? '(منتصف الليل)'
          : hour === 12
            ? '(ظهرًا)'
            : null
        : null,
  }
}

/**
 * Formats the existing Egypt-local booking datetime values for detail/review
 * surfaces while keeping schedule and public-schedule formatters untouched.
 */
export function formatBookingDetailDateTimeRange(
  startTime: string,
  endTime: string,
  fallbackDate?: string | null,
): BookingDetailDateTimeRange | null {
  const startDate = parseBookingDateTime(startTime, fallbackDate)
  const endDate = parseBookingDateTime(endTime, fallbackDate)

  if (!startDate || !endDate) {
    return null
  }

  return {
    date: bookingDetailDateFormatter.format(startDate),
    start: formatBookingDetailTime(bookingDetailTimeFormatter.format(startDate)),
    end: formatBookingDetailTime(bookingDetailTimeFormatter.format(endDate)),
  }
}
