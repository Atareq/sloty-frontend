import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ScheduleBooking } from '../../schedule.types'
import { BookingCard } from './BookingCard'

const confirmedBooking: ScheduleBooking = {
  id: 'booking-test',
  status: 'confirmed',
  timeStart: '08:00 م',
  timeEnd: '09:00 م',
  totalAmount: 300,
  paidAmount: 50,
  customerName: 'أحمد محمد',
  customerPhone: '01123456789',
}

describe('BookingCard', () => {
  it('renders a real slot button with time and accessible status', () => {
    render(<BookingCard booking={confirmedBooking} />)

    expect(
      screen.getByRole('button', { name: '08:00 م - 09:00 م مؤكد' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('أحمد محمد')).not.toBeInTheDocument()
  })
})
