import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Booking } from '../../bookings.types'
import { BookingListCard } from './BookingListCard'

const confirmedBooking: Booking = {
  id: 41,
  court: 3,
  customer_name: 'ليلى حسن',
  customer_phone: '+201000000000',
  start_time: '2026-07-21T18:00:00Z',
  end_time: '2026-07-21T19:00:00Z',
  status: 'CONFIRMED',
  total_price: '300.00',
  paid_amount: '100.00',
  remaining_amount: '200.00',
  notes: 'ملاحظة داخلية',
  created: '2026-07-21T18:10:00Z',
  is_recurring: false,
  recurrence_status: null,
  previous_recurring_booking_id: null,
  next_recurring_booking_id: null,
} as Booking

describe('BookingListCard', () => {
  it('renders only compact review context and selects the whole card', async () => {
    const user = userEvent.setup()
    const handleSelect = vi.fn()

    render(
      <BookingListCard booking={confirmedBooking} onSelect={handleSelect} />,
    )

    expect(screen.getByText('ليلى حسن')).toBeInTheDocument()
    expect(screen.getByText('+201000000000')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('مؤكد')).toBeInTheDocument()
    expect(screen.getByText(/الثلاثاء/)).toBeInTheDocument()
    expect(screen.queryByText('#41')).not.toBeInTheDocument()
    expect(screen.queryByText('ملعب #3')).not.toBeInTheDocument()
    expect(screen.queryByText('300.00')).not.toBeInTheDocument()
    expect(screen.queryByText('100.00')).not.toBeInTheDocument()
    expect(screen.queryByText('200.00')).not.toBeInTheDocument()
    expect(screen.queryByText('ملاحظة داخلية')).not.toBeInTheDocument()
    expect(screen.queryByText('2026-07-21T18:10:00Z')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'مراجعة حجز ليلى حسن' }),
    )

    expect(handleSelect).toHaveBeenCalledWith(confirmedBooking)
  })

  it('keeps completed bookings selectable for read-only details', async () => {
    const user = userEvent.setup()
    const handleSelect = vi.fn()
    const completedBooking: Booking = {
      ...confirmedBooking,
      status: 'COMPLETED',
      paid_amount: '300.00',
      remaining_amount: '0.00',
    }

    render(
      <BookingListCard booking={completedBooking} onSelect={handleSelect} />,
    )

    expect(screen.getByText('مكتمل')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'مراجعة حجز ليلى حسن' }),
    )
    expect(handleSelect).toHaveBeenCalledWith(completedBooking)
  })

  it('shows the subtle recurring marker without extra agreement details', () => {
    render(
      <BookingListCard
        booking={{
          ...confirmedBooking,
          is_recurring: true,
          recurrence_status: 'ACTIVE',
        }}
      />,
    )

    expect(screen.getByRole('img', { name: 'حجز أسبوعي' })).toHaveTextContent('↻')
    expect(screen.queryByText('12')).not.toBeInTheDocument()
  })
})
