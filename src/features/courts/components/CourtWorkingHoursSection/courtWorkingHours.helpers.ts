import type {
  CourtPricingPeriodPayload,
  CourtWeekday,
} from '../../courtWorkingHours.types'

export const weekdays: CourtWeekday[] = [5, 6, 0, 1, 2, 3, 4]

const weekdayLabels: Record<CourtWeekday, string> = {
  0: 'الاثنين',
  1: 'الثلاثاء',
  2: 'الأربعاء',
  3: 'الخميس',
  4: 'الجمعة',
  5: 'السبت',
  6: 'الأحد',
}

const shortWeekdayLabels: Record<CourtWeekday, string> = {
  0: 'اثنين',
  1: 'ثلاثاء',
  2: 'أربعاء',
  3: 'خميس',
  4: 'جمعة',
  5: 'سبت',
  6: 'أحد',
}

export type TimeBoundaryRole = 'start' | 'end'

export interface TimeBoundaryItem {
  time: string
  role?: TimeBoundaryRole
}

export function getWeekdayLabel(weekday: CourtWeekday): string {
  return weekdayLabels[weekday]
}

export function getWeekdayShortLabel(weekday: CourtWeekday): string {
  return shortWeekdayLabels[weekday]
}

export function getCourtWeekdayFromDate(dateValue: string): CourtWeekday {
  const jsDay = new Date(`${dateValue}T00:00:00`).getDay()
  const weekdayByJsDay: Record<number, CourtWeekday> = {
    0: 6,
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
  }

  return weekdayByJsDay[jsDay]
}

export function normalizeTimeString(value: string): string {
  return value.split(':').slice(0, 2).join(':')
}

export function toApiTimeString(value: string): string {
  const normalizedValue = normalizeTimeString(value)

  return /^\d{2}:\d{2}$/.test(normalizedValue)
    ? `${normalizedValue}:00`
    : value
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = normalizeTimeString(value).split(':').map(Number)

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return Number.NaN
  }

  return hours * 60 + minutes
}

/**
 * Converts a 24-hour time string into operational business minutes.
 *
 * For role === 'end', '00:00' represents the end-of-day boundary (minute 1440).
 * For role === 'start' (default) or other times, '00:00' is minute 0.
 */
export function timeToBusinessMinutes(
  value: string,
  role: TimeBoundaryRole = 'start',
): number {
  const normalized = normalizeTimeString(value)

  if (role === 'end' && normalized === '00:00') {
    return 24 * 60
  }

  return timeToMinutes(value)
}

function padTimePart(value: number): string {
  return String(value).padStart(2, '0')
}

export function minutesToTime(minutes: number): string {
  return `${padTimePart(Math.floor(minutes / 60))}:${padTimePart(minutes % 60)}`
}

export function isTimeRangeOrdered(
  range: Pick<CourtPricingPeriodPayload, 'starts_at' | 'ends_at'>,
): boolean {
  if (!range.starts_at || !range.ends_at) {
    return false
  }

  const normalizedStart = normalizeTimeString(range.starts_at)
  const normalizedEnd = normalizeTimeString(range.ends_at)

  // 00:00 -> 00:00 is explicitly rejected (neither 24-hour nor valid positive range)
  if (normalizedStart === '00:00' && normalizedEnd === '00:00') {
    return false
  }

  const startMinutes = timeToBusinessMinutes(range.starts_at, 'start')
  const endMinutes = timeToBusinessMinutes(range.ends_at, 'end')

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return false
  }

  return endMinutes > startMinutes
}

export function sortPeriodsByStartTime<
  T extends Pick<CourtPricingPeriodPayload, 'starts_at'>,
>(periods: T[]): T[] {
  return [...periods].sort((first, second) => {
    const firstStart = timeToBusinessMinutes(first.starts_at, 'start')
    const secondStart = timeToBusinessMinutes(second.starts_at, 'start')

    if (!Number.isFinite(firstStart) && !Number.isFinite(secondStart)) {
      return 0
    }

    if (!Number.isFinite(firstStart)) {
      return 1
    }

    if (!Number.isFinite(secondStart)) {
      return -1
    }

    return firstStart - secondStart
  })
}

/**
 * Validates that no two pricing periods overlap on the half-open operational timeline [start, end).
 *
 * Two periods conflict if and only if:
 *   start < other.end && end > other.start
 *
 * Contiguous/adjacent periods (e.g., 01:00-05:00 and 05:00-09:00) share an exact boundary
 * point but do not conflict because periods are half-open intervals [start, end).
 */
export function doPricingPeriodsOverlap<
  T extends Pick<CourtPricingPeriodPayload, 'starts_at' | 'ends_at'>,
>(periods: T[]): boolean {
  for (let i = 0; i < periods.length; i += 1) {
    const period = periods[i]
    const start = timeToBusinessMinutes(period.starts_at, 'start')
    const end = timeToBusinessMinutes(period.ends_at, 'end')

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      continue
    }

    for (let j = i + 1; j < periods.length; j += 1) {
      const other = periods[j]
      const otherStart = timeToBusinessMinutes(other.starts_at, 'start')
      const otherEnd = timeToBusinessMinutes(other.ends_at, 'end')

      if (!Number.isFinite(otherStart) || !Number.isFinite(otherEnd)) {
        continue
      }

      if (start < otherEnd && end > otherStart) {
        return true
      }
    }
  }

  return false
}

export function isTimeAlignedToSlotDuration(
  time: string,
  slotDurationMinutes: number | undefined,
  role: TimeBoundaryRole = 'start',
): boolean {
  if (!slotDurationMinutes) {
    return true
  }

  const minutes = timeToBusinessMinutes(time, role)

  return Number.isFinite(minutes) && minutes % slotDurationMinutes === 0
}

export function areTimesAlignedToSlotDuration(
  times: Array<string | TimeBoundaryItem>,
  slotDurationMinutes: number | undefined,
): boolean {
  if (!slotDurationMinutes) {
    return true
  }

  return times.every((item) => {
    const time = typeof item === 'string' ? item : item.time
    const role = typeof item === 'string' ? 'start' : (item.role ?? 'start')

    return isTimeAlignedToSlotDuration(time, slotDurationMinutes, role)
  })
}

export function isPricingPeriodAlignedToSlotDuration(
  period: Pick<CourtPricingPeriodPayload, 'starts_at' | 'ends_at'>,
  slotDurationMinutes: number | undefined,
): boolean {
  return (
    isTimeAlignedToSlotDuration(
      period.starts_at,
      slotDurationMinutes,
      'start',
    ) &&
    isTimeAlignedToSlotDuration(period.ends_at, slotDurationMinutes, 'end')
  )
}
