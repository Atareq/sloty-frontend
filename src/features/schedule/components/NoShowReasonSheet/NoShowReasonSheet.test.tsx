import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { chooseAppSelectOption } from '../../../../test/appSelectTestUtils'
import { NoShowReasonSheet } from './NoShowReasonSheet'

function renderSheet(onSubmit = vi.fn()) {
  render(
    <NoShowReasonSheet
      error={null}
      isSubmitting={false}
      onClose={vi.fn()}
      onSubmit={onSubmit}
    />,
  )
}

describe('NoShowReasonSheet', () => {
  it('warns that no-show ends an active weekly recurrence', () => {
    render(
      <NoShowReasonSheet
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        recurrenceWillEnd
      />,
    )

    expect(
      screen.getByText(
        'تسجيل الحجز كعدم حضور هيوقف كمان التكرار الأسبوعي.',
      ),
    ).toBeInTheDocument()
  })

  it('submits optional reason and notes', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderSheet(onSubmit)

    await chooseAppSelectOption(
      user,
      screen.getByLabelText('سبب عدم الحضور'),
      'لم يحضر العميل',
    )
    await user.type(screen.getByLabelText('ملاحظات'), 'انتظر الموظف 20 دقيقة')
    await user.click(screen.getByRole('button', { name: 'تأكيد عدم الحضور' }))

    expect(onSubmit).toHaveBeenCalledWith({
      reason: 'لم يحضر العميل',
      notes: 'انتظر الموظف 20 دقيقة',
    })
  })

  it('requires notes when reason is other', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderSheet(onSubmit)

    await chooseAppSelectOption(
      user,
      screen.getByLabelText('سبب عدم الحضور'),
      'أخرى',
    )
    await user.click(screen.getByRole('button', { name: 'تأكيد عدم الحضور' }))

    expect(screen.getByText('اكتب ملاحظة توضح سبب عدم الحضور'))
      .toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
