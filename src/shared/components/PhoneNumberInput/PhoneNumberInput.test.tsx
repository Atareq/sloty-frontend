import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SlotyPhoneNumberInput } from './PhoneNumberInput'

describe('SlotyPhoneNumberInput', () => {
  it('uses the canonical muted-looking example placeholder without setting a value', () => {
    render(
      <SlotyPhoneNumberInput
        onChange={vi.fn()}
        value={undefined}
      />,
    )

    const input = screen.getByLabelText('رقم الموبايل')

    expect(input).toHaveAttribute('placeholder', '01X XXX XXXX')
    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('inputmode', 'tel')
    expect(input).toHaveClass('sloty-phone-input__number')
  })

  it('keeps the field logically empty until typing and restores the placeholder after clearing', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <SlotyPhoneNumberInput
        onChange={handleChange}
        value={undefined}
      />,
    )

    const input = screen.getByLabelText('رقم الموبايل')

    await user.type(input, '01012345678')

    expect(handleChange).toHaveBeenLastCalledWith('+201012345678')
    expect(input).not.toHaveValue('01X XXX XXXX')

    await user.clear(input)

    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('placeholder', '01X XXX XXXX')
  })
})
