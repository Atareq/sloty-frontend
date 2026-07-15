import type { CourtWeekday } from '../../courtWorkingHours.types'

export const weekdays: CourtWeekday[] = [
  'SATURDAY',
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
]

const weekdayLabels: Record<CourtWeekday, string> = {
  SATURDAY: 'السبت',
  SUNDAY: 'الأحد',
  MONDAY: 'الاثنين',
  TUESDAY: 'الثلاثاء',
  WEDNESDAY: 'الأربعاء',
  THURSDAY: 'الخميس',
  FRIDAY: 'الجمعة',
}

export function getWeekdayLabel(weekday: CourtWeekday): string {
  return weekdayLabels[weekday]
}
