import { render, screen, waitFor } from '@testing-library/react'
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
    expect(screen.getByLabelText('رقم الموبايل'))
      .toHaveAttribute('placeholder', '01X XXX XXXX')

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

  it('preserves raw unformatted phone while editing and normalizes to E.164 on submit', async () => {
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

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'إغلاق' })).toHaveFocus()
    })

    const phoneInput = screen.getByLabelText('رقم الموبايل')
    expect(phoneInput).toHaveValue('+201012345678')

    await user.clear(phoneInput)
    await user.type(phoneInput, '+20 12 9999 8888')

    // Remains raw during editing
    expect(phoneInput).toHaveValue('+20 12 9999 8888')

    await user.click(screen.getByRole('button', { name: 'حفظ البيانات' }))

    expect(onSubmit).toHaveBeenCalledWith({
      customer_name: 'أحمد علي',
      customer_phone: '+201299998888',
      notes: 'ملاحظة قديمة',
    })
  })

  it('blocks invalid phone numbers on submit', async () => {
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

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'إغلاق' })).toHaveFocus()
    })

    const phoneInput = screen.getByLabelText('رقم الموبايل')
    await user.clear(phoneInput)
    await user.type(phoneInput, '010123')

    await user.click(screen.getByRole('button', { name: 'حفظ البيانات' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('رقم الموبايل غير صحيح')).toBeInTheDocument()
  })
})
