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
  period: 'am',
}

describe('BookingCard', () => {
  it('renders a compact booked slot with time and human status', () => {
    render(<BookingCard booking={confirmedBooking} />)

    expect(
      screen.getByRole('button', {
        name: '8:00 ص مؤكد',
      }),
    ).toBeInTheDocument()

    expect(screen.getByText('8:00 ص')).toBeInTheDocument()
    expect(screen.queryByText('9:00 ص')).not.toBeInTheDocument()
    expect(screen.getByText('مؤكد')).toBeInTheDocument()
  })

  it('renders available slots with time and availability only', () => {
    render(
      <BookingCard
        booking={{
          ...confirmedBooking,
          status: 'available',
          isAvailable: true,
          slotPrice: '350.00',
        }}
      />,
    )

    expect(screen.getByText('8:00 ص')).toBeInTheDocument()
    expect(screen.getByText('متاح')).toBeInTheDocument()
    expect(screen.queryByText(/350/)).not.toBeInTheDocument()
  })

  it('shows the recurring icon only for eligible free slots', () => {
    const { rerender } = render(
      <BookingCard
        booking={{
          ...confirmedBooking,
          status: 'available',
          isAvailable: true,
          canStartRecurring: true,
        }}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: '8:00 ص متاح متاح للتثبيت أسبوعيًا',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('↻')).toBeInTheDocument()

    rerender(
      <BookingCard
        booking={{
          ...confirmedBooking,
          status: 'available',
          isAvailable: true,
          canStartRecurring: false,
        }}
      />,
    )

    expect(screen.queryByText('↻')).not.toBeInTheDocument()
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
      screen.getByRole('button', {
        name: '6:00 ص بانتظار العربون',
      }),
    ).toHaveClass('bg-amber-100')
    expect(screen.getByText('بانتظار العربون')).toBeInTheDocument()
  })

  it('renders UNAVAILABLE as a disabled fallback slot', () => {
    render(
      <BookingCard
        booking={{
          ...confirmedBooking,
          status: 'unavailable',
          startTime: '10:00',
          label: null,
        }}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: '10:00 ص غير متاح',
      }),
    ).toBeDisabled()
  })

  it('allows completed slots to open read-only details', async () => {
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

    const completedSlot = screen.getByRole('button', {
      name: '9:00 ص مكتمل',
    })

    expect(completedSlot).toBeEnabled()

    await user.click(completedSlot)

    expect(onSelect).toHaveBeenCalled()
  })

  it('calls onSelect only when actionable', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    const { rerender } = render(
      <BookingCard
        booking={confirmedBooking}
        onSelect={onSelect}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: '8:00 ص مؤكد',
      }),
    )

    expect(onSelect).toHaveBeenCalledWith(confirmedBooking)

    rerender(<BookingCard booking={confirmedBooking} />)

    await user.click(
      screen.getByRole('button', {
        name: '8:00 ص مؤكد',
      }),
    )

    expect(onSelect).toHaveBeenCalledTimes(1)

    expect(
      screen.getByRole('button', {
        name: '8:00 ص مؤكد',
      }),
    ).toBeDisabled()
  })

  it('shows only an accessible recurring icon without booking details', () => {
    render(
      <BookingCard
        booking={{
          ...confirmedBooking,
          booking: {
            id: 10,
            court: 7,
            customer_name: 'أحمد علي',
            customer_phone: '+201000000000',
            start_time: '2026-07-20T08:00:00',
            end_time: '2026-07-20T09:00:00',
            status: 'CONFIRMED',
            total_price: '350.00',
            paid_amount: '100.00',
            remaining_amount: '250.00',
            is_recurring: true,
            recurrence_status: 'ACTIVE',
            previous_recurring_booking_id: null,
            next_recurring_booking_id: null,
          },
        }}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: '8:00 ص مؤكد حجز متكرر',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('↻')).toBeInTheDocument()
    expect(screen.queryByText('أسبوعي')).not.toBeInTheDocument()
    expect(screen.queryByText('أحمد علي')).not.toBeInTheDocument()
    expect(screen.queryByText('+201000000000')).not.toBeInTheDocument()
    expect(screen.queryByText(/350|100|250/)).not.toBeInTheDocument()
  })
})
