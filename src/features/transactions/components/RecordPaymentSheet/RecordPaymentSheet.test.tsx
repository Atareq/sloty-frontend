import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { chooseAppSelectOption } from '../../../../test/appSelectTestUtils'
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

    fireEvent.change(screen.getByLabelText('المبلغ'), {
      target: { value: '150' },
    })
    await chooseAppSelectOption(
      user,
      screen.getByLabelText('طريقة الدفع'),
      'محفظة إلكترونية',
    )
    await user.type(screen.getByLabelText('مرجع الدفع'), ' REF-123 ')
    await user.type(screen.getByLabelText('ملاحظات'), ' دفعة مقدمة ')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

    expect(onSubmit).toHaveBeenCalledWith({
      amount: '150',
      client_request_id: expect.any(String),
      payment_method: 'DIGITAL_WALLET',
      reference: 'REF-123',
      notes: 'دفعة مقدمة',
      occurred_at: expect.any(String),
    })
  })

  it('reuses idempotency fields for same-input retries and rotates them after financial edits', async () => {
    const user = userEvent.setup()
    const randomUUIDSpy = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222')
    const dateSpy = vi
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValueOnce('2026-09-08T10:00:00.000Z')
      .mockReturnValueOnce('2026-09-08T10:01:00.000Z')
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(new Error('network failed'))
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce(undefined)

    try {
      render(
        <RecordPaymentSheet
          bookingId={10}
          error={null}
          isSubmitting={false}
          onClose={vi.fn()}
          onSubmit={onSubmit}
        />,
      )

      fireEvent.change(screen.getByLabelText('المبلغ'), {
        target: { value: '150' },
      })
      await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))
      await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

      expect(onSubmit).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          client_request_id: '11111111-1111-4111-8111-111111111111',
          occurred_at: '2026-09-08T10:00:00.000Z',
        }),
      )
      expect(onSubmit).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          client_request_id: '11111111-1111-4111-8111-111111111111',
          occurred_at: '2026-09-08T10:00:00.000Z',
        }),
      )

      fireEvent.change(screen.getByLabelText('المبلغ'), {
        target: { value: '175' },
      })
      await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

      expect(onSubmit).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          amount: '175',
          client_request_id: '22222222-2222-4222-8222-222222222222',
          occurred_at: '2026-09-08T10:01:00.000Z',
        }),
      )
    } finally {
      dateSpy.mockRestore()
      randomUUIDSpy.mockRestore()
    }
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

  it('protects dirty values and lets the user continue or discard', async () => {
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

    fireEvent.change(screen.getByLabelText('المبلغ'), {
      target: { value: '150' },
    })
    await user.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(screen.getByText('عندك تعديلات لسه متحفظتش.')).toBeInTheDocument()
    onClose.mockClear()

    await user.click(screen.getByRole('button', { name: 'كمل التعديل' }))
    expect(screen.getByLabelText('المبلغ')).toHaveValue('150')

    await user.click(screen.getByRole('button', { name: 'إلغاء' }))
    await user.click(screen.getByRole('button', { name: 'اخرج من غير حفظ' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it.each([
    ['deposit', 'تسجيل العربون', 'سجل العربون لتأكيد الحجز'],
    ['remaining', 'تحصيل المبلغ المتبقي', 'سجل المبلغ الذي تم تحصيله لهذا الحجز'],
  ] as const)('uses contextual %s payment copy', (paymentPurpose, title, description) => {
    render(
      <RecordPaymentSheet
        bookingId={10}
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        paymentPurpose={paymentPurpose}
      />,
    )

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
  })

  it('shows backend field errors near amount and reference fields', async () => {
    const user = userEvent.setup()

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
              message: 'مرجع الدفع مطلوب',
            },
          ],
        }}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    await chooseAppSelectOption(user, screen.getByLabelText('طريقة الدفع'), 'محفظة إلكترونية')

    expect(screen.getByText('المبلغ أكبر من المتبقي')).toBeInTheDocument()
    expect(screen.getByText('مرجع الدفع مطلوب')).toBeInTheDocument()
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
        paymentPurpose="deposit"
      />,
    )

    expect(screen.getByText('العربون المطلوب')).toBeInTheDocument()
    expect(screen.getByText('100.00 ج.م')).toBeInTheDocument()
  })
})
