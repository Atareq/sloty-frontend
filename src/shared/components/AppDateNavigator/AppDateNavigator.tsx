import { useMemo, useState } from 'react'
import {
  formatArabicCompactDay,
  formatDateInputValue,
  getRollingDateValues,
} from '../../utils/date'

export interface AppDateNavigatorProps {
  value: string
  onChange: (date: string) => void
  days?: number
}

function toValidDate(value: string | undefined): Date {
  const date = value ? new Date(`${value}T00:00:00`) : new Date()

  return Number.isNaN(date.getTime()) ? new Date() : date
}

/**
 * Shared rolling date strip. It keeps feature pages on one YYYY-MM-DD value
 * while still exposing a native calendar picker for arbitrary dates.
 */
export function AppDateNavigator({
  days = 7,
  onChange,
  value,
}: AppDateNavigatorProps) {
  const [visibleStartValue, setVisibleStartValue] = useState(
    formatDateInputValue(toValidDate(value)),
  )

  const stateDateValues = useMemo(
    () => getRollingDateValues(toValidDate(visibleStartValue), days),
    [visibleStartValue, days],
  )
  const effectiveVisibleStartValue =
    value && !stateDateValues.includes(value) ? value : visibleStartValue
  const dateValues = useMemo(
    () => getRollingDateValues(toValidDate(effectiveVisibleStartValue), days),
    [effectiveVisibleStartValue, days],
  )

  function handleDateClick(dateValue: string): void {
    setVisibleStartValue(effectiveVisibleStartValue)
    onChange(dateValue)
  }

  function handleCalendarChange(nextValue: string): void {
    if (!nextValue) {
      return
    }

    const nextDate = new Date(`${nextValue}T00:00:00`)

    if (!Number.isNaN(nextDate.getTime())) {
      setVisibleStartValue(nextValue)
    }

    onChange(nextValue)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dateValues.map((dateValue) => {
          const label = formatArabicCompactDay(dateValue)
          const isSelected = dateValue === value

          return (
            <button
              aria-pressed={isSelected}
              className={[
                'grid h-16 min-w-16 place-items-center rounded-2xl px-3 text-sm font-black transition',
                isSelected
                  ? 'sloty-green-surface-button text-white'
                  : 'bg-[var(--sloty-bg)] text-[var(--sloty-text-muted)] hover:text-[var(--sloty-text-primary)]',
              ].join(' ')}
              key={dateValue}
              onClick={() => handleDateClick(dateValue)}
              type="button"
            >
              <span className="text-xs">{label.weekday}</span>
              <span className="text-lg">{label.day}</span>
            </button>
          )
        })}
      </div>

      <label className="flex items-center gap-2 text-sm font-bold text-[var(--sloty-text-muted)]">
        <span>تاريخ الحجز</span>
        <input
          className="h-10 rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-sm font-bold text-[var(--sloty-text-primary)]"
          onChange={(event) => handleCalendarChange(event.target.value)}
          type="date"
          value={value || formatDateInputValue(new Date())}
        />
      </label>
    </div>
  )
}
