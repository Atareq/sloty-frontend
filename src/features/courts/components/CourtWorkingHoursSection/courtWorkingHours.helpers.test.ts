import { describe, expect, it } from 'vitest'
import {
  areTimesAlignedToSlotDuration,
  doPricingPeriodsOverlap,
  getCourtWeekdayFromDate,
  getWeekdayLabel,
  getWeekdayShortLabel,
  isPricingPeriodAlignedToSlotDuration,
  isTimeAlignedToSlotDuration,
  isTimeRangeOrdered,
  minutesToTime,
  normalizeTimeString,
  sortPeriodsByStartTime,
  timeToBusinessMinutes,
  timeToMinutes,
  toApiTimeString,
  weekdays,
} from './courtWorkingHours.helpers'

describe('courtWorkingHours.helpers', () => {
  describe('weekday helpers', () => {
    it('maps backend weekdays to Arabic labels starting from Saturday', () => {
      expect(weekdays.map((weekday) => getWeekdayLabel(weekday))).toEqual([
        'السبت',
        'الأحد',
        'الاثنين',
        'الثلاثاء',
        'الأربعاء',
        'الخميس',
        'الجمعة',
      ])
    })

    it('maps backend weekdays to short Arabic labels starting from Saturday', () => {
      expect(weekdays.map((weekday) => getWeekdayShortLabel(weekday))).toEqual([
        'سبت',
        'أحد',
        'اثنين',
        'ثلاثاء',
        'أربعاء',
        'خميس',
        'جمعة',
      ])
    })

    it('determines the backend Saturday-first CourtWeekday from a date', () => {
      // 2026-07-25 is a Saturday -> 0
      expect(getCourtWeekdayFromDate('2026-07-25')).toBe(0)
      // 2026-07-26 is a Sunday -> 1
      expect(getCourtWeekdayFromDate('2026-07-26')).toBe(1)
      // 2026-07-27 is a Monday -> 2
      expect(getCourtWeekdayFromDate('2026-07-27')).toBe(2)
      // 2026-07-31 is a Friday -> 6
      expect(getCourtWeekdayFromDate('2026-07-31')).toBe(6)
    })
  })

  describe('time normalization & conversion', () => {
    it('normalizes time strings to HH:MM', () => {
      expect(normalizeTimeString('08:00:00')).toBe('08:00')
      expect(normalizeTimeString('08:00')).toBe('08:00')
      expect(normalizeTimeString('00:00:00')).toBe('00:00')
    })

    it('converts HH:MM to API HH:MM:00 format without altering 00:00', () => {
      expect(toApiTimeString('08:00')).toBe('08:00:00')
      expect(toApiTimeString('00:00')).toBe('00:00:00')
      expect(toApiTimeString('23:30')).toBe('23:30:00')
    })

    it('converts valid wall-clock time strings to minutes', () => {
      expect(timeToMinutes('08:00')).toBe(480)
      expect(timeToMinutes('00:00')).toBe(0)
      expect(timeToMinutes('23:59')).toBe(1439)
      expect(minutesToTime(480)).toBe('08:00')
      expect(minutesToTime(0)).toBe('00:00')
    })

    it('returns NaN for invalid time strings in timeToMinutes', () => {
      expect(timeToMinutes('invalid')).toBeNaN()
      expect(timeToMinutes('25:00')).toBeNaN()
      expect(timeToMinutes('12:60')).toBeNaN()
    })
  })

  describe('timeToBusinessMinutes (boundary semantics)', () => {
    it('evaluates 00:00 as minute 0 for start boundary', () => {
      expect(timeToBusinessMinutes('00:00', 'start')).toBe(0)
      expect(timeToBusinessMinutes('00:00')).toBe(0)
    })

    it('evaluates 00:00 as minute 1440 for end boundary', () => {
      expect(timeToBusinessMinutes('00:00', 'end')).toBe(1440)
      expect(timeToBusinessMinutes('00:00:00', 'end')).toBe(1440)
    })

    it('evaluates other times identically regardless of boundary role', () => {
      expect(timeToBusinessMinutes('18:00', 'start')).toBe(1080)
      expect(timeToBusinessMinutes('18:00', 'end')).toBe(1080)
      expect(timeToBusinessMinutes('08:30', 'start')).toBe(510)
      expect(timeToBusinessMinutes('08:30', 'end')).toBe(510)
    })
  })

  describe('isTimeRangeOrdered', () => {
    it('accepts 18:00 -> 00:00 as a valid end-of-day boundary', () => {
      expect(isTimeRangeOrdered({ starts_at: '18:00', ends_at: '00:00' })).toBe(true)
    })

    it('accepts 23:00 -> 00:00 as a valid end-of-day boundary', () => {
      expect(isTimeRangeOrdered({ starts_at: '23:00', ends_at: '00:00' })).toBe(true)
    })

    it('accepts 00:00 -> 08:00 as a valid morning period', () => {
      expect(isTimeRangeOrdered({ starts_at: '00:00', ends_at: '08:00' })).toBe(true)
    })

    it('explicitly rejects 00:00 -> 00:00', () => {
      expect(isTimeRangeOrdered({ starts_at: '00:00', ends_at: '00:00' })).toBe(false)
      expect(isTimeRangeOrdered({ starts_at: '00:00:00', ends_at: '00:00:00' })).toBe(false)
    })

    it('rejects general overnight ranges past midnight', () => {
      expect(isTimeRangeOrdered({ starts_at: '22:00', ends_at: '02:00' })).toBe(false)
      expect(isTimeRangeOrdered({ starts_at: '20:00', ends_at: '04:00' })).toBe(false)
    })

    it('rejects ranges where end time is before or equal to start time', () => {
      expect(isTimeRangeOrdered({ starts_at: '14:00', ends_at: '12:00' })).toBe(false)
      expect(isTimeRangeOrdered({ starts_at: '10:00', ends_at: '10:00' })).toBe(false)
    })

    it('rejects missing or empty start/end values', () => {
      expect(isTimeRangeOrdered({ starts_at: '', ends_at: '12:00' })).toBe(false)
      expect(isTimeRangeOrdered({ starts_at: '10:00', ends_at: '' })).toBe(false)
    })
  })

  describe('sortPeriodsByStartTime', () => {
    it('sorts periods strictly by their start boundary', () => {
      const periods = [
        { starts_at: '22:00', ends_at: '00:00' },
        { starts_at: '16:00', ends_at: '22:00' },
        { starts_at: '00:00', ends_at: '08:00' },
      ]

      const sorted = sortPeriodsByStartTime(periods)

      expect(sorted.map((period) => period.starts_at)).toEqual([
        '00:00',
        '16:00',
        '22:00',
      ])
    })

    it('keeps a period ending at 00:00 in position based on its start time', () => {
      const periods = [
        { starts_at: '18:00', ends_at: '00:00' },
        { starts_at: '10:00', ends_at: '18:00' },
      ]

      const sorted = sortPeriodsByStartTime(periods)

      expect(sorted[0].starts_at).toBe('10:00')
      expect(sorted[1].starts_at).toBe('18:00')
    })
  })

  describe('doPricingPeriodsOverlap', () => {
    it('allows contiguous/adjacent periods where one ends and next starts at 18:00', () => {
      expect(
        doPricingPeriodsOverlap([
          { starts_at: '10:00', ends_at: '18:00', price: '100' },
          { starts_at: '18:00', ends_at: '00:00', price: '150' },
        ]),
      ).toBe(false)
    })

    it('allows adjacent periods 01:00-05:00 and 05:00-09:00 without conflict', () => {
      expect(
        doPricingPeriodsOverlap([
          { starts_at: '01:00', ends_at: '05:00', price: '200' },
          { starts_at: '05:00', ends_at: '09:00', price: '300' },
        ]),
      ).toBe(false)
    })

    it('detects overlap when first period ends after next period starts (01:00-05:00 and 04:00-09:00)', () => {
      expect(
        doPricingPeriodsOverlap([
          { starts_at: '01:00', ends_at: '05:00', price: '200' },
          { starts_at: '04:00', ends_at: '09:00', price: '300' },
        ]),
      ).toBe(true)
    })

    it('detects overlap between identical periods (01:00-05:00 and 01:00-05:00)', () => {
      expect(
        doPricingPeriodsOverlap([
          { starts_at: '01:00', ends_at: '05:00', price: '200' },
          { starts_at: '01:00', ends_at: '05:00', price: '300' },
        ]),
      ).toBe(true)
    })

    it('allows adjacent periods starting from midnight (00:00-01:00 and 01:00-05:00)', () => {
      expect(
        doPricingPeriodsOverlap([
          { starts_at: '00:00', ends_at: '01:00', price: '200' },
          { starts_at: '01:00', ends_at: '05:00', price: '300' },
        ]),
      ).toBe(false)
    })

    it('detects overlap when first period ends after next period starts', () => {
      expect(
        doPricingPeriodsOverlap([
          { starts_at: '10:00', ends_at: '19:00', price: '100' },
          { starts_at: '18:00', ends_at: '00:00', price: '150' },
        ]),
      ).toBe(true)
    })

    it('detects overlap between two periods competing for midnight ending', () => {
      expect(
        doPricingPeriodsOverlap([
          { starts_at: '18:00', ends_at: '00:00', price: '150' },
          { starts_at: '22:00', ends_at: '00:00', price: '200' },
        ]),
      ).toBe(true)
    })

    it('allows non-adjacent non-overlapping periods across the day', () => {
      expect(
        doPricingPeriodsOverlap([
          { starts_at: '00:00', ends_at: '04:00', price: '100' },
          { starts_at: '18:00', ends_at: '00:00', price: '150' },
        ]),
      ).toBe(false)
    })

    it('handles unsorted input correctly by sorting before checking overlap', () => {
      expect(
        doPricingPeriodsOverlap([
          { starts_at: '18:00', ends_at: '00:00', price: '150' },
          { starts_at: '10:00', ends_at: '18:00', price: '100' },
        ]),
      ).toBe(false)
    })
  })

  describe('slot duration alignment with boundary roles', () => {
    it('aligns 00:00 to slot duration according to boundary role', () => {
      // 60-min slots: both 0 and 1440 divide 60
      expect(isTimeAlignedToSlotDuration('00:00', 60, 'start')).toBe(true)
      expect(isTimeAlignedToSlotDuration('00:00', 60, 'end')).toBe(true)

      // 100-min hypothetical slot: 0 divides 100, but 1440 does NOT divide 100 (1440 % 100 = 40)
      // This regression test proves boundary roles are preserved and not assumed interchangeable!
      expect(isTimeAlignedToSlotDuration('00:00', 100, 'start')).toBe(true)
      expect(isTimeAlignedToSlotDuration('00:00', 100, 'end')).toBe(false)
    })

    it('validates pricing period alignment preserving start and end roles', () => {
      expect(
        isPricingPeriodAlignedToSlotDuration(
          { starts_at: '18:00', ends_at: '00:00' },
          60,
        ),
      ).toBe(true)

      expect(
        isPricingPeriodAlignedToSlotDuration(
          { starts_at: '00:00', ends_at: '08:00' },
          60,
        ),
      ).toBe(true)

      expect(
        isPricingPeriodAlignedToSlotDuration(
          { starts_at: '18:15', ends_at: '00:00' },
          60,
        ),
      ).toBe(false)

      expect(
        isPricingPeriodAlignedToSlotDuration(
          { starts_at: '18:00', ends_at: '23:45' },
          60,
        ),
      ).toBe(false)
    })

    it('areTimesAlignedToSlotDuration supports explicit TimeBoundaryItems', () => {
      expect(
        areTimesAlignedToSlotDuration(
          [
            { time: '18:00', role: 'start' },
            { time: '00:00', role: 'end' },
          ],
          60,
        ),
      ).toBe(true)

      expect(
        areTimesAlignedToSlotDuration(
          [
            { time: '00:00', role: 'start' },
            { time: '00:00', role: 'end' },
          ],
          100,
        ),
      ).toBe(false) // Because end is 1440 % 100 !== 0
    })

    it('returns true when slotDurationMinutes is undefined', () => {
      expect(isTimeAlignedToSlotDuration('18:17', undefined)).toBe(true)
      expect(areTimesAlignedToSlotDuration(['18:17'], undefined)).toBe(true)
      expect(
        isPricingPeriodAlignedToSlotDuration(
          { starts_at: '18:17', ends_at: '23:19' },
          undefined,
        ),
      ).toBe(true)
    })
  })
})
