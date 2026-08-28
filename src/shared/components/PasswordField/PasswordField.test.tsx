import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PasswordField } from './PasswordField'

describe('PasswordField', () => {
  it('toggles visibility without leaving the password control', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <PasswordField
        label="كلمة المرور"
        onChange={handleChange}
        value="secret123"
      />,
    )

    const input = screen.getByLabelText('كلمة المرور')
    expect(input).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'إظهار كلمة المرور' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'إخفاء كلمة المرور' }))
      .toBeInTheDocument()
  })
})
