import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RecordPaymentSheet } from './RecordPaymentSheet'

describe('RecordPaymentSheet', () => {
  it('validates that amount is required and positive', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <RecordPaymentSheet
        bookingId={10}
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

    expect(screen.getByText('المبلغ مطلوب')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('validates that amount is greater than zero', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <RecordPaymentSheet
        bookingId={10}
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('المبلغ'), '0')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

    expect(screen.getByText('المبلغ يجب أن يكون أكبر من صفر'))
      .toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed payment values without booking logic', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <RecordPaymentSheet
        bookingId={10}
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('المبلغ'), '150')
    await user.selectOptions(
      screen.getByLabelText('طريقة الدفع'),
      'DIGITAL_WALLET',
    )
    await user.type(screen.getByLabelText('رقم العملية'), ' REF-123 ')
    await user.type(screen.getByLabelText('ملاحظات'), ' دفعة مقدمة ')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

    expect(onSubmit).toHaveBeenCalledWith({
      amount: '150',
      payment_method: 'DIGITAL_WALLET',
      reference: 'REF-123',
      notes: 'دفعة مقدمة',
    })
  })

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <RecordPaymentSheet
        bookingId={10}
        error={null}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'إلغاء' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows backend field errors near amount and reference fields', () => {
    render(
      <RecordPaymentSheet
        bookingId={10}
        error="يرجى مراجعة البيانات المدخلة."
        fieldErrors={{
          amount: [
            {
              code: 'TRANSACTION_AMOUNT_EXCEEDS_REMAINING',
              message: 'المبلغ أكبر من المتبقي',
            },
          ],
          reference: [
            {
              code: 'PAYMENT_REFERENCE_REQUIRED',
              message: 'رقم العملية مطلوب',
            },
          ],
        }}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('المبلغ أكبر من المتبقي')).toBeInTheDocument()
    expect(screen.getByText('رقم العملية مطلوب')).toBeInTheDocument()
  })

  it('shows minimum deposit guidance without blocking local validation', () => {
    render(
      <RecordPaymentSheet
        bookingId={10}
        error={null}
        isSubmitting={false}
        minimumDepositHint="100.00"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(
      screen.getByText(/الحد الأدنى للعربون في إعدادات الملعب/),
    ).toBeInTheDocument()
    expect(screen.getByText('100.00 جنيه')).toBeInTheDocument()
  })
})
