import { describe, expect, it } from 'vitest'
import type { Booking } from '../../features/bookings/bookings.types'
import { getOfflineBookingsView } from './offlineBookingFilters'

function createBooking(
  id: number,
  overrides: Partial<Booking> = {},
): Booking {
  return {
    id,
    court: 7,
    customer_name: `عميل ${id}`,
    customer_phone: `+2010000000${id}`,
    start_time: `2026-08-${String(24 + id).padStart(2, '0')}T18:00:00+03:00`,
    end_time: `2026-08-${String(24 + id).padStart(2, '0')}T19:00:00+03:00`,
    status: 'CONFIRMED',
    remaining_amount: '0.00',
    is_recurring: false,
    recurrence_status: null,
    previous_recurring_booking_id: null,
    next_recurring_booking_id: null,
    ...overrides,
  }
}

const now = new Date('2026-08-30T09:00:00+03:00')

describe('getOfflineBookingsView', () => {
  it('filters by safe cached fields and sorts newest first', () => {
    const view = getOfflineBookingsView(
      [
        createBooking(1, {
          customer_name: 'أحمد علي',
          customer_phone: '+201011111111',
          start_time: '2026-08-24T18:00:00+03:00',
          court: 7,
        }),
        createBooking(2, {
          customer_name: 'منى سمير',
          customer_phone: '+201022222222',
          start_time: '2026-08-30T18:00:00+03:00',
          court: 8,
          status: 'HOLD',
          remaining_amount: '300.00',
        }),
      ],
      {
        court: 8,
        has_remaining_amount: 'true',
        search: '0222',
        status: 'HOLD',
      },
      now,
    )

    expect(view.state).toBe('ready')
    expect(view.bookings.map((booking) => booking.customer_name)).toEqual([
      'منى سمير',
    ])
  })

  it('does not search notes because detail coverage is not guaranteed locally', () => {
    const view = getOfflineBookingsView(
      [
        createBooking(1, {
          customer_name: 'أحمد علي',
          notes: 'كلمة داخل الملاحظات فقط',
        }),
      ],
      { search: 'الملاحظات' },
      now,
    )

    expect(view.state).toBe('ready')
    expect(view.bookings).toEqual([])
  })

  it('reports outside-window date ranges as Internet-required', () => {
    const view = getOfflineBookingsView(
      [createBooking(1)],
      { date: '2026-08-01' },
      now,
    )

    expect(view).toMatchObject({
      state: 'outside_window',
      bookings: [],
    })
  })

  it('rejects backend-derived operational filters instead of recreating them', () => {
    const view = getOfflineBookingsView(
      [createBooking(1)],
      { needs_action: 'true', overdue: 'true' },
      now,
    )

    expect(view).toMatchObject({
      state: 'unsupported_filter',
      bookings: [],
      unsupportedFilters: ['needs_action', 'overdue'],
    })
  })
})
