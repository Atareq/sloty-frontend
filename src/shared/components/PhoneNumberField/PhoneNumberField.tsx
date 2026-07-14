import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

interface PhoneNumberInputProps {
  value: string | undefined
  onChange: (value: string | undefined) => void
  disabled?: boolean
  label?: string
  required?: boolean
}

export function PhoneNumberInput({
  value,
  onChange,
  disabled = false,
  label = 'رقم الهاتف',
  required = false,
}: PhoneNumberInputProps) {
  return (
    <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
      <span>
        {label}
        {required ? ' *' : ''}
      </span>

      <PhoneInput
        className="sloty-phone-input"
        defaultCountry="EG"
        international
        disabled={disabled}
        value={value}
        onChange={onChange}
      />
    </label>
  )
}