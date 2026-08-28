import { describe, expect, it } from 'vitest'
import {
  formatBookingDateTime,
  formatTime12Hour,
  getEgyptDateValueFromInstant,
  mapBookingSlotToScheduleBooking,
  getScheduleClosingBookings,
  getSlotPeriod,
} from './scheduleBoard.helpers'
import type { BookingListItem, BookingSlot } from './scheduleApi.types'

it('formats 24-hour time values as Arabic 12-hour display values', () => {
  expect(formatTime12Hour('00:00')).toBe('12:00 ص')
  expect(formatTime12Hour('06:00')).toBe('6:00 ص')
  expect(formatTime12Hour('11:30')).toBe('11:30 ص')
  expect(formatTime12Hour('12:00')).toBe('12:00 م')
  expect(formatTime12Hour('18:30')).toBe('6:30 م')
  expect(formatTime12Hour('23:45')).toBe('11:45 م')
})

it('returns invalid time values unchanged', () => {
  expect(formatTime12Hour('bad-time')).toBe('bad-time')
})

it('converts a backend instant to the Egypt calendar date', () => {
  expect(getEgyptDateValueFromInstant('2026-12-01T20:00:00+03:00')).toBe(
    '2026-12-01',
  )
})

describe('scheduleBoard helpers', () => {
  const today = '2026-07-21'
  const now = new Date('2026-07-21T12:00:00Z')

  const closingBooking = (
    id: number,
    status: BookingListItem['status'],
    endTime: string,
    remainingAmount: string | null = null,
  ): BookingListItem => ({
    id,
    court: 7,
    customer_name: `عميل ${id}`,
    start_time: '08:00',
    end_time: endTime,
    status,
    remaining_amount: remainingAmount,
    is_recurring: false,
    recurrence_status: null,
    previous_recurring_booking_id: null,
    next_recurring_booking_id: null,
  })

  it('returns no closing bookings for a future selected date', () => {
    expect(
      getScheduleClosingBookings(
        [closingBooking(1, 'CONFIRMED', '10:00')],
        '2026-07-22',
        now,
      ),
    ).toEqual({
      items: [],
      totalCount: 0,
    })
  })

  it('returns no closing bookings for a past selected date', () => {
    expect(
      getScheduleClosingBookings(
        [closingBooking(1, 'CONFIRMED', '10:00')],
        '2026-07-20',
        now,
      ),
    ).toEqual({
      items: [],
      totalCount: 0,
    })
  })

  it('includes ended confirmed bookings and bookings with remaining amounts', () => {
    const result = getScheduleClosingBookings(
      [
        closingBooking(1, 'CONFIRMED', '10:00'),
        closingBooking(2, 'CONFIRMED', '15:00', '50.00'),
        closingBooking(3, 'COMPLETED', '09:00', '20.00'),
      ],
      today,
      now,
    )

    expect(result.totalCount).toBe(3)
    expect(result.items.map((booking) => booking.id)).toEqual([1, 2, 3])
  })

  it('excludes cancelled, expired, and fully paid completed bookings', () => {
    const result = getScheduleClosingBookings(
      [
        closingBooking(1, 'CANCELLED', '10:00', '100.00'),
        closingBooking(2, 'EXPIRED', '10:00', '100.00'),
        closingBooking(3, 'COMPLETED', '10:00', '0.00'),
        closingBooking(4, 'COMPLETED', '10:00', null),
      ],
      today,
      now,
    )

    expect(result).toEqual({
      items: [],
      totalCount: 0,
    })
  })

  it('sorts by closure priority and end time, returning max three items', () => {
    const result = getScheduleClosingBookings(
      [
        closingBooking(1, 'CONFIRMED', '09:00'),
        closingBooking(2, 'CONFIRMED', '11:00'),
        closingBooking(3, 'CONFIRMED', '16:00', '25.00'),
        closingBooking(4, 'HOLD', '08:00'),
        closingBooking(5, 'COMPLETED', '07:00', '10.00'),
      ],
      today,
      now,
    )

    expect(result.totalCount).toBe(5)
    expect(result.items.map((booking) => booking.id)).toEqual([2, 1, 4])
  })

  it('formats a local booking datetime from date and board time', () => {
    expect(formatBookingDateTime('2026-07-02', '18:00')).toBe(
      '2026-07-02T18:00:00',
    )
  })

  it('maps backend slot price and unavailable status without creating a booking', () => {
    const backendSlot: BookingSlot = {
      date: '2026-07-21',
      start_time: '10:00:00',
      end_time: '11:00:00',
      slot_status: 'UNAVAILABLE',
      is_available: false,
      booking: null,
      recurring_anchor_booking_id: null,
      recurring_context: null,
      can_start_recurring: null,
      recurring_blocked_reason: null,
      first_recurring_conflict_start: null,
      label: null,
      slot_price: '350.00',
    }

    const result = mapBookingSlotToScheduleBooking(backendSlot, 7)

    expect(result).toMatchObject({
      status: 'unavailable',
      label: null,
      isAvailable: false,
      slotPrice: '350.00',
      startTime: '10:00',
      endTime: '11:00',
    })
    expect(result.booking).toBeUndefined()
  })

  it('maps backend recurring eligibility without calculating future conflicts', () => {
    const result = mapBookingSlotToScheduleBooking(
      {
        date: '2026-09-01',
        start_time: '18:00:00',
        end_time: '19:00:00',
        slot_status: 'FREE',
        is_available: true,
        booking: null,
        recurring_anchor_booking_id: null,
        recurring_context: null,
        label: 'متاح',
        slot_price: '350.00',
        can_start_recurring: false,
        recurring_blocked_reason: 'FUTURE_CONFLICT',
        first_recurring_conflict_start: '2026-09-08T18:00:00+03:00',
      },
      7,
    )

    expect(result).toMatchObject({
      canStartRecurring: false,
      recurringBlockedReason: 'FUTURE_CONFLICT',
      firstRecurringConflictStart: '2026-09-08T18:00:00+03:00',
    })
  })

  it('preserves recurring eligibility as true, false, or null', () => {
    const makeEligibilitySlot = (
      canStartRecurring: boolean | null,
    ): BookingSlot => ({
      date: '2026-09-01',
      start_time: '18:00:00',
      end_time: '19:00:00',
      slot_status: 'FREE',
      is_available: true,
      booking: null,
      recurring_anchor_booking_id: null,
      recurring_context: null,
      can_start_recurring: canStartRecurring,
      recurring_blocked_reason: null,
      first_recurring_conflict_start: null,
      label: 'متاح',
      slot_price: '350.00',
    })

    expect(
      [true, false, null].map(
        (value) =>
          mapBookingSlotToScheduleBooking(makeEligibilitySlot(value), 7)
            .canStartRecurring,
      ),
    ).toEqual([true, false, null])
  })

  it('uses RECURRING_RESERVED as the authoritative state and preserves its anchor', () => {
    const result = mapBookingSlotToScheduleBooking(
      {
        date: '2026-09-01',
        start_time: '18:00:00',
        end_time: '19:00:00',
        slot_status: 'RECURRING_RESERVED',
        is_available: false,
        booking: null,
        recurring_anchor_booking_id: 77,
        recurring_context: {
          anchor_booking_id: 77,
          customer_name: 'أحمد محمد',
          customer_phone: '+201012345678',
          recurrence_status: 'ACTIVE',
        },
        can_start_recurring: null,
        recurring_blocked_reason: null,
        first_recurring_conflict_start: null,
        label: 'مثبت أسبوعيًا',
        slot_price: '350.00',
      },
      7,
    )

    expect(result.status).toBe('recurring_reserved')
    expect(result.date).toBe('2026-09-01')
    expect(result.recurringAnchorBookingId).toBe(77)
    expect(result.recurringContext).toEqual({
      anchor_booking_id: 77,
      customer_name: 'أحمد محمد',
      customer_phone: '+201012345678',
      recurrence_status: 'ACTIVE',
    })
    expect(result.slotPrice).toBe('350.00')
    expect(result.booking).toBeUndefined()
  })

  it('does not infer a recurring reservation from an anchor on a FREE slot', () => {
    const result = mapBookingSlotToScheduleBooking(
      {
        date: '2026-09-01',
        start_time: '18:00:00',
        end_time: '19:00:00',
        slot_status: 'FREE',
        is_available: true,
        booking: null,
        recurring_anchor_booking_id: 77,
        recurring_context: null,
        can_start_recurring: true,
        recurring_blocked_reason: null,
        first_recurring_conflict_start: null,
        label: 'متاح',
        slot_price: '350.00',
      },
      7,
    )

    expect(result.status).toBe('available')
  })

  it('maps customer_phone from backend booking slot summaries', () => {
    const backendSlot: BookingSlot = {
      date: '2026-07-21',
      start_time: '06:00:00',
      end_time: '07:00:00',
      slot_status: 'HOLD',
      is_available: false,
      booking: {
        id: 12,
        status: 'HOLD',
        status_label: 'بانتظار العربون',
        customer_name: 'عميل حجز مؤقت',
        customer_phone: '+201012345678',
        total_booking_value: '250.00',
        total_paid_amount: '0.00',
        remaining_amount: '250.00',
        is_recurring: false,
        recurrence_status: null,
      },
      recurring_anchor_booking_id: null,
      recurring_context: null,
      can_start_recurring: null,
      recurring_blocked_reason: null,
      first_recurring_conflict_start: null,
      label: 'بانتظار العربون',
      slot_price: '250.00',
    }

    expect(
      mapBookingSlotToScheduleBooking(backendSlot, 7).booking?.customer_phone,
    ).toBe('+201012345678')
  })

  it('splits slots using standard AM and PM boundaries', () => {
    expect(getSlotPeriod(0)).toBe('am')
    expect(getSlotPeriod(6 * 60)).toBe('am')
    expect(getSlotPeriod(11 * 60 + 59)).toBe('am')

    expect(getSlotPeriod(12 * 60)).toBe('pm')
    expect(getSlotPeriod(18 * 60)).toBe('pm')
    expect(getSlotPeriod(23 * 60 + 59)).toBe('pm')
  })
})
