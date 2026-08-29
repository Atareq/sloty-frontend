import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { BookingListItem } from '../../scheduleApi.types'
import { ScheduleClosingSection } from './ScheduleClosingSection'

const booking: BookingListItem = {
  id: 10,
  court: 7,
  customer_name: 'أحمد علي',
  customer_phone: '01000000000',
  start_time: '08:00',
  end_time: '09:00',
  status: 'CONFIRMED',
  remaining_amount: '50.00',
  is_recurring: false,
  recurrence_status: null,
  previous_recurring_booking_id: null,
  next_recurring_booking_id: null,
}

function renderSection(
  props: Partial<Parameters<typeof ScheduleClosingSection>[0]> = {},
) {
  return render(
    <MemoryRouter>
      <ScheduleClosingSection
        bookings={[booking]}
        onSelectBooking={vi.fn()}
        selectedDate="2026-07-21"
        totalCount={1}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('ScheduleClosingSection', () => {
  it('hides itself when there are no bookings needing closure', () => {
    renderSection({ bookings: [], totalCount: 0 })

    expect(screen.queryByText('حجوزات تحتاج إغلاق')).not.toBeInTheDocument()
  })

  it('renders closure rows with details and calls row click handler', async () => {
    const user = userEvent.setup()
    const onSelectBooking = vi.fn()

    renderSection({ onSelectBooking })

    expect(screen.getByText('حجوزات تحتاج إغلاق')).toBeInTheDocument()
    expect(screen.getByText('حجوزات اليوم التي تحتاج دفع أو إكمال'))
      .toBeInTheDocument()
    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText(/الثلاثاء، ٢١ يوليو/)).toBeInTheDocument()
    expect(screen.getByText('متبقي 50.00 جنيه')).toBeInTheDocument()
    expect(screen.getByText('اضغط للمراجعة')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /أحمد علي/ }))

    expect(onSelectBooking).toHaveBeenCalledWith(booking)
  })

  it('links to filtered bookings list when more than three records match', () => {
    renderSection({ totalCount: 4 })

    expect(
      screen.getByRole('link', {
        name: 'عرض كل الحجوزات التي تحتاج إغلاق',
      }),
    ).toHaveAttribute(
      'href',
      '/bookings?date=2026-07-21&needs_action=true',
    )
  })
})
