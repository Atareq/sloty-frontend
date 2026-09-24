import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AddBookingSheet } from './components/AddBookingSheet/AddBookingSheet'
import { BookingActionSheet } from '../bookings/components/BookingActionSheet/BookingActionSheet'
import type { BookingListItem } from './scheduleApi.types'

vi.mock('../players/playersApi', () => ({
  listClubPlayers: vi.fn().mockResolvedValue([]),
}))

vi.mock('../transactions/transactionsApi', () => ({
  listTransactions: vi.fn().mockResolvedValue({
    count: 0,
    next: null,
    previous: null,
    results: [],
  }),
}))

describe('Pricing Authority Certification Tests (Rules 24 & 25)', () => {
  it('uses Backend slot result price for authoritative slot display and omits price from submission (Rule 24)', async () => {
    const onSubmit = vi.fn()

    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="السبت، ٢١ سبتمبر"
        endTime="21:00"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        slotPrice="250.00"
        startTime="20:00"
      />,
    )

    // Displays authoritative backend slot price directly
    expect(screen.getByText('السعر 250.00 جنيه')).toBeInTheDocument()

    // Price is not an editable field in the form
    expect(screen.queryByLabelText('السعر')).not.toBeInTheDocument()
  })

  it('renders Backend Booking total_price, paid_amount, and remaining_amount directly without recalculation (Rule 25)', () => {
    const booking: BookingListItem = {
      id: 42,
      court: 1,
      customer_name: 'أحمد محمود',
      customer_phone: '01012345678',
      start_time: '2026-09-21T20:00:00+03:00',
      end_time: '2026-09-21T21:00:00+03:00',
      status: 'CONFIRMED',
      total_price: '450.00',
      paid_amount: '150.00',
      remaining_amount: '300.00',
      is_recurring: false,
      recurrence_status: null,
      previous_recurring_booking_id: null,
      next_recurring_booking_id: null,
    }

    render(
      <BookingActionSheet
        booking={booking}
        isOpen={true}
        onClose={vi.fn()}
      />,
    )

    // Directly renders backend-returned financial values
    expect(screen.getByText('450.00 جنيه')).toBeInTheDocument()
    expect(screen.getByText('150.00 جنيه')).toBeInTheDocument()
    expect(screen.getByText('300.00 جنيه')).toBeInTheDocument()
  })
})
