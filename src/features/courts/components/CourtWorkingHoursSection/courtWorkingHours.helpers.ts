import type { CourtWeekday } from '../../courtWorkingHours.types'

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
