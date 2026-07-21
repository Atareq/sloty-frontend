import { describe, expect, it } from 'vitest'
import { formatMoneyAmount } from './money'

describe('money utils', () => {
  it('formats backend decimal strings safely', () => {
    expect(formatMoneyAmount('1200.00')).toBe('1,200.00 جنيه')
  })

  it('formats zero and empty values', () => {
    expect(formatMoneyAmount(0)).toBe('0 جنيه')
    expect(formatMoneyAmount(null)).toBe('-')
    expect(formatMoneyAmount(undefined)).toBe('-')
    expect(formatMoneyAmount('')).toBe('-')
  })

  it('supports custom suffix values', () => {
    expect(formatMoneyAmount('1200.00', { suffix: '' })).toBe('1,200.00')
  })
})
