import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddBookingSheet } from './AddBookingSheet'

describe('AddBookingSheet', () => {
  it('requires customer name and phone before submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        startTime="18:00"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'حفظ الحجز' }))

    expect(
      screen.getByText('اسم العميل ورقم الهاتف مطلوبان'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed customer fields and omits empty notes', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        startTime="18:00"
      />,
    )

    await user.type(screen.getByLabelText('اسم العميل'), '  أحمد علي  ')
    await user.type(screen.getByLabelText('رقم الهاتف'), '01012345678')
    await user.click(screen.getByRole('button', { name: 'حفظ الحجز' }))

    expect(onSubmit).toHaveBeenCalledWith({
      customer_name: 'أحمد علي',
      customer_phone: '+201012345678',
      notes: undefined,
    })
  })

  it('shows selected slot price as read-only context', () => {
    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        slotPrice="350.00"
        startTime="18:00"
      />,
    )

    expect(screen.getByText('السعر 350.00 جنيه')).toBeInTheDocument()
    expect(screen.queryByLabelText('السعر')).not.toBeInTheDocument()
  })

  it('checks recurring availability before weekly submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onCheckRecurringAvailability = vi.fn().mockResolvedValue(undefined)

    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        isSubmitting={false}
        onCheckRecurringAvailability={onCheckRecurringAvailability}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        startTime="18:00"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'حجز أسبوعي' }))
    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد علي')
    await user.type(screen.getByLabelText('رقم الهاتف'), '01012345678')
    await user.click(screen.getByRole('button', { name: 'فحص الإتاحة' }))

    expect(onCheckRecurringAvailability).toHaveBeenCalledWith({
      booking_type: 'weekly',
      customer_name: 'أحمد علي',
      customer_phone: '+201012345678',
      payment_method: 'CASH',
      notes: undefined,
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits weekly booking only after all availability is true', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        recurringAvailability={{
          court: 7,
          weekday: 3,
          start_time: '18:00:00',
          end_time: '19:00:00',
          start_date: '2026-07-02',
          horizon_weeks: 12,
          all_available: true,
          slots: [
            {
              date: '2026-07-02',
              start_time: '18:00:00',
              end_time: '19:00:00',
              available: true,
              slot_price: '350.00',
              failure_code: null,
            },
          ],
        }}
        startTime="18:00"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'حجز أسبوعي' }))
    expect(screen.getByText('350.00 جنيه')).toBeInTheDocument()
    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد علي')
    await user.type(screen.getByLabelText('رقم الهاتف'), '01012345678')
    await user.click(
      screen.getByRole('button', { name: 'تأكيد الحجز الأسبوعي' }),
    )

    expect(onSubmit).toHaveBeenCalledWith({
      booking_type: 'weekly',
      customer_name: 'أحمد علي',
      customer_phone: '+201012345678',
      payment_method: 'CASH',
      notes: undefined,
    })
  })

  it('blocks invalid phone numbers', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        startTime="18:00"
      />,
    )

    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد علي')
    await user.type(screen.getByLabelText('رقم الهاتف'), '01012')
    await user.click(screen.getByRole('button', { name: 'حفظ الحجز' }))

    expect(screen.getByText('رقم الهاتف غير صحيح')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows backend field errors for customer name and phone', () => {
    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error="يرجى مراجعة البيانات المدخلة."
        fieldErrors={{
          customer_name: [
            {
              code: 'REQUIRED',
              message: 'اسم العميل مطلوب',
            },
          ],
          phone_number: [
            {
              code: 'INVALID_PHONE',
              message: 'رقم الهاتف غير صحيح من الخادم',
            },
          ],
        }}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        startTime="18:00"
      />,
    )

    expect(screen.getByText('اسم العميل مطلوب')).toBeInTheDocument()
    expect(
      screen.getByText('رقم الهاتف غير صحيح من الخادم'),
    ).toBeInTheDocument()
  })
})
