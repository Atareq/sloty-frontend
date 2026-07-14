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
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل الدفع' }))

    expect(
      screen.getByText('المبلغ مطلوب ويجب أن يكون أكبر من صفر'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed payment values without booking logic', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <RecordPaymentSheet
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
    await user.type(screen.getByLabelText('مرجع الدفع'), ' REF-123 ')
    await user.type(screen.getByLabelText('ملاحظات'), ' دفعة مقدمة ')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدفع' }))

    expect(onSubmit).toHaveBeenCalledWith({
      amount: '150',
      payment_method: 'DIGITAL_WALLET',
      reference: 'REF-123',
      notes: 'دفعة مقدمة',
    })
  })

  it('recommends a reference for wallet and bank transfer payments', async () => {
    const user = userEvent.setup()

    render(
      <RecordPaymentSheet
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    await user.selectOptions(
      screen.getByLabelText('طريقة الدفع'),
      'BANK_TRANSFER',
    )

    expect(
      screen.getByText('يفضل إضافة مرجع الدفع لهذه الطريقة'),
    ).toBeInTheDocument()
  })
})
