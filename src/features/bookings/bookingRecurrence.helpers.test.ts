import { describe, expect, it } from 'vitest'
import { hasActiveRecurrence, shouldLoadRecurrenceNextPreview } from './bookingRecurrence.helpers'

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

describe('shouldLoadRecurrenceNextPreview', () => {
  it('loads only for confirmed active recurrence', () => {
    expect(
      shouldLoadRecurrenceNextPreview({
        status: 'CONFIRMED',
        is_recurring: true,
        recurrence_status: 'ACTIVE',
      }),
    ).toBe(true)
  })

  it.each([
    ['HOLD', true, 'ACTIVE'],
    ['CONFIRMED', false, null],
    ['CONFIRMED', true, 'RENEWED'],
    ['CONFIRMED', true, 'ENDED'],
    ['COMPLETED', true, 'ACTIVE'],
  ] as const)(
    'does not load for status=%s recurring=%s recurrence=%s',
    (status, isRecurring, recurrenceStatus) => {
      expect(
        shouldLoadRecurrenceNextPreview({
          status,
          is_recurring: isRecurring,
          recurrence_status: recurrenceStatus,
        }),
      ).toBe(false)
    },
  )
})
