import { describe, expect, it } from 'vitest'
import type { ScheduleBooking } from '../../schedule.types'
import { getScheduleSlotPresentation } from './bookingCard.helpers'

function occupiedSlot(
  date: string,
  startTime = '09:00',
): ScheduleBooking {
  return {
    id: `booking-${date}`,
    date,
    status: 'completed',
    startTime,
    endTime: '10:00',
    period: 'am',
    isAvailable: false,
    booking: {
      id: 10,
      court: 7,
      start_time: `${date}T${startTime}:00+03:00`,
      end_time: `${date}T10:00:00+03:00`,
      status: 'COMPLETED',
      is_recurring: false,
      recurrence_status: null,
      previous_recurring_booking_id: null,
      next_recurring_booking_id: null,
    },
  }
}

describe('getScheduleSlotPresentation clickability', () => {
  it('keeps backend-returned occupied slots interactive regardless of date', () => {
    expect(
      getScheduleSlotPresentation(occupiedSlot('2026-09-20')).isClickable,
    ).toBe(true)
    expect(
      getScheduleSlotPresentation(occupiedSlot('2026-09-22')).isClickable,
    ).toBe(true)
    expect(
      getScheduleSlotPresentation(occupiedSlot('2026-09-23')).isClickable,
    ).toBe(true)
  })

  it('does not use is_available or local time for occupied bookings', () => {
    expect(
      getScheduleSlotPresentation(occupiedSlot('2026-09-22', '08:00')).isClickable,
    ).toBe(true)
  })

  it('leaves free-slot clickability to backend is_available', () => {
    const freeSlot: ScheduleBooking = {
      id: 'free',
      date: '2026-09-22',
      status: 'available',
      startTime: '09:00',
      endTime: '10:00',
      period: 'am',
      isAvailable: true,
    }

    expect(
      getScheduleSlotPresentation(freeSlot).isClickable,
    ).toBe(true)
    expect(
      getScheduleSlotPresentation(
        { ...freeSlot, isAvailable: false },
      ).isClickable,
    ).toBe(false)
  })
})
