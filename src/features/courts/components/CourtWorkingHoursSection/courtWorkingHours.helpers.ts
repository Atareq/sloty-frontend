import type { Weekday } from '../../courtWorkingHours.types'

export const weekdays: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

const weekdayLabels: Record<Weekday, string> = {
  0: 'الاثنين',
  1: 'الثلاثاء',
  2: 'الأربعاء',
  3: 'الخميس',
  4: 'الجمعة',
  5: 'السبت',
  6: 'الأحد',
}

export function getWeekdayLabel(weekday: Weekday): string {
  return weekdayLabels[weekday]
}
