import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CompleteBookingConfirmSheet } from './CompleteBookingConfirmSheet'

describe('CompleteBookingConfirmSheet', () => {
  it('shows normal completion confirmation when remaining amount is zero', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onRequestPayment = vi.fn()

    render(
      <CompleteBookingConfirmSheet
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
})
