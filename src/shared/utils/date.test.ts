import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatArabicPeriodBound,
  formatArabicPeriodRange,
  formatDateInputValue,
  getLastSevenDaysRange,
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
})
