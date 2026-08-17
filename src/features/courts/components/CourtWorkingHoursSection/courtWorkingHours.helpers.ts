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

export function getWeekdayLabel(weekday: CourtWeekday): string {
  return weekdayLabels[weekday]
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

  return timeToMinutes(range.ends_at) > timeToMinutes(range.starts_at)
}

export function sortPeriodsByStartTime<T extends Pick<CourtPricingPeriodPayload, 'starts_at'>>(
  periods: T[],
): T[] {
  return [...periods].sort(
    (first, second) => {
      const firstStart = timeToMinutes(first.starts_at)
      const secondStart = timeToMinutes(second.starts_at)

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
    },
  )
}

export function doPricingPeriodsOverlap(
  periods: CourtPricingPeriodPayload[],
): boolean {
  const sortedPeriods = sortPeriodsByStartTime(periods)

  return sortedPeriods.some((period, index) => {
    const nextPeriod = sortedPeriods[index + 1]

    return nextPeriod
      ? timeToMinutes(period.ends_at) > timeToMinutes(nextPeriod.starts_at)
      : false
  })
}

export function areTimesAlignedToSlotDuration(
  times: string[],
  slotDurationMinutes: number | undefined,
): boolean {
  if (!slotDurationMinutes) {
    return true
  }

  return times.every((time) => {
    const minutes = timeToMinutes(time)

    return Number.isFinite(minutes) && minutes % slotDurationMinutes === 0
  })
}
