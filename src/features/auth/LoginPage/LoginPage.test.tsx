import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('renders the Arabic login heading', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'تسجيل الدخول' }))
      .toBeInTheDocument()
  })

  it('renders the Sloty brand block and login fields', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('سلوتي')).toBeInTheDocument()
    expect(screen.getByLabelText('رقم الموبايل أو اسم المستخدم'))
      .toBeInTheDocument()
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument()
  })

  it('toggles password visibility locally', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    const passwordInput = screen.getByLabelText('كلمة المرور')

    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'إظهار كلمة المرور' }))

    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(
      screen.getByRole('button', { name: 'إخفاء كلمة المرور' }),
    ).toBeInTheDocument()
  })
})
