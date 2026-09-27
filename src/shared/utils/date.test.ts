import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatArabicConflictMoment,
  formatArabicMonthYear,
  formatArabicPeriodBound,
  formatArabicPeriodRange,
  formatCairoLastUpdate,
  formatDateInputValue,
  getCurrentMonthValue,
  getGlobalFreshnessLabel,
  getLastSevenDaysRange,
  getNextMonthValue,
  getPreviousCalendarDate,
  getPreviousMonthValue,
} from './date'

describe('date utils', () => {
  it('formats native date input values', () => {
    expect(formatDateInputValue(new Date(2026, 6, 21))).toBe('2026-07-21')
  })

  it('adds calendar days without mutating the input date', () => {
    const date = new Date(2026, 6, 21)

    expect(formatDateInputValue(addDays(date, -7))).toBe('2026-07-14')
    expect(formatDateInputValue(date)).toBe('2026-07-21')
  })

  it('returns the last seven days range', () => {
    expect(getLastSevenDaysRange(new Date(2026, 6, 21))).toEqual({
      date_from: '2026-07-14',
      date_to: '2026-07-21',
    })
  })

  it('formats a local conflict moment without year for recurring feedback', () => {
    const label = formatArabicConflictMoment('2026-09-25T11:00:00+00:00')

    expect(label).toContain('سبتمبر')
    expect(label).toContain('،')
    expect(label).not.toMatch(/٢٠٢٦|2026/)
  })

  it('formats a Cairo business period bound with weekday, date, and time', () => {
    const label = formatArabicPeriodBound('2026-09-04T08:00:00.000Z')

    expect(label).toContain('الجمعة')
    expect(label).toContain('سبتمبر')
    expect(label).toMatch(/٢٠٢٦|2026/)
    expect(label).toContain('·')
  })

  it('formats a cross-day period as from/to labels', () => {
    const period = formatArabicPeriodRange(
      '2026-09-04T20:00:00.000Z',
      '2026-09-04T23:00:00.000Z',
    )

    expect(period).not.toBeNull()
    expect(period?.startLabel).toContain('الجمعة')
    expect(period?.endLabel).toContain('السبت')
  })

  it('formats Cairo last update for today and prior days', () => {
    const todaySimulated = new Date('2026-09-17T15:00:00.000Z')
    // Same day in Cairo:
    const sameDay = '2026-09-17T11:30:00.000Z'
    const todayLabel = formatCairoLastUpdate(sameDay, todaySimulated)
    expect(todayLabel).toMatch(/^آخر تحديث/)
    expect(todayLabel).not.toContain('سبتمبر')

    // Prior day in Cairo:
    const priorDay = '2026-09-15T11:30:00.000Z'
    const priorLabel = formatCairoLastUpdate(priorDay, todaySimulated)
    expect(priorLabel).toContain('آخر تحديث')
    expect(priorLabel).toContain('سبتمبر')
  })

  it('formats global freshness label with online, offline, and syncing states', () => {
    const todaySimulated = new Date('2026-09-17T15:00:00.000Z')
    const timestamp = '2026-09-17T11:30:00.000Z'

    // Syncing:
    expect(
      getGlobalFreshnessLabel({
        timestamp,
        isSyncing: true,
        now: todaySimulated,
      }),
    ).toBe('جاري التحديث...')

    // Online with timestamp:
    expect(
      getGlobalFreshnessLabel({
        timestamp,
        isOfflineLike: false,
        now: todaySimulated,
      }),
    ).toMatch(/^آخر تحديث/)

    // Offline with timestamp:
    expect(
      getGlobalFreshnessLabel({
        timestamp,
        isOfflineLike: true,
        now: todaySimulated,
      }),
    ).toMatch(/^بدون إنترنت · آخر تحديث/)

    // Online without timestamp:
    expect(
      getGlobalFreshnessLabel({
        timestamp: null,
        isOfflineLike: false,
      }),
    ).toBe('بانتظار أول تحديث')

    // Offline without timestamp:
    expect(
      getGlobalFreshnessLabel({
        timestamp: null,
        isOfflineLike: true,
      }),
    ).toBe('بدون إنترنت')
  })

  describe('getPreviousCalendarDate', () => {
    it('subtracts one calendar day for a mid-month date', () => {
      expect(getPreviousCalendarDate('2026-09-17')).toBe('2026-09-16')
    })

    it('subtracts one calendar day across month boundary', () => {
      expect(getPreviousCalendarDate('2026-10-01')).toBe('2026-09-30')
    })

    it('subtracts one calendar day across year boundary', () => {
      expect(getPreviousCalendarDate('2027-01-01')).toBe('2026-12-31')
    })

    it('handles leap year February boundary', () => {
      expect(getPreviousCalendarDate('2024-03-01')).toBe('2024-02-29')
    })

    it('handles non-leap year February boundary', () => {
      expect(getPreviousCalendarDate('2025-03-01')).toBe('2025-02-28')
    })
  })

  describe('month helpers', () => {
    it('getCurrentMonthValue returns YYYY-MM format', () => {
      expect(getCurrentMonthValue(new Date(2026, 8, 27))).toBe('2026-09')
      expect(getCurrentMonthValue(new Date(2026, 0, 5))).toBe('2026-01')
    })

    it('getPreviousMonthValue decrements month and rolls over year boundary', () => {
      expect(getPreviousMonthValue('2026-09')).toBe('2026-08')
      expect(getPreviousMonthValue('2026-01')).toBe('2025-12')
      expect(getPreviousMonthValue('invalid')).toBe('invalid')
    })

    it('getNextMonthValue increments month and rolls over year boundary', () => {
      expect(getNextMonthValue('2026-09')).toBe('2026-10')
      expect(getNextMonthValue('2026-12')).toBe('2027-01')
      expect(getNextMonthValue('invalid')).toBe('invalid')
    })

    it('formatArabicMonthYear formats month and year in Arabic with Latin numerals', () => {
      expect(formatArabicMonthYear('2026-09')).toBe('سبتمبر 2026')
      expect(formatArabicMonthYear('2026-08')).toBe('أغسطس 2026')
      expect(formatArabicMonthYear('2026-10')).toBe('أكتوبر 2026')
      expect(formatArabicMonthYear('2027-01')).toBe('يناير 2027')
      expect(formatArabicMonthYear('invalid')).toBe('invalid')
    })
  })
})
