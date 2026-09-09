import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Country, Value } from 'react-phone-number-input'
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

function ControlledRawPhoneNumberInput({
  initialCountry = 'EG',
  initialValue = '',
}: {
  initialCountry?: Country
  initialValue?: string
}) {
  const [value, setValue] = useState<string>(initialValue)
  const [country, setCountry] = useState<Country>(initialCountry)
  const [renderCount, setRenderCount] = useState(0)

  return (
    <div>
      <button onClick={() => setRenderCount((c) => c + 1)} type="button">
        إعادة تصيير {renderCount}
      </button>
      <SlotyPhoneNumberInput
        country={country}
        onChange={setValue}
        onCountryChange={setCountry}
        raw
        value={value}
      />
    </div>
  )
}

describe('SlotyPhoneNumberInput - Legacy Mode', () => {
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

describe('SlotyPhoneNumberInput - Raw Mode (Booking/Customer)', () => {
  it('renders a native tel input with proper mobile and Contact AutoFill attributes', () => {
    render(
      <SlotyPhoneNumberInput
        country="EG"
        onChange={vi.fn()}
        raw
        value=""
      />,
    )

    const input = screen.getByLabelText('رقم الموبايل')

    expect(input.tagName).toBe('INPUT')
    expect(input).toHaveAttribute('type', 'tel')
    expect(input).toHaveAttribute('inputmode', 'tel')
    expect(input).toHaveAttribute('autocomplete', 'tel')
    expect(input).not.toHaveAttribute('autocomplete', 'off')
    expect(input).toHaveAttribute('placeholder', '01X XXX XXXX')
    expect(input).toHaveClass('sloty-phone-input__number')
  })

  it('preserves raw unformatted text while typing without live reformatting', async () => {
    const user = userEvent.setup()

    render(<ControlledRawPhoneNumberInput />)

    const input = screen.getByLabelText('رقم الموبايل')

    await user.type(input, '+20 10 1234 5678')

    // Must remain raw text, not rewritten to +201012345678 or other live formatting
    expect(input).toHaveValue('+20 10 1234 5678')
  })

  it('simulates Safari Contact AutoFill with full number and keeps value stable without loops', () => {
    const handleChange = vi.fn()

    const { rerender } = render(
      <SlotyPhoneNumberInput
        country="EG"
        onChange={handleChange}
        raw
        value=""
      />,
    )

    const input = screen.getByLabelText('رقم الموبايل')

    // Simulate Safari inserting an international phone number directly in one input/change event
    fireEvent.change(input, { target: { value: '+20 10 1234 5678' } })

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith('+20 10 1234 5678')

    // Controlled rerender with the raw value
    rerender(
      <SlotyPhoneNumberInput
        country="EG"
        onChange={handleChange}
        raw
        value="+20 10 1234 5678"
      />,
    )

    expect(input).toHaveValue('+20 10 1234 5678')
    expect(handleChange).toHaveBeenCalledTimes(1) // No repeated onChange cascade
  })

  it('keeps raw value stable across unrelated parent component rerenders', async () => {
    const user = userEvent.setup()

    render(<ControlledRawPhoneNumberInput initialValue="+20 10 1234 5678" />)

    const input = screen.getByLabelText('رقم الموبايل')
    expect(input).toHaveValue('+20 10 1234 5678')

    // Trigger unrelated parent rerender
    const rerenderButton = screen.getByRole('button', { name: /إعادة تصيير/ })
    await user.click(rerenderButton)

    // Visible input must still be exactly the raw string
    expect(input).toHaveValue('+20 10 1234 5678')
  })

  it('preserves raw phone value when country changes and across unrelated rerenders', async () => {
    const user = userEvent.setup()

    render(<ControlledRawPhoneNumberInput initialValue="01012345678" />)

    const input = screen.getByLabelText('رقم الموبايل')
    expect(input).toHaveValue('01012345678')

    // Change country via AppSelect
    const countryButton = screen.getByRole('button', { name: 'الدولة أو المنطقة' })
    await user.click(countryButton)

    const saudiOption = screen.getByRole('option', { name: /SA \+966/ })
    await user.click(saudiOption)

    // Raw value must NOT be cleared or changed
    expect(input).toHaveValue('01012345678')

    // Trigger unrelated parent rerender
    const rerenderButton = screen.getByRole('button', { name: /إعادة تصيير/ })
    await user.click(rerenderButton)

    // Raw value still remains unchanged
    expect(input).toHaveValue('01012345678')
  })
})
