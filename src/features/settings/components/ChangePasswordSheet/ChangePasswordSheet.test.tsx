import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../../core/api/apiClient'
import { changePassword } from '../../../../core/auth/authApi'
import { ChangePasswordSheet } from './ChangePasswordSheet'

const mockLogout = vi.fn().mockResolvedValue(undefined)
const mockNavigate = vi.fn()

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../../../../core/auth/useAuth', () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}))

vi.mock('../../../../core/auth/authApi', () => ({
  changePassword: vi.fn(),
}))

const mockedChangePassword = vi.mocked(changePassword)

describe('ChangePasswordSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all password fields, labels, and action buttons', () => {
    const handleClose = vi.fn()
    render(<ChangePasswordSheet isOpen onClose={handleClose} />)

    expect(screen.getAllByText('تغيير كلمة المرور').length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByText('غيّر كلمة مرور حسابك للحفاظ على أمانه.'),
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

  it('submits valid form to changePassword, calls logout and navigates to /login', async () => {
    mockedChangePassword.mockResolvedValueOnce(undefined)
    const handleClose = vi.fn()
    render(<ChangePasswordSheet isOpen onClose={handleClose} />)

    fireEvent.change(screen.getByLabelText('كلمة المرور الحالية'), {
      target: { value: 'oldPass123' },
    })
    fireEvent.change(screen.getByLabelText('كلمة المرور الجديدة'), {
      target: { value: 'newPass123' },
    })
    fireEvent.change(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), {
      target: { value: 'newPass123' },
    })

    const submitButton = screen.getByRole('button', { name: 'حفظ كلمة المرور' })
    fireEvent.click(submitButton)

    expect(mockedChangePassword).toHaveBeenCalledWith({
      current_password: 'oldPass123',
      new_password: 'newPass123',
      new_password_confirmation: 'newPass123',
    })

    await vi.waitFor(() => {
      expect(handleClose).toHaveBeenCalled()
      expect(mockLogout).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })

  it('displays error message when changePassword fails', async () => {
    mockedChangePassword.mockRejectedValueOnce(
      new ApiClientError('كلمة المرور الحالية غير صحيحة', 400),
    )
    render(<ChangePasswordSheet isOpen onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('كلمة المرور الحالية'), {
      target: { value: 'wrongPass' },
    })
    fireEvent.change(screen.getByLabelText('كلمة المرور الجديدة'), {
      target: { value: 'newPass123' },
    })
    fireEvent.change(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), {
      target: { value: 'newPass123' },
    })

    const submitButton = screen.getByRole('button', { name: 'حفظ كلمة المرور' })
    fireEvent.click(submitButton)

    expect(mockedChangePassword).toHaveBeenCalled()
    expect(await screen.findByText('كلمة المرور الحالية غير صحيحة')).toBeInTheDocument()
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
