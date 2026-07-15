import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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

    await user.selectOptions(screen.getByLabelText('سبب الإلغاء'), 'أخرى')
    await user.click(screen.getByRole('button', { name: 'تأكيد إلغاء الحجز' }))

    expect(screen.getByText('اكتب ملاحظة توضح سبب الإلغاء'))
      .toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits reason and notes', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderSheet(onSubmit)

    await user.selectOptions(screen.getByLabelText('سبب الإلغاء'), 'أخرى')
    await user.type(screen.getByLabelText('ملاحظات'), 'ظرف طارئ')
    await user.click(screen.getByRole('button', { name: 'تأكيد إلغاء الحجز' }))

    expect(onSubmit).toHaveBeenCalledWith({
      reason: 'أخرى',
      notes: 'ظرف طارئ',
    })
  })
})
