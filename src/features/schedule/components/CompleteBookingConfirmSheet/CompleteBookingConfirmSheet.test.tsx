import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CompleteBookingConfirmSheet } from './CompleteBookingConfirmSheet'

describe('CompleteBookingConfirmSheet', () => {
  it('renders remaining amount when provided and calls onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <CompleteBookingConfirmSheet
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        remainingAmount="50.00"
      />,
    )

    expect(
      screen.getByText(
        'المتبقي 50.00. تأكد أن المبلغ تم تحصيله قبل إكمال الحجز.',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تأكيد إكمال الحجز' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('renders the generic confirmation when no remaining amount exists', () => {
    render(
      <CompleteBookingConfirmSheet
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText('سيتم اعتبار الحجز مكتملاً بعد التأكيد.'))
      .toBeInTheDocument()
  })
})
