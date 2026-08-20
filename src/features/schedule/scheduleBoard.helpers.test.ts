import { describe, expect, it } from 'vitest'
import type { CourtWorkingDay } from '../courts/courtWorkingHours.types'
import {
  formatBookingDateTime,
  formatTime12Hour,
  generateSlotsFromWorkingHour,
  getEgyptDateValue,
  mapBookingSlotToScheduleBooking,
  getScheduleClosingBookings,
  getSlotPeriod,
  getVisibleBookings,
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

const workingHour: CourtWorkingDay = {
  weekday: 5,
  pricing_periods: [
    {
      starts_at: '06:00',
      ends_at: '09:00',
      price: '250.00',
    },
  ],
}

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

  it('returns setup message for missing working hours or invalid periods', () => {
    expect(generateSlotsFromWorkingHour(undefined, 60, [])).toEqual({
      slots: [],
      message: 'لم يتم ضبط مواعيد العمل لهذا اليوم',
    })

    const result = generateSlotsFromWorkingHour(
      {
        weekday: 5,
        pricing_periods: [
          {
            starts_at: 'bad-time',
            ends_at: '09:00',
            price: '250.00',
          },
        ],
      },
      60,
      [],
    )

    expect(result.slots).toEqual([])
    expect(result.message).toBe('لم يتم ضبط مواعيد العمل لهذا اليوم')
  })

  it('returns closed-day message without reading opening times', () => {
    const result = generateSlotsFromWorkingHour(
      {
        weekday: 5,
        pricing_periods: [],
      },
      60,
      [],
    )

    expect(result.slots).toEqual([])
    expect(result.message).toBe('الملعب مغلق في هذا اليوم')
  })

  it('generates available slots from one working-hour block', () => {
    const result = generateSlotsFromWorkingHour(workingHour, 60, [])

    expect(result.message).toBeNull()
    expect(result.slots.map((slot) => slot.startTime)).toEqual([
      '06:00',
      '07:00',
      '08:00',
    ])
    expect(result.slots.map((slot) => slot.endTime)).toEqual([
      '07:00',
      '08:00',
      '09:00',
    ])
    expect(result.slots.every((slot) => slot.status === 'available')).toBe(true)
  })

  it('does not generate overnight slots', () => {
    const result = generateSlotsFromWorkingHour(
      {
        ...workingHour,
        pricing_periods: [
          {
            starts_at: '20:00',
            ends_at: '04:00',
            price: '250.00',
          },
        ],
      },
      60,
      [],
    )

    expect(result.slots).toEqual([])
    expect(result.message).toBe('لم يتم ضبط مواعيد العمل لهذا اليوم')
  })

  it('returns setup message for invalid opening range', () => {
    const result = generateSlotsFromWorkingHour(
      {
        ...workingHour,
        pricing_periods: [
          {
            starts_at: 'bad-time',
            ends_at: '09:00',
            price: '250.00',
          },
        ],
      },
      60,
      [],
    )

    expect(result.slots).toEqual([])
    expect(result.message).toBe('لم يتم ضبط مواعيد العمل لهذا اليوم')
  })

  it('generates slots from multiple periods and leaves gaps unavailable', () => {
    const result = generateSlotsFromWorkingHour(
      {
        weekday: 5,
        pricing_periods: [
          {
            starts_at: '06:00',
            ends_at: '07:00',
            price: '250.00',
          },
          {
            starts_at: '08:00',
            ends_at: '09:00',
            price: '350.00',
          },
        ],
      },
      60,
      [],
    )

    expect(result.message).toBeNull()
    expect(result.slots.map((slot) => slot.startTime)).toEqual([
      '06:00',
      '08:00',
    ])
  })

  it('handles empty or undefined bookings as available slots', () => {
    const emptyResult = generateSlotsFromWorkingHour(workingHour, 60, [])
    const undefinedResult = generateSlotsFromWorkingHour(
      workingHour,
      60,
      undefined,
    )

    expect(emptyResult.slots.every((slot) => slot.status === 'available'))
      .toBe(true)
    expect(undefinedResult.slots.map((slot) => slot.status)).toEqual(
      emptyResult.slots.map((slot) => slot.status),
    )
  })

  it('formats a local booking datetime from date and board time', () => {
    expect(formatBookingDateTime('2026-07-02', '18:00')).toBe(
      '2026-07-02T18:00:00',
    )
  })

  it('maps confirmed, hold, and cancelled bookings to board statuses', () => {
    const bookings: BookingListItem[] = [
      {
        id: 1,
        court: 7,
        customer_name: 'أحمد علي',
        customer_phone: '01000000000',
        start_time: '07:00',
        end_time: '08:00',
        status: 'CONFIRMED',
      },
      {
        id: 2,
        court: 7,
        start_time: '06:00',
        end_time: '07:00',
        status: 'HOLD',
      },
      {
        id: 3,
        court: 7,
        start_time: '08:00',
        end_time: '09:00',
        status: 'CANCELLED',
      },
    ]
    const result = generateSlotsFromWorkingHour(workingHour, 60, bookings)

    expect(result.slots.map((slot) => slot.status)).toEqual([
      'hold',
      'confirmed',
      'cancelled',
    ])
    expect(result.slots[1].booking).toEqual(bookings[0])
  })

  it('maps backend slot price and unavailable status without creating a booking', () => {
    const backendSlot: BookingSlot = {
      date: '2026-07-21',
      start_time: '10:00:00',
      end_time: '11:00:00',
      slot_status: 'UNAVAILABLE',
      is_available: false,
      booking: null,
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
      },
      label: 'بانتظار العربون',
      slot_price: '250.00',
    }

    expect(
      mapBookingSlotToScheduleBooking(backendSlot, 7).booking?.customer_phone,
    ).toBe('+201012345678')
  })

  it('keeps HOLD and COMPLETED visible while hiding lifecycle-only backend statuses', () => {
    const bookings: BookingListItem[] = [
      {
        id: 1,
        court: 7,
        start_time: '06:00',
        end_time: '07:00',
        status: 'HOLD',
      },
      {
        id: 2,
        court: 7,
        start_time: '07:00',
        end_time: '08:00',
        status: 'COMPLETED',
      },
      {
        id: 3,
        court: 7,
        start_time: '08:00',
        end_time: '09:00',
        status: 'NO_SHOW',
      },
      {
        id: 4,
        court: 7,
        start_time: '08:00',
        end_time: '09:00',
        status: 'EXPIRED',
      },
    ]
    const result = generateSlotsFromWorkingHour(workingHour, 60, bookings)

    expect(getVisibleBookings(bookings)).toEqual([bookings[0], bookings[1]])
    expect(result.slots.map((slot) => slot.status)).toEqual([
      'hold',
      'completed',
      'available',
    ])
  })

  it('prioritizes completed before confirmed before hold before cancelled overlaps', () => {
    const result = generateSlotsFromWorkingHour(workingHour, 60, [
      {
        id: 1,
        court: 7,
        start_time: '06:00',
        end_time: '07:00',
        status: 'CANCELLED',
      },
      {
        id: 2,
        court: 7,
        start_time: '06:00',
        end_time: '07:00',
        status: 'HOLD',
      },
      {
        id: 5,
        court: 7,
        start_time: '06:00',
        end_time: '07:00',
        status: 'COMPLETED',
      },
      {
        id: 3,
        court: 7,
        start_time: '07:00',
        end_time: '08:00',
        status: 'HOLD',
      },
      {
        id: 4,
        court: 7,
        start_time: '07:00',
        end_time: '08:00',
        status: 'CONFIRMED',
      },
    ])

    expect(result.slots.map((slot) => slot.status)).toEqual([
      'completed',
      'confirmed',
      'available',
    ])
    expect(result.slots[0].booking?.id).toBe(5)
    expect(result.slots[1].booking?.id).toBe(4)
  })

  it('returns no slots for a past selected Egypt date', () => {
    const now = new Date('2026-07-20T10:00:00Z')
    const result = generateSlotsFromWorkingHour(
      workingHour,
      60,
      [],
      '2026-07-19',
      now,
    )

    expect(result.slots).toEqual([])
    expect(result.message).toBe('لا يمكن حجز مواعيد سابقة')
  })

  it('returns a message when all of today slots are before Egypt current time', () => {
    const now = new Date('2026-07-20T06:30:00Z')
    const result = generateSlotsFromWorkingHour(
      workingHour,
      60,
      [],
      getEgyptDateValue(now),
      now,
    )

    expect(result.slots).toEqual([])
    expect(result.message).toBe('لا توجد مواعيد متاحة بعد الوقت الحالي')
  })

  it('shows future selected date slots normally', () => {
    const now = new Date('2026-07-20T20:00:00Z')
    const result = generateSlotsFromWorkingHour(
      workingHour,
      60,
      [],
      '2026-07-21',
      now,
    )

    expect(result.slots.map((slot) => slot.startTime)).toEqual([
      '06:00',
      '07:00',
      '08:00',
    ])
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
