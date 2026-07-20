import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CancelTransactionSheet } from './CancelTransactionSheet'

describe('CancelTransactionSheet', () => {
  it('requires a cancellation reason', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <CancelTransactionSheet
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'تأكيد إلغاء الدفع' }))

    expect(screen.getByText('سبب الإلغاء مطلوب')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a trimmed cancellation reason', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <CancelTransactionSheet
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('سبب الإلغاء'), '  مبلغ خاطئ  ')
    await user.click(screen.getByRole('button', { name: 'تأكيد إلغاء الدفع' }))

    expect(onSubmit).toHaveBeenCalledWith({ reason: 'مبلغ خاطئ' })
  })

  it('shows backend field error for cancellation reason', () => {
    render(
      <CancelTransactionSheet
        error="يرجى مراجعة البيانات المدخلة."
        fieldErrors={{
          reason: [
            {
              code: 'REQUIRED',
              message: 'اكتب سبب الإلغاء',
            },
          ],
        }}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('اكتب سبب الإلغاء')).toBeInTheDocument()
  })
})
