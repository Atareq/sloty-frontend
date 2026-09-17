import { ArrowDown, ArrowUp } from 'lucide-react'

export type SortDirection = 'asc' | 'desc'

export interface SortOrderToggleProps {
  /**
   * Current sort direction.
   * 'desc' indicates descending (e.g. newest first).
   * 'asc' indicates ascending (e.g. oldest first).
   */
  value: SortDirection
  /**
   * Label displayed when in ascending order.
   * Clicking toggles to descending.
   */
  ascendingLabel: string
  /**
   * Label displayed when in descending order.
   * Clicking toggles to ascending.
   */
  descendingLabel: string
  /**
   * Callback fired with the next sort direction when toggled.
   */
  onChange: (value: SortDirection) => void
  /**
   * Optional disabled state.
   */
  disabled?: boolean
  /**
   * Optional compact presentation mode.
   * Renders a smaller, content-width control suitable for tight toolbars.
   */
  compact?: boolean
  /**
   * Optional extra CSS class names.
   */
  className?: string
  /**
   * Optional accessibility prefix for aria-label (e.g. 'ترتيب الحجوزات').
   * If provided, aria-label is `${ariaLabelPrefix}: ${currentLabel}`.
   * Otherwise, aria-label is `currentLabel`.
   */
  ariaLabelPrefix?: string
}

/**
 * Reusable two-state ascending/descending ordering toggle button.
 *
 * Secondary view control that displays the current direction label with
 * an arrow icon. Clicking toggles between 'asc' and 'desc'.
 */
export function SortOrderToggle({
  value,
  ascendingLabel,
  descendingLabel,
  onChange,
  disabled = false,
  compact = false,
  className = '',
  ariaLabelPrefix,
}: SortOrderToggleProps) {
  const currentLabel = value === 'asc' ? ascendingLabel : descendingLabel
  const ariaLabel = ariaLabelPrefix
    ? `${ariaLabelPrefix}: ${currentLabel}`
    : currentLabel

  function handleClick(): void {
    if (disabled) {
      return
    }
    onChange(value === 'asc' ? 'desc' : 'asc')
  }

  const baseClasses = compact
    ? 'inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--sloty-border)] bg-[var(--sloty-surface)] px-2.5 text-xs font-bold text-[var(--sloty-text-primary)] transition hover:border-[var(--sloty-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60'
    : 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-primary)] transition hover:border-[var(--sloty-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60'

  const iconClasses = compact
    ? 'h-3.5 w-3.5 shrink-0 text-[var(--sloty-primary)]'
    : 'h-4 w-4 shrink-0 text-[var(--sloty-primary)]'

  return (
    <button
      aria-label={ariaLabel}
      className={[baseClasses, className].filter(Boolean).join(' ')}
      disabled={disabled}
      onClick={handleClick}
      type="button"
    >
      {value === 'asc' ? (
        <ArrowUp
          aria-hidden="true"
          className={iconClasses}
        />
      ) : (
        <ArrowDown
          aria-hidden="true"
          className={iconClasses}
        />
      )}
      <span>{currentLabel}</span>
    </button>
  )
}

export const OrderBy = SortOrderToggle
export const OrderByButton = SortOrderToggle
