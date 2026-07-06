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
  court: 7,
  weekday: 0,
  opens_at: '06:00',
  closes_at: '09:00',
  is_closed: false,
}

describe('scheduleBoard helpers', () => {
  it('generates available slots from working hours', () => {
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

  it('formats a local booking datetime from date and board time', () => {
    expect(formatBookingDateTime('2026-07-02', '18:00')).toBe(
      '2026-07-02T18:00:00',
    )
  })

  it('maps confirmed and cancelled bookings to board statuses', () => {
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
        start_time: '08:00',
        end_time: '09:00',
        status: 'CANCELLED',
      },
    ]
    const result = generateSlotsFromWorkingHour(workingHour, 60, bookings)

    expect(result.slots.map((slot) => slot.status)).toEqual([
      'available',
      'confirmed',
      'cancelled',
    ])
    expect(result.slots[1].booking).toEqual(bookings[0])
  })

  it('hides lifecycle-only backend booking statuses from board mapping', () => {
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

    expect(getVisibleBookings(bookings)).toEqual([])
    expect(result.slots.every((slot) => slot.status === 'available')).toBe(true)
  })
})
