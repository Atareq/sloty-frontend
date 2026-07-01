import { describe, expect, it } from 'vitest'
import { getWeekdayLabel, weekdays } from './courtWorkingHours.helpers'

describe('CourtWorkingHoursSection helpers', () => {
  it('maps backend weekdays to Arabic labels starting from Monday', () => {
    expect(weekdays.map((weekday) => getWeekdayLabel(weekday))).toEqual([
      'الاثنين',
      'الثلاثاء',
      'الأربعاء',
      'الخميس',
      'الجمعة',
      'السبت',
      'الأحد',
    ])
  })
})
