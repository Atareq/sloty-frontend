import { useState } from 'react'
import PhoneInput from 'react-phone-number-input/input'
import {
  getCountries,
  getCountryCallingCode,
} from 'react-phone-number-input'
import type { Country, Value } from 'react-phone-number-input'
import { AppSelect } from '../AppSelect/AppSelect'

export interface SlotyPhoneNumberInputBaseProps {
  defaultCountry?: Country
  disabled?: boolean
  placeholder?: string
  error?: boolean
  /** Accessible name for the number field. Defaults to Egyptian-Arabic product copy. */
  ariaLabel?: string
}

export interface SlotyPhoneNumberInputLegacyProps extends SlotyPhoneNumberInputBaseProps {
  raw?: false
  value: Value | undefined
  onChange: (value: Value | undefined) => void
  country?: never
  onCountryChange?: never
}

export interface SlotyPhoneNumberInputRawProps extends SlotyPhoneNumberInputBaseProps {
  raw: true
  value: string | undefined
  onChange: (value: string) => void
  country?: Country
  onCountryChange?: (country: Country) => void
}

export type SlotyPhoneNumberInputProps =
  | SlotyPhoneNumberInputLegacyProps
  | SlotyPhoneNumberInputRawProps

const countries = getCountries()

/**
 * Split country selector plus phone input.
 *
 * Egypt is the default country, so local numbers such as 01012345678 are
 * parsed by the phone library and returned as +201012345678.
 * The placeholder intentionally uses `X` so it reads as an example, not data.
 * In default/legacy mode, it uses PhoneInput to format and emit E.164 values.
 * In `raw: true` mode, it uses a native `<input type="tel">` that keeps user
 * or Safari AutoFill input stable without live formatting rewrites, while the
 * parent owns the selected country as parsing context.
 */
export function SlotyPhoneNumberInput(props: SlotyPhoneNumberInputProps) {
  const {
    ariaLabel = 'رقم الموبايل',
    defaultCountry = 'EG',
    disabled = false,
    error = false,
    placeholder = '01X XXX XXXX',
  } = props

  // Legacy mode keeps internal country state and clears value on change.
  const [legacyCountry, setLegacyCountry] = useState<Country>(defaultCountry)

  const activeCountry = props.raw
    ? (props.country ?? defaultCountry)
    : legacyCountry

  function handleCountryChange(newCountry: Country): void {
    if (props.raw) {
      // In raw mode, parent owns country state via onCountryChange.
      // Raw phone text remains untouched (not cleared or reformatted).
      props.onCountryChange?.(newCountry)
    } else {
      // Legacy behavior: update internal country state and clear input value
      setLegacyCountry(newCountry)
      props.onChange(undefined)
    }
  }

  return (
    <div
      className={[
        'sloty-phone-input',
        error ? 'sloty-phone-input--error' : '',
      ].join(' ')}
    >
      <AppSelect
        ariaLabel="الدولة أو المنطقة"
        className="sloty-phone-input__country"
        disabled={disabled}
        onChange={(country) => handleCountryChange(country as Country)}
        options={countries.map((country) => ({
          value: country,
          label: `${country} +${getCountryCallingCode(country)}`,
        }))}
        value={activeCountry}
      />

      {props.raw ? (
        <input
          aria-label={ariaLabel}
          autoComplete="tel"
          className="sloty-phone-input__number"
          disabled={disabled}
          inputMode="tel"
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={placeholder}
          type="tel"
          value={props.value ?? ''}
        />
      ) : (
        <PhoneInput
          aria-label={ariaLabel}
          autoComplete="tel"
          className="sloty-phone-input__number"
          country={activeCountry}
          disabled={disabled}
          inputMode="tel"
          onChange={props.onChange}
          placeholder={placeholder}
          smartCaret={false}
          value={props.value}
        />
      )}
    </div>
  )
}
