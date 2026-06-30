import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../../core/auth/AuthProvider'
import { LoginPage } from './LoginPage'

function renderLoginPage() {
  render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('LoginPage', () => {
  it('renders the Arabic login heading', () => {
    renderLoginPage()

    expect(screen.getByRole('heading', { name: 'تسجيل الدخول' }))
      .toBeInTheDocument()
  })

  it('renders the Sloty brand block and login fields', () => {
    renderLoginPage()

    expect(screen.getByText('سلوتي')).toBeInTheDocument()
    expect(screen.getByLabelText('رقم الموبايل أو اسم المستخدم'))
      .toBeInTheDocument()
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument()
  })

  it('toggles password visibility locally', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    const passwordInput = screen.getByLabelText('كلمة المرور')

    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'إظهار كلمة المرور' }))

    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(
      screen.getByRole('button', { name: 'إخفاء كلمة المرور' }),
    ).toBeInTheDocument()
  })
})
