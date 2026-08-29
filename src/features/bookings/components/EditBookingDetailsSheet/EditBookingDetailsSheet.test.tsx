import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BookingListItem } from '../../../schedule/scheduleApi.types'
import { EditBookingDetailsSheet } from './EditBookingDetailsSheet'

const booking: BookingListItem = {
  id: 10,
  court: 7,
  customer_name: 'أحمد علي',
  customer_phone: '+201012345678',
  notes: 'ملاحظة قديمة',
  start_time: '2026-07-21T20:00:00',
  end_time: '2026-07-21T21:00:00',
  status: 'CONFIRMED',
  is_recurring: false,
  recurrence_status: null,
  previous_recurring_booking_id: null,
  next_recurring_booking_id: null,
}

describe('EditBookingDetailsSheet', () => {
  it('patches only customer name, phone, and notes', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <EditBookingDetailsSheet
        booking={booking}
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.queryByText('الملعب')).not.toBeInTheDocument()
    expect(screen.queryByText('السعر')).not.toBeInTheDocument()

    const nameInput = screen.getByLabelText('اسم العميل')
    await user.clear(nameInput)
    await user.type(nameInput, 'منى حسن')
    await user.clear(screen.getByLabelText('ملاحظات'))
    await user.type(screen.getByLabelText('ملاحظات'), 'ملاحظة جديدة')
    await user.click(screen.getByRole('button', { name: 'حفظ البيانات' }))

    expect(onSubmit).toHaveBeenCalledWith({
      customer_name: 'منى حسن',
      customer_phone: '+201012345678',
      notes: 'ملاحظة جديدة',
    })
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('court')
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('start_time')
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('status')
  })
})
