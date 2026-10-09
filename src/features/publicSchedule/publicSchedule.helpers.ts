import { buildPathWithQuery } from '../../shared/utils/buildPathWithQuery'
import { addDays, formatDateInputValue } from '../../shared/utils/date'
import type {
  PublicCourtAvailabilityResponse,
  PublicScheduleSlot,
} from './publicSchedule.types'

export const PUBLIC_SCHEDULE_WINDOW_DAYS = 32
const EGYPT_TIME_ZONE = 'Africa/Cairo'
const PM_START_MINUTES = 12 * 60

const VALID_DATE_YYYY_MM_DD_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const VALID_TIME_24H_HH_MM_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const ISO_OFFSET_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i

export interface PublicScheduleHandoffContext {
  date?: string | null
  time?: string | null
}

export interface ParsedPublicScheduleHandoff {
  date: string | null
  time: string | null
}

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
 * Validates that a candidate string is a real concrete `YYYY-MM-DD` calendar date.
 */
export function isValidPublicScheduleHandoffDate(
  value: unknown,
): value is string {
  if (typeof value !== 'string') {
    return false
  }

  const trimmed = value.trim()
  if (!VALID_DATE_YYYY_MM_DD_PATTERN.test(trimmed)) {
    return false
  }

  const [year, month, day] = trimmed.split('-').map(Number)
  if (!year || !month || !day) {
    return false
  }

  const candidate = new Date(year, month - 1, day, 12, 0, 0)
  if (Number.isNaN(candidate.getTime())) {
    return false
  }

  return formatDateInputValue(candidate) === trimmed
}

/**
 * Validates that a candidate string is a valid 24-hour `HH:MM` time (`00:00`–`23:59`).
 */
export function isValidPublicScheduleHandoffTime(
  value: unknown,
): value is string {
  if (typeof value !== 'string') {
    return false
  }

  return VALID_TIME_24H_HH_MM_PATTERN.test(value.trim())
}

/**
 * Parses and validates optional Phase 6 discovery handoff query parameters
 * (`?date=YYYY-MM-DD&time=HH:MM`) from `location.search`.
 *
 * - `date` must be a valid concrete `YYYY-MM-DD` calendar date AND inside
 *   `getPublicScheduleDateWindow(now)`.
 * - Invalid or out-of-window `date` ignores both `date` and `time` (`date: null`, `time: null`).
 * - Valid `time` without a valid in-window `date` is ignored (`time: null`).
 * - Invalid `time` with a valid in-window `date` preserves `date` and sets `time: null`.
 */
export function parsePublicScheduleHandoffSearch(
  search: string,
  now = new Date(),
): ParsedPublicScheduleHandoff {
  const searchParams = new URLSearchParams(search)
  const rawDate = searchParams.get('date')

  if (!isValidPublicScheduleHandoffDate(rawDate)) {
    return { date: null, time: null }
  }

  const normalizedDate = rawDate.trim()
  if (!isDateInsidePublicScheduleWindow(normalizedDate, now)) {
    return { date: null, time: null }
  }

  const rawTime = searchParams.get('time')

  if (!isValidPublicScheduleHandoffTime(rawTime)) {
    return { date: normalizedDate, time: null }
  }

  return {
    date: normalizedDate,
    time: rawTime.trim(),
  }
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

function getNextCalendarDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12, 0, 0)

  return formatDateInputValue(addDays(date, 1))
}

function resolveSlotLocalDateAndTime(
  slot: PublicScheduleSlot,
  fallbackDate: string,
): { slotDate: string; slotTime: string } {
  const rawStart = slot.raw.start_time?.trim() ?? ''

  if (rawStart.includes('T')) {
    const literalDatePart = rawStart.split('T')[0] ?? ''
    const literalTimePart = extractTime24Hour(rawStart)

    if (
      ISO_OFFSET_DATETIME_PATTERN.test(rawStart) &&
      !rawStart.endsWith('Z') &&
      isValidPublicScheduleHandoffDate(literalDatePart) &&
      isValidPublicScheduleHandoffTime(literalTimePart)
    ) {
      return {
        slotDate: literalDatePart,
        slotTime: literalTimePart,
      }
    }

    if (ISO_OFFSET_DATETIME_PATTERN.test(rawStart)) {
      const parsed = new Date(rawStart)
      if (!Number.isNaN(parsed.getTime())) {
        const dateParts = new Intl.DateTimeFormat('en-CA', {
          day: '2-digit',
          month: '2-digit',
          timeZone: EGYPT_TIME_ZONE,
          year: 'numeric',
        }).formatToParts(parsed)
        const timeParts = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          hour12: false,
          minute: '2-digit',
          timeZone: EGYPT_TIME_ZONE,
        }).formatToParts(parsed)
        const getPart = (
          parts: Intl.DateTimeFormatPart[],
          type: string,
        ): string => parts.find((part) => part.type === type)?.value ?? ''

        const cairoDate = `${getPart(dateParts, 'year')}-${getPart(dateParts, 'month')}-${getPart(dateParts, 'day')}`
        const cairoTime = `${getPart(timeParts, 'hour')}:${getPart(timeParts, 'minute')}`

        if (
          isValidPublicScheduleHandoffDate(cairoDate) &&
          isValidPublicScheduleHandoffTime(cairoTime)
        ) {
          return {
            slotDate: cairoDate,
            slotTime: cairoTime,
          }
        }
      }
    }

    if (
      isValidPublicScheduleHandoffDate(literalDatePart) &&
      isValidPublicScheduleHandoffTime(literalTimePart)
    ) {
      return {
        slotDate: literalDatePart,
        slotTime: literalTimePart,
      }
    }
  }

  return {
    slotDate: fallbackDate,
    slotTime: slot.startTime,
  }
}

/**
 * Identifies the matching `PublicScheduleSlot.id` for a Phase 6 handoff
 * (`handoffDate` + `handoffTime`), safely handling full Backend datetimes and
 * overnight working hours without special-casing midnight or constructing
 * invalid same-date intervals.
 */
export function findMatchingPublicScheduleHandoffSlotId(
  slots: readonly PublicScheduleSlot[],
  handoffDate: string | null | undefined,
  handoffTime: string | null | undefined,
  scheduleDate?: string | null,
): string | null {
  if (
    !isValidPublicScheduleHandoffDate(handoffDate) ||
    !isValidPublicScheduleHandoffTime(handoffTime)
  ) {
    return null
  }

  const targetDate = handoffDate.trim()
  const targetTime = handoffTime.trim()
  const fallbackDate =
    scheduleDate && isValidPublicScheduleHandoffDate(scheduleDate)
      ? scheduleDate.trim()
      : targetDate
  const overnightNextDate = getNextCalendarDate(targetDate)

  let overnightCandidateId: string | null = null

  for (const slot of slots) {
    const { slotDate, slotTime } = resolveSlotLocalDateAndTime(
      slot,
      fallbackDate,
    )

    if (slotTime !== targetTime) {
      continue
    }

    if (slotDate === targetDate) {
      return slot.id
    }

    if (slotDate === overnightNextDate && overnightCandidateId === null) {
      overnightCandidateId = slot.id
    }
  }

  return overnightCandidateId
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
 * Builds the canonical relative path for a court's public schedule, with
 * optional Phase 6 handoff context (`?date=YYYY-MM-DD` and optional `&time=HH:MM`).
 */
export function buildPublicCourtSchedulePath(
  clubSlug: string,
  courtId: string | number,
  handoffContext?: PublicScheduleHandoffContext | null,
): string {
  const basePath = `/public/${encodeURIComponent(clubSlug)}/courts/${encodeURIComponent(String(courtId))}/schedule`

  if (!handoffContext || !isValidPublicScheduleHandoffDate(handoffContext.date)) {
    return basePath
  }

  const validDate = handoffContext.date.trim()
  const validTime = isValidPublicScheduleHandoffTime(handoffContext.time)
    ? handoffContext.time.trim()
    : undefined

  return buildPathWithQuery(basePath, {
    date: validDate,
    time: validTime,
  })
}

export const buildPublicCourtSchedulePathWithContext =
  buildPublicCourtSchedulePath

export interface BuildCourtScheduleShareUrlParams {
  clubSlug: string
  courtId: string | number
  origin?: string
}

/**
 * Canonical public schedule URL builder.
 *
 * Sole owner of public court schedule URL construction:
 * - route construction (/public/:clubSlug/courts/:courtId/schedule)
 * - path parameter encoding
 * - base URL / origin derivation
 * - final canonical string
 */
export function buildCourtScheduleShareUrl({
  clubSlug,
  courtId,
  origin,
}: BuildCourtScheduleShareUrlParams): string {
  const baseOrigin =
    origin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '')
  return `${baseOrigin}${buildPublicCourtSchedulePath(clubSlug, courtId)}`
}

/**
 * Builds the full absolute URL for a court's public schedule.
 * Alias for buildCourtScheduleShareUrl for backwards compatibility.
 */
export function buildPublicCourtScheduleUrl(
  clubSlug: string,
  courtId: string | number,
  origin?: string,
): string {
  return buildCourtScheduleShareUrl({ clubSlug, courtId, origin })
}
