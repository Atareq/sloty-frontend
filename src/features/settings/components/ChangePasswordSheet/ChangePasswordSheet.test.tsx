import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChangePasswordSheet } from './ChangePasswordSheet'

describe('ChangePasswordSheet', () => {
  it('renders all password fields, labels, and backend requirement notice', () => {
    const handleClose = vi.fn()
    render(<ChangePasswordSheet isOpen onClose={handleClose} />)

    expect(screen.getAllByText('تغيير كلمة المرور').length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByText('غيّر كلمة مرور حسابك للحفاظ على أمانه.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'ميزة تغيير كلمة المرور تتطلب دعم الخادم (BE-REQ-AUTHENTICATED-CHANGE-PASSWORD).',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('كلمة المرور الحالية')).toBeInTheDocument()
    expect(screen.getByLabelText('كلمة المرور الجديدة')).toBeInTheDocument()
    expect(screen.getByLabelText('تأكيد كلمة المرور الجديدة')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'حفظ كلمة المرور' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إلغاء' })).toBeInTheDocument()
  })

  it('rejects empty submission and requires fields', async () => {
    const user = userEvent.setup()
    render(<ChangePasswordSheet isOpen onClose={vi.fn()} />)

    const submitButton = screen.getByRole('button', { name: 'حفظ كلمة المرور' })
    await user.click(submitButton)

    expect(screen.getByText('كلمة المرور الحالية مطلوبة')).toBeInTheDocument()
    expect(screen.getByText('كلمة المرور الجديدة مطلوبة')).toBeInTheDocument()
    expect(screen.getByText('تأكيد كلمة المرور مطلوب')).toBeInTheDocument()
  })

  it('rejects confirmation mismatch locally', async () => {
    const user = userEvent.setup()
    render(<ChangePasswordSheet isOpen onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('كلمة المرور الحالية'), 'oldPass123')
    await user.type(screen.getByLabelText('كلمة المرور الجديدة'), 'newPass123')
    await user.type(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), 'diffPass456')

    const submitButton = screen.getByRole('button', { name: 'حفظ كلمة المرور' })
    await user.click(submitButton)

    expect(screen.getByText('تأكيد كلمة المرور غير مطابق')).toBeInTheDocument()
  })

  it('shows backend-blocked notice when form is valid without calling fake API', async () => {
    const user = userEvent.setup()
    render(<ChangePasswordSheet isOpen onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('كلمة المرور الحالية'), 'oldPass123')
    await user.type(screen.getByLabelText('كلمة المرور الجديدة'), 'newPass123')
    await user.type(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), 'newPass123')

    const submitButton = screen.getByRole('button', { name: 'حفظ كلمة المرور' })
    await user.click(submitButton)

    expect(
      screen.getByText(
        'تغيير كلمة المرور غير متاح حاليًا بانتظار دعم الخادم (BE-REQ-AUTHENTICATED-CHANGE-PASSWORD).',
      ),
    ).toBeInTheDocument()
  })

  it('calls onClose and resets fields when cancel is clicked', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()
    const { rerender } = render(
      <ChangePasswordSheet isOpen onClose={handleClose} />,
    )

    const input = screen.getByLabelText('كلمة المرور الحالية')
    fireEvent.change(input, { target: { value: 'oldPass123' } })
    expect(input).toHaveValue('oldPass123')

    await user.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(handleClose).toHaveBeenCalled()

    // Reopening with isOpen=true has clear state
    rerender(<ChangePasswordSheet isOpen onClose={handleClose} />)
    expect(screen.getByLabelText('كلمة المرور الحالية')).toHaveValue('')
  })
})
