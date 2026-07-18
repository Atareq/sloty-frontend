import { describe, expect, it } from 'vitest'
import type { CourtWorkingHour } from '../courts/courtWorkingHours.types'
import {
  formatBookingDateTime,
  generateSlotsFromWorkingHour,
  getVisibleBookings,
} from './scheduleBoard.helpers'
import type { BookingListItem } from './scheduleApi.types'

const workingHour: CourtWorkingHour = {
  id: 1,
  weekday: 5,
  is_closed: false,
  blocks: [
    {
      start_time: '06:00',
      end_time: '09:00',
    },
  ],
}

describe('scheduleBoard helpers', () => {
  it('returns setup message for missing working hours or blocks', () => {
    expect(generateSlotsFromWorkingHour(undefined, 60, [])).toEqual({
      slots: [],
      message: 'لم يتم ضبط مواعيد العمل لهذا اليوم',
    })

    const result = generateSlotsFromWorkingHour(
      {
        id: 2,
        weekday: 5,
        is_closed: false,
      } as CourtWorkingHour,
      60,
      [],
    )

    expect(result.slots).toEqual([])
    expect(result.message).toBe('لم يتم ضبط مواعيد العمل لهذا اليوم')
  })

  it('returns closed-day message without reading blocks', () => {
    const result = generateSlotsFromWorkingHour(
      {
        id: 2,
        weekday: 5,
        is_closed: true,
      } as CourtWorkingHour,
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

  it('generates slots from multiple same-day blocks', () => {
    const result = generateSlotsFromWorkingHour(
      {
        ...workingHour,
        blocks: [
          { start_time: '06:00', end_time: '08:00' },
          { start_time: '10:00', end_time: '12:00' },
        ],
      },
      60,
      [],
    )

    expect(result.slots.map((slot) => slot.startTime)).toEqual([
      '06:00',
      '07:00',
      '10:00',
      '11:00',
    ])
  })

  it('does not generate overnight slots', () => {
    const result = generateSlotsFromWorkingHour(
      {
        ...workingHour,
        blocks: [{ start_time: '20:00', end_time: '04:00' }],
      },
      60,
      [],
    )

    expect(result.slots).toEqual([])
    expect(result.message).toBe('لم يتم ضبط مواعيد العمل لهذا اليوم')
  })

  it('returns setup message for invalid blocks', () => {
    const result = generateSlotsFromWorkingHour(
      {
        ...workingHour,
        blocks: [
          { start_time: 'bad-time', end_time: '09:00' },
          { start_time: '12:00', end_time: '12:00' },
        ],
      },
      60,
      [],
    )

    expect(result.slots).toEqual([])
    expect(result.message).toBe('لم يتم ضبط مواعيد العمل لهذا اليوم')
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

  it('keeps HOLD visible while hiding lifecycle-only backend statuses', () => {
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

    expect(getVisibleBookings(bookings)).toEqual([bookings[0]])
    expect(result.slots.map((slot) => slot.status)).toEqual([
      'hold',
      'available',
      'available',
    ])
  })

  it('prioritizes confirmed over hold and hold over cancelled overlaps', () => {
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
      'hold',
      'confirmed',
      'available',
    ])
    expect(result.slots[0].booking?.id).toBe(2)
    expect(result.slots[1].booking?.id).toBe(4)
  })
})
