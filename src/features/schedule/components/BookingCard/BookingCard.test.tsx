import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ScheduleBooking } from '../../schedule.types'
import { BookingCard } from './BookingCard'

const confirmedBooking: ScheduleBooking = {
  id: 'booking-test',
  status: 'confirmed',
  startTime: '08:00',
  period: 'day',
}

describe('BookingCard', () => {
  it('renders a compact real slot button with start time only', () => {
    render(<BookingCard booking={confirmedBooking} />)

    expect(
      screen.getByRole('button', { name: '08:00 مؤكد' }),
    ).toBeInTheDocument()
    expect(screen.getByText('08:00')).toBeInTheDocument()
    expect(screen.queryByText('09:00')).not.toBeInTheDocument()
    expect(screen.queryByText('مؤكد')).not.toBeInTheDocument()
  })
})
