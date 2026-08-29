import { useId, useState } from 'react'
import { settingsCopy } from '../../copy/appCopy'

export interface PasswordFieldProps {
  autoComplete?: string
  disabled?: boolean
  error?: string
  id?: string
  label: string
  onChange: (value: string) => void
  value: string
}

/**
 * Shared password input with a labeled show/hide control.
 */
export function PasswordField({
  autoComplete = 'new-password',
  disabled = false,
  error,
  id,
  label,
  onChange,
  value,
}: PasswordFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [isVisible, setIsVisible] = useState(false)

  return (
    <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
      <span>{label}</span>
      <div className="relative">
        <input
          autoComplete={autoComplete}
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 pl-16 text-base outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15 sm:text-sm"
          disabled={disabled}
          id={inputId}
          onChange={(event) => onChange(event.target.value)}
          type={isVisible ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={
            isVisible ? settingsCopy.hidePassword : settingsCopy.showPassword
          }
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg px-1.5 py-1 text-xs font-semibold text-[var(--sloty-text-muted)] transition hover:text-[var(--sloty-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          {isVisible ? 'إخفاء' : 'إظهار'}
        </button>
      </div>
      {error ? (
        <span className="block text-xs font-bold text-[var(--sloty-danger)]">
          {error}
        </span>
      ) : null}
    </label>
  )
}
