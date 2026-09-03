import { describe, expect, it } from 'vitest'
import {
  canBookingEditCustomer,
  canBookingReschedule,
  formatHoldExpiryMessage,
  getBookingNotes,
} from './bookingDisplay.helpers'
import type { BookingListItem } from '../schedule/scheduleApi.types'

describe('formatHoldExpiryMessage', () => {
  const now = new Date('2026-08-25T12:00:00Z')

  it('uses the backend timestamp for a future HOLD countdown', () => {
    expect(formatHoldExpiryMessage('2026-08-25T12:25:00Z', now)).toBe(
      'متبقي 25 دقيقة',
    )
  })

  it('omits countdown when the backend timestamp is missing', () => {
    expect(formatHoldExpiryMessage(null, now)).toBeNull()
  })

  it('shows an elapsed HOLD message without inventing EXPIRED status', () => {
    expect(formatHoldExpiryMessage('2026-08-25T11:59:00Z', now)).toBe(
      'انتهت مهلة دفع العربون',
    )
  })
})

describe('booking edit and reschedule eligibility', () => {
  it.each(['HOLD', 'CONFIRMED'] as const)(
    'allows customer edit for %s',
    (status) => {
      expect(canBookingEditCustomer(status)).toBe(true)
    },
  )

  it.each(['COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'] as const)(
    'hides customer edit for %s',
    (status) => {
      expect(canBookingEditCustomer(status)).toBe(false)
    },
  )

  it('allows reschedule for normal HOLD and CONFIRMED bookings', () => {
    expect(
      canBookingReschedule({
        status: 'HOLD',
        is_recurring: false,
        recurrence_status: null,
      }),
    ).toBe(true)
    expect(
      canBookingReschedule({
        status: 'CONFIRMED',
        is_recurring: false,
        recurrence_status: null,
      }),
    ).toBe(true)
  })

  it('hides reschedule for active recurring bookings', () => {
    expect(
      canBookingReschedule({
        status: 'CONFIRMED',
        is_recurring: true,
        recurrence_status: 'ACTIVE',
      }),
    ).toBe(false)
  })

  it.each(['COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'] as const)(
    'hides reschedule for %s',
    (status) => {
      expect(
        canBookingReschedule({
          status,
          is_recurring: false,
          recurrence_status: null,
        }),
      ).toBe(false)
    },
  )
})

describe('getBookingNotes', () => {
  const booking = {
    id: 1,
    court: 1,
    start_time: '2026-07-21T18:00:00Z',
    end_time: '2026-07-21T19:00:00Z',
    status: 'CONFIRMED',
    is_recurring: false,
    recurrence_status: null,
    previous_recurring_booking_id: null,
    next_recurring_booking_id: null,
  } satisfies BookingListItem

  it('treats null, empty, and whitespace-only notes as absent', () => {
    expect(getBookingNotes({ ...booking, notes: null })).toBeNull()
    expect(getBookingNotes({ ...booking, notes: '' })).toBeNull()
    expect(getBookingNotes({ ...booking, notes: '   \n\t ' })).toBeNull()
  })

  it('returns original meaningful note text for presentation', () => {
    expect(getBookingNotes({ ...booking, notes: '  جهز الكورة\nبدري  ' }))
      .toBe('  جهز الكورة\nبدري  ')
  })
})
