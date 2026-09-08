import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Value } from 'react-phone-number-input'
import { SlotyPhoneNumberInput } from './PhoneNumberInput'

function ControlledPhoneNumberInput() {
  const [value, setValue] = useState<Value | undefined>(undefined)

  return (
    <SlotyPhoneNumberInput
      onChange={setValue}
      value={value}
    />
  )
}

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

  it('keeps a pasted or suggested Egyptian mobile number stable in controlled state', async () => {
    const user = userEvent.setup()

    render(<ControlledPhoneNumberInput />)

    const input = screen.getByLabelText('رقم الموبايل')

    await user.click(input)
    await user.paste('01012345678')

    expect(input).toHaveValue('010 12345678')

    await user.keyboard('{Backspace}{Backspace}')

    expect(input).toHaveValue('010 123456')
  })
})
