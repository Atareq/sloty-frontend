import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ScheduleBooking } from '../../schedule.types'
import type { BookingListItem } from '../../scheduleApi.types'
import { BookingDetailsSheet } from './BookingDetailsSheet'

const booking: BookingListItem = {
  id: 10,
  court: 7,
  customer_name: 'أحمد علي',
  customer_phone: '01000000000',
  start_time: '2026-07-02T07:00:00',
  end_time: '2026-07-02T08:00:00',
  status: 'CONFIRMED',
}

const slot: ScheduleBooking = {
  id: 'slot-0700',
  status: 'confirmed',
  startTime: '07:00',
  endTime: '08:00',
  period: 'day',
  booking,
}

describe('BookingDetailsSheet', () => {
  it('shows confirmed booking customer details', () => {
    render(
      <BookingDetailsSheet
        booking={booking}
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        error={null}
        isSubmitting={false}
        onCancel={vi.fn()}
        onClose={vi.fn()}
        slot={slot}
      />,
    )

    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('01000000000')).toBeInTheDocument()
    expect(screen.getByText('مؤكد')).toBeInTheDocument()
  })

  it('uses an inline confirm step before calling cancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn().mockResolvedValue(undefined)

    render(
      <BookingDetailsSheet
        booking={booking}
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        error={null}
        isSubmitting={false}
        onCancel={onCancel}
        onClose={vi.fn()}
        slot={slot}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'إلغاء الحجز' }))

    expect(onCancel).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'تأكيد إلغاء الحجز' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'تأكيد إلغاء الحجز' }),
    )

    expect(onCancel).toHaveBeenCalledWith(10)
  })
})
