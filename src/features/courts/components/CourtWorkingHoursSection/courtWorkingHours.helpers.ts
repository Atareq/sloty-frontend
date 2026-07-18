import type {
  CourtWeekday,
  CourtWorkingHourBlock,
  CourtWorkingHourBlockPayload,
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

export function isSameDayValidBlock(
  block: Pick<CourtWorkingHourBlock, 'start_time' | 'end_time'>,
): boolean {
  if (!block.start_time || !block.end_time) {
    return false
  }

  return timeToMinutes(block.end_time) > timeToMinutes(block.start_time)
}

export function sortBlocksByStartTime<T extends CourtWorkingHourBlockPayload>(
  blocks: T[],
): T[] {
  return [...blocks].sort(
    (first, second) => {
      const firstStart = timeToMinutes(first.start_time)
      const secondStart = timeToMinutes(second.start_time)

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

export function doBlocksOverlap(
  blocks: CourtWorkingHourBlockPayload[],
): boolean {
  const sortedBlocks = sortBlocksByStartTime(blocks)

  return sortedBlocks.some((block, index) => {
    const nextBlock = sortedBlocks[index + 1]

    return nextBlock
      ? timeToMinutes(block.end_time) > timeToMinutes(nextBlock.start_time)
      : false
  })
}
