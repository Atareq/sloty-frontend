import { fireEvent, render, screen, within } from '@testing-library/react'
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

    await user.click(screen.getByRole('button', { name: 'إلغاء المعاملة' }))

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

    fireEvent.change(screen.getByLabelText('سبب الإلغاء'), {
      target: { value: '  مبلغ خاطئ  ' },
    })
    await user.click(screen.getByRole('button', { name: 'إلغاء المعاملة' }))

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

  it('uses AppSheet dismissal and protects a typed reason', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <CancelTransactionSheet
        error={null}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'إلغاء المعاملة' }))
      .toBeInTheDocument()
    expect(screen.queryByText(/إجماليات الخلفية/)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('سبب الإلغاء'), {
      target: { value: 'مبلغ خاطئ' },
    })
    await user.click(
      within(screen.getByRole('dialog', { name: 'إلغاء المعاملة' }))
        .getByRole('button', { name: 'إغلاق' }),
    )

    expect(screen.getByText('عندك تعديلات لسه متحفظتش.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
