import { useState } from 'react'
import PhoneInput from 'react-phone-number-input/input'
import {
  getCountries,
  getCountryCallingCode,
} from 'react-phone-number-input'
import type { Country, Value } from 'react-phone-number-input'

export interface SlotyPhoneNumberInputProps {
  value: Value | undefined
  onChange: (value: Value | undefined) => void
  defaultCountry?: Country
  disabled?: boolean
  placeholder?: string
  error?: boolean
}

const countries = getCountries()

/**
 * Split country selector plus phone input that still emits one E.164 value.
 *
 * Egypt is the default country, so local numbers such as 01012345678 are
 * parsed by the phone library and returned as +201012345678.
 */
export function SlotyPhoneNumberInput({
  value,
  onChange,
  defaultCountry = 'EG',
  disabled = false,
  placeholder = '01012345678',
  error = false,
}: SlotyPhoneNumberInputProps) {
  const [selectedCountry, setSelectedCountry] =
    useState<Country>(defaultCountry)

  function handleCountryChange(country: Country): void {
    setSelectedCountry(country)
    onChange(undefined)
  }

  return (
    <div
      className={[
        'sloty-phone-input',
        error ? 'sloty-phone-input--error' : '',
      ].join(' ')}
    >
      <select
        aria-label="الدولة أو المنطقة"
        className="sloty-phone-input__country"
        disabled={disabled}
        onChange={(event) => handleCountryChange(event.target.value as Country)}
        value={selectedCountry}
      >
        {countries.map((country) => (
          <option key={country} value={country}>
            {country} +{getCountryCallingCode(country)}
          </option>
        ))}
      </select>

      <PhoneInput
        aria-label="رقم الهاتف"
        autoComplete="tel"
        className="sloty-phone-input__number"
        country={selectedCountry}
        disabled={disabled}
        inputMode="tel"
        limitMaxLength
        onChange={onChange}
        placeholder={placeholder}
        value={value}
      />
    </div>
  )
}
