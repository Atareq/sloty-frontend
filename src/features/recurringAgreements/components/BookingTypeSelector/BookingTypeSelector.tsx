export type BookingType = 'one_time' | 'weekly'

export interface BookingTypeSelectorProps {
  disabled?: boolean
  value: BookingType
  onChange: (value: BookingType) => void
}

/**
 * Presentational selector for choosing one-time or weekly booking creation.
 */
export function BookingTypeSelector({
  disabled = false,
  onChange,
  value,
}: BookingTypeSelectorProps) {
  return (
    <fieldset className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
      <legend>نوع الحجز</legend>
      <div className="grid grid-cols-2 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-1">
        <button
          className={[
            'rounded-lg px-3 py-2 text-sm font-bold transition',
            value === 'one_time'
              ? 'sloty-green-surface-button text-white'
              : 'text-[var(--sloty-text-muted)]',
          ].join(' ')}
          disabled={disabled}
          onClick={() => onChange('one_time')}
          type="button"
        >
          حجز مرة واحدة
        </button>
        <button
          className={[
            'rounded-lg px-3 py-2 text-sm font-bold transition',
            value === 'weekly'
              ? 'sloty-green-surface-button text-white'
              : 'text-[var(--sloty-text-muted)]',
          ].join(' ')}
          disabled={disabled}
          onClick={() => onChange('weekly')}
          type="button"
        >
          حجز أسبوعي
        </button>
      </div>
    </fieldset>
  )
}

