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
  it('displays read-only customer identity and patches only notes', async () => {
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

    // Customer identity is displayed read-only
    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('+201012345678')).toBeInTheDocument()
    expect(screen.getByText('بيانات العميل (للقراءة فقط)')).toBeInTheDocument()

    // No customer edit inputs exist
    expect(screen.queryByLabelText('اسم العميل')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('رقم الموبايل')).not.toBeInTheDocument()

    // Notes editing works
    const notesInput = screen.getByLabelText('ملاحظات')
    expect(notesInput).toHaveValue('ملاحظة قديمة')
    await user.clear(notesInput)
    await user.type(notesInput, 'ملاحظة جديدة محدثة')

    await user.click(screen.getByRole('button', { name: 'حفظ الملاحظات' }))

    expect(onSubmit).toHaveBeenCalledWith({
      notes: 'ملاحظة جديدة محدثة',
    })
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('customer_name')
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('customer_phone')
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('court')
  })

  it('shows validation error when notes field error is provided', () => {
    render(
      <EditBookingDetailsSheet
        booking={booking}
        error={null}
        fieldErrors={{ notes: [{ message: 'الملاحظات طويلة جدًا', code: 'max_length' }] }}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('الملاحظات طويلة جدًا')).toBeInTheDocument()
  })

  it('displays general error message when provided', () => {
    render(
      <EditBookingDetailsSheet
        booking={booking}
        error="حدث خطأ في الخادم"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('حدث خطأ في الخادم')).toBeInTheDocument()
  })

  it('prompts for unsaved changes when closing with modified notes', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <EditBookingDetailsSheet
        booking={booking}
        error={null}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    )

    const notesInput = screen.getByLabelText('ملاحظات')
    await user.type(notesInput, ' تعديل إضافي')

    const closeButton = screen.getByRole('button', { name: 'إغلاق' })
    await user.click(closeButton)

    expect(
      screen.getByText('عندك تعديلات لسه متحفظتش.'),
    ).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'اخرج من غير حفظ' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
