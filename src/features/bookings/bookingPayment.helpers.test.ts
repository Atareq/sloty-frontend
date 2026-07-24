import { describe, expect, it } from 'vitest'
import { hasPositiveRemainingAmount } from './bookingPayment.helpers'

describe('booking payment helpers', () => {
  it('detects positive remaining amount strings only', () => {
    expect(hasPositiveRemainingAmount('100.00')).toBe(true)
    expect(hasPositiveRemainingAmount('0.01')).toBe(true)
    expect(hasPositiveRemainingAmount('0.00')).toBe(false)
    expect(hasPositiveRemainingAmount('')).toBe(false)
    expect(hasPositiveRemainingAmount(null)).toBe(false)
    expect(hasPositiveRemainingAmount(undefined)).toBe(false)
    expect(hasPositiveRemainingAmount('not-money')).toBe(false)
  })
})
