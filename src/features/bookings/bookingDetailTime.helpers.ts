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

function parseCalendarDateOnly(value: string): Date | null {
  const [year, month, day] = value.split('-').map(Number)

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null
  }

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

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
 * Formats the already localized clock value for booking detail/review sheets.
 * It does not parse backend timestamps or alter timezone conversion.
 */
export function formatBookingDetailTime(
  displayedTime: string,
  options: { includeClarification?: boolean } = {},
): BookingDetailTimePresentation {
  const match = displayedTime.match(/^(\d{1,2}):(\d{2})$/)

  if (!match) {
    return { value: displayedTime, clarification: null }
  }

  const hour = Number(match[1])
  const minute = match[2]
  const displayHour = hour % 12 || 12
  const period = hour < 12 ? 'AM' : 'PM'
  const value = `${String(displayHour).padStart(2, '0')}:${minute} ${period}`

  return {
    value,
    clarification:
      options.includeClarification !== false && minute === '00'
        ? hour === 0
          ? 'منتصف الليل'
          : hour === 12
            ? 'ظهرًا'
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
  if (
    /^\d{1,2}:\d{2}$/.test(startTime) &&
    /^\d{1,2}:\d{2}$/.test(endTime)
  ) {
    const parsedDate = fallbackDate ? parseCalendarDateOnly(fallbackDate) : null

    return {
      date: parsedDate ? bookingDetailDateFormatter.format(parsedDate) : '',
      start: formatBookingDetailTime(startTime),
      end: formatBookingDetailTime(endTime, {
        includeClarification: false,
      }),
    }
  }

  const startDate = parseBookingDateTime(startTime, fallbackDate)
  const endDate = parseBookingDateTime(endTime, fallbackDate)

  if (!startDate || !endDate) {
    return null
  }

  return {
    date: bookingDetailDateFormatter.format(startDate),
    start: formatBookingDetailTime(bookingDetailTimeFormatter.format(startDate)),
    end: formatBookingDetailTime(bookingDetailTimeFormatter.format(endDate), {
      includeClarification: false,
    }),
  }
}
