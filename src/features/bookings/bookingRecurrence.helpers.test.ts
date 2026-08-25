import { describe, expect, it } from 'vitest'
import { hasActiveRecurrence } from './bookingRecurrence.helpers'

describe('hasActiveRecurrence', () => {
  it('requires both recurring identity and ACTIVE lifecycle state', () => {
    expect(hasActiveRecurrence({ is_recurring: true, recurrence_status: 'ACTIVE' }))
      .toBe(true)
    expect(hasActiveRecurrence({ is_recurring: true, recurrence_status: 'ENDED' }))
      .toBe(false)
    expect(hasActiveRecurrence({ is_recurring: true, recurrence_status: 'RENEWED' }))
      .toBe(false)
    expect(hasActiveRecurrence({ is_recurring: false, recurrence_status: 'ACTIVE' }))
      .toBe(false)
  })
})
