import { addDays, formatDateInputValue } from '../../shared/utils/date'
import type {
  PublicCourtAvailabilityResponse,
  PublicScheduleSlot,
} from './publicSchedule.types'

export const PUBLIC_SCHEDULE_WINDOW_DAYS = 32
const EGYPT_TIME_ZONE = 'Africa/Cairo'
const PM_START_MINUTES = 12 * 60

/**
 * Validates whether a candidate path is a valid public court schedule route.
 * Used for guest navigation and Login redirection guards.
 *
 * Matches: /public/:clubSlug/courts/:courtId/schedule
 */
const PUBLIC_COURT_SCHEDULE_ROUTE_PATTERN =
  /^\/public\/[a-zA-Z0-9_-]+\/courts\/\d+\/schedule$/

export function isValidGuestReturnRoute(path: unknown): path is string {
  if (typeof path !== 'string') {
    return false
  }

  return PUBLIC_COURT_SCHEDULE_ROUTE_PATTERN.test(path.trim())
}

/**
 * Derives today's date in Egypt local timezone (Africa/Cairo).
 */
export function getEgyptToday(now = new Date()): Date {
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
 * Derives the canonical 32-date window for the public schedule:
 * yesterday (today - 1) through today + 30 days in Egypt calendar time.
 */
export function getPublicScheduleDateWindow(now = new Date()): {
  dateFrom: string
  dateTo: string
  dates: string[]
} {
  const today = getEgyptToday(now)
  const dates = Array.from({ length: PUBLIC_SCHEDULE_WINDOW_DAYS }, (_, index) =>
    formatDateInputValue(addDays(today, index - 1)),
  )

  return {
    dateFrom: dates[0],
    dateTo: dates[dates.length - 1],
    dates,
  }
}

/**
 * Returns true if the given YYYY-MM-DD date value falls inside the 32-day public window.
 */
export function isDateInsidePublicScheduleWindow(
  dateValue: string,
  now = new Date(),
): boolean {
  const { dateFrom, dateTo } = getPublicScheduleDateWindow(now)

  return dateValue >= dateFrom && dateValue <= dateTo
}

function timeToMinutes(time: string): number {
  const timePart = time.includes('T') ? time.split('T')[1] : time
  const [hours, minutes] = timePart.split(':').map(Number)

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return 0
  }

  return hours * 60 + minutes
}

function extractTime24Hour(value: string): string {
  const timePart = value.includes('T') ? value.split('T')[1] : value
  return timePart.slice(0, 5)
}

/**
 * Maps the sanitized public court availability API response into board slot structures.
 */
export function mapPublicAvailabilityToScheduleSlots(
  response: PublicCourtAvailabilityResponse,
): PublicScheduleSlot[] {
  return response.slots.map((slot) => {
    const startTime = extractTime24Hour(slot.start_time)
    const endTime = extractTime24Hour(slot.end_time)
    const startMinutes = timeToMinutes(startTime)

    return {
      id: [
        'public-slot',
        response.date,
        startTime.replace(':', ''),
        endTime.replace(':', ''),
      ].join('-'),
      startTime,
      endTime,
      isAvailable: slot.availability === 'AVAILABLE',
      period: startMinutes < PM_START_MINUTES ? 'am' : 'pm',
      raw: slot,
    }
  })
}

/**
 * Builds the canonical relative path for a court's public schedule.
 */
export function buildPublicCourtSchedulePath(
  clubSlug: string,
  courtId: string | number,
): string {
  return `/public/${encodeURIComponent(clubSlug)}/courts/${encodeURIComponent(String(courtId))}/schedule`
}

/**
 * Builds the full absolute URL for a court's public schedule.
 */
export function buildPublicCourtScheduleUrl(
  clubSlug: string,
  courtId: string | number,
  origin?: string,
): string {
  const baseOrigin =
    origin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '')
  return `${baseOrigin}${buildPublicCourtSchedulePath(clubSlug, courtId)}`
}

