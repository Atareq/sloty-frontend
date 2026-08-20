export interface FilterCheckboxOption {
  key: string
  label: string
  checked: boolean
  disabled?: boolean
}

export interface FilterCheckboxGroupProps {
  label: string
  options: FilterCheckboxOption[]
  onChange: (key: string, checked: boolean) => void
  className?: string
}

/** Accessible, business-agnostic checkbox rows for related operational filters. */
export function FilterCheckboxGroup({
  label,
  options,
  onChange,
  className = '',
}: FilterCheckboxGroupProps) {
  return (
    <fieldset className={['space-y-2', className].filter(Boolean).join(' ')}>
      <legend className="text-sm font-bold text-[var(--sloty-text-primary)]">
        {label}
      </legend>
      <div className="grid gap-2 rounded-xl bg-[var(--sloty-bg)] p-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            className={[
              'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-transparent bg-[var(--sloty-surface)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-primary)] transition hover:border-[var(--sloty-primary)]/35',
              option.disabled ? 'cursor-not-allowed opacity-60' : '',
            ].join(' ')}
            key={option.key}
          >
            <input
              checked={option.checked}
              className="h-5 w-5 shrink-0 accent-[var(--sloty-primary)]"
              disabled={option.disabled}
              onChange={(event) => onChange(option.key, event.target.checked)}
              type="checkbox"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
