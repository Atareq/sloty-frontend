import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { chooseAppSelectOption } from '../../../../test/appSelectTestUtils'
import { CancelBookingReasonSheet } from './CancelBookingReasonSheet'

function renderSheet(onSubmit = vi.fn()) {
  const onClose = vi.fn()

  render(
    <CancelBookingReasonSheet
      error={null}
      isSubmitting={false}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  )

  return { onClose, onSubmit }
}

describe('CancelBookingReasonSheet', () => {
  it('requires a cancellation reason', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderSheet(onSubmit)

    await user.click(screen.getByRole('button', { name: 'تأكيد إلغاء الحجز' }))

    expect(screen.getByText('سبب الإلغاء مطلوب')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('requires notes when reason is other', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderSheet(onSubmit)

    await chooseAppSelectOption(user, screen.getByLabelText('سبب الإلغاء'), 'أخرى')
    await user.click(screen.getByRole('button', { name: 'تأكيد إلغاء الحجز' }))

    expect(screen.getByText('اكتب ملاحظة توضح سبب الإلغاء'))
      .toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits reason and notes', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderSheet(onSubmit)

    await chooseAppSelectOption(user, screen.getByLabelText('سبب الإلغاء'), 'أخرى')
    await user.type(screen.getByLabelText('ملاحظات'), 'ظرف طارئ')
    await user.click(screen.getByRole('button', { name: 'تأكيد إلغاء الحجز' }))

    expect(onSubmit).toHaveBeenCalledWith({
      reason: 'أخرى',
      notes: 'ظرف طارئ',
    })
  })

  it('shows backend field error for cancellation reason', () => {
    render(
      <CancelBookingReasonSheet
        error="يرجى مراجعة البيانات المدخلة."
        fieldErrors={{
          reason: [
            {
              code: 'REQUIRED',
              message: 'سبب الإلغاء مطلوب من الخادم',
            },
          ],
        }}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(
      screen.getByText('سبب الإلغاء مطلوب من الخادم'),
    ).toBeInTheDocument()
  })

  it('shows backend refund preview and submits refund metadata only when refund is due', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <CancelBookingReasonSheet
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        preview={{
          booking_id: 10,
          previewed_at: '2026-07-21T12:00:00Z',
          booking_start: '2026-07-22T18:00:00Z',
          paid_amount: '300.00',
          minimum_deposit: '100.00',
          refund_notice_days: 3,
          refund_deadline: '2026-07-19T18:00:00Z',
          full_refund: false,
          refund_amount: '200.00',
          retained_amount: '100.00',
          can_cancel: true,
        }}
      />,
    )

    expect(screen.getByText('مبلغ الاسترداد')).toBeInTheDocument()
    expect(screen.getByText('200.00 جنيه')).toBeInTheDocument()

    await chooseAppSelectOption(
      user,
      screen.getByLabelText('سبب الإلغاء'),
      'العميل ألغى',
    )
    await chooseAppSelectOption(
      user,
      screen.getByLabelText('طريقة الاسترداد'),
      'تحويل بنكي',
    )
    await user.type(screen.getByLabelText('مرجع الاسترداد'), ' RF-1 ')
    await user.type(screen.getByLabelText('ملاحظات الاسترداد'), ' تم التحويل ')
    await user.click(screen.getByRole('button', { name: 'تأكيد إلغاء الحجز' }))

    expect(onSubmit).toHaveBeenCalledWith({
      reason: 'العميل ألغى',
      refund_payment_method: 'BANK_TRANSFER',
      refund_reference: 'RF-1',
      refund_notes: 'تم التحويل',
    })
  })
})
