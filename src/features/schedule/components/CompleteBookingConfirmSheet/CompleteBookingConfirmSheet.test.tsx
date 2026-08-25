import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { chooseAppSelectOption } from '../../../../test/appSelectTestUtils'
import { CompleteBookingConfirmSheet } from './CompleteBookingConfirmSheet'

const booking = {
  id: 10,
  court: 2,
  start_time: '2026-08-25T18:00:00Z',
  end_time: '2026-08-25T19:00:00Z',
  status: 'CONFIRMED' as const,
  is_recurring: false,
  recurrence_status: null,
  previous_recurring_booking_id: null,
  next_recurring_booking_id: null,
}

describe('CompleteBookingConfirmSheet', () => {
  it('shows normal completion confirmation when remaining amount is zero', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onRequestPayment = vi.fn()

    render(
      <CompleteBookingConfirmSheet
        booking={booking}
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onRequestPayment={onRequestPayment}
        remainingAmount="0.00"
      />,
    )

    expect(screen.getByText('سيتم اعتبار الحجز مكتملاً بعد التأكيد.'))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تأكيد إكمال الحجز' }))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تأكيد إكمال الحجز' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onRequestPayment).not.toHaveBeenCalled()
  })

  it('shows payment-required state when remaining amount is positive', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onRequestPayment = vi.fn()

    render(
      <CompleteBookingConfirmSheet
        booking={booking}
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onRequestPayment={onRequestPayment}
        remainingAmount="50.00"
      />,
    )

    expect(
      screen.getByText(
        'يوجد مبلغ متبقي على هذا الحجز. يجب تسجيل الدفعة أولًا قبل إكمال الحجز.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('المبلغ المتبقي')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تسجيل الدفعة' }))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

    expect(onRequestPayment).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('uses recurrence_next and sends continuation payment fields without an amount', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <CompleteBookingConfirmSheet
        booking={{
          ...booking,
          is_recurring: true,
          recurrence_status: 'ACTIVE',
          recurrence_next: {
            can_continue: true,
            start_time: '2026-09-01T18:00:00Z',
            end_time: '2026-09-01T19:00:00Z',
            total_price: '350.00',
            required_deposit: '150.00',
          },
        }}
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onRequestPayment={vi.fn()}
        remainingAmount="0.00"
      />,
    )

    expect(screen.getByText('إكمال الحجز الأسبوعي')).toBeInTheDocument()
    expect(screen.getByText('سعر الحجز القادم')).toBeInTheDocument()
    expect(screen.getByText('350.00 جنيه')).toBeInTheDocument()
    expect(screen.getByText('عربون الأسبوع القادم')).toBeInTheDocument()
    expect(screen.getByText('150.00 جنيه')).toBeInTheDocument()

    await chooseAppSelectOption(
      user,
      screen.getByLabelText('طريقة دفع عربون الأسبوع القادم'),
      'تحويل بنكي',
    )
    await user.type(screen.getByLabelText('رقم العملية'), 'NEXT-20')
    await user.type(screen.getByLabelText('ملاحظات'), 'عربون الموعد القادم')
    await user.click(
      screen.getByRole('button', { name: 'إكمال واستمرار أسبوعيًا' }),
    )

    expect(onConfirm).toHaveBeenCalledWith({
      continue_recurring: true,
      next_deposit_payment_method: 'BANK_TRANSFER',
      next_deposit_payment_reference: 'NEXT-20',
      next_deposit_notes: 'عربون الموعد القادم',
    })
    expect(onConfirm.mock.calls[0][0]).not.toHaveProperty('next_deposit_amount')
  })

  it('hides continuation when Backend says the next occurrence is blocked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <CompleteBookingConfirmSheet
        booking={{
          ...booking,
          is_recurring: true,
          recurrence_status: 'ACTIVE',
          recurrence_next: {
            can_continue: false,
            start_time: '2026-09-01T18:00:00Z',
            end_time: '2026-09-01T19:00:00Z',
            total_price: '350.00',
            required_deposit: '150.00',
            blocked_reason: 'SLOT_UNAVAILABLE',
          },
        }}
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onRequestPayment={vi.fn()}
        remainingAmount="0.00"
      />,
    )

    expect(screen.getByText('نفس الموعد الأسبوع القادم مش متاح.'))
      .toBeInTheDocument()
    expect(screen.queryByText('SLOT_UNAVAILABLE')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إكمال واستمرار أسبوعيًا' }))
      .not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'إكمال وإيقاف التكرار' }),
    )
    expect(onConfirm).toHaveBeenCalledWith({ continue_recurring: false })
  })
})
