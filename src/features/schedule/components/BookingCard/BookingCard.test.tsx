import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ScheduleBooking } from '../../schedule.types'
import { BookingCard } from './BookingCard'

const confirmedBooking: ScheduleBooking = {
  id: 'booking-test',
  status: 'confirmed',
  startTime: '08:00',
  endTime: '09:00',
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

  it('renders HOLD as a distinct reserved slot', () => {
    render(
      <BookingCard
        booking={{
          ...confirmedBooking,
          status: 'hold',
          startTime: '06:00',
        }}
      />,
    )

    expect(
      screen.getByRole('button', { name: '06:00 محجوز مؤقتًا' }),
    ).toHaveClass('bg-amber-100')
  })

  it('renders completed slots as locked and non-actionable', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <BookingCard
        booking={{
          ...confirmedBooking,
          status: 'completed',
          startTime: '09:00',
        }}
        onSelect={onSelect}
      />,
    )

    const completedSlot = screen.getByRole('button', { name: '09:00 مكتمل' })

    expect(completedSlot).toBeDisabled()
    await user.click(completedSlot)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('calls onSelect only when actionable', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const { rerender } = render(
      <BookingCard booking={confirmedBooking} onSelect={onSelect} />,
    )

    await user.click(screen.getByRole('button', { name: '08:00 مؤكد' }))

    expect(onSelect).toHaveBeenCalledWith(confirmedBooking)

    rerender(<BookingCard booking={confirmedBooking} />)
    await user.click(screen.getByRole('button', { name: '08:00 مؤكد' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '08:00 مؤكد' })).toBeDisabled()
  })
})
