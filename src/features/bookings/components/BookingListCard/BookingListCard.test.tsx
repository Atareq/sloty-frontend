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
}

describe('BookingListCard', () => {
  it('renders booking review details and calls onSelect when clickable', async () => {
    const user = userEvent.setup()
    const handleSelect = vi.fn()

    render(
      <BookingListCard booking={confirmedBooking} onSelect={handleSelect} />,
    )

    expect(screen.getByText('#41')).toBeInTheDocument()
    expect(screen.getByText('ليلى حسن')).toBeInTheDocument()
    expect(screen.getByText('+201000000000')).toBeInTheDocument()
    expect(screen.getByText('ملعب #3')).toBeInTheDocument()
    expect(screen.getByText('مؤكد')).toBeInTheDocument()
    expect(screen.getByText('اضغط للمراجعة')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'مراجعة الحجز #41' }))

    expect(handleSelect).toHaveBeenCalledWith(confirmedBooking)
  })

  it('marks completed bookings as read-only while preserving selection', async () => {
    const user = userEvent.setup()
    const handleSelect = vi.fn()
    const completedBooking: Booking = {
      ...confirmedBooking,
      id: 42,
      status: 'COMPLETED',
      paid_amount: '300.00',
      remaining_amount: '0.00',
    }

    render(
      <BookingListCard booking={completedBooking} onSelect={handleSelect} />,
    )

    expect(screen.getByText('للعرض فقط')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'مراجعة الحجز #42' }))

    expect(handleSelect).toHaveBeenCalledWith(completedBooking)
  })
})
