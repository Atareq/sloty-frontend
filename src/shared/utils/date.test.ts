import { describe, expect, it } from 'vitest'
import {
  addDays,
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
})
