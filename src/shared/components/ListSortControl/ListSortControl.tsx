import { ArrowDown, ArrowUp } from 'lucide-react'
import { listCopy } from '../../copy/appCopy'

export type ListSortValue = 'newest' | 'oldest'

export interface ListSortControlProps {
  value: ListSortValue
  onChange: (value: ListSortValue) => void
  disabled?: boolean
}

/**
 * Compact newest/oldest control for chronological result lists.
 *
 * Visible UI is two icon buttons, not a dropdown or Backend query syntax:
 * - Arrow down = newest first (`الأحدث أولًا`)
 * - Arrow up = oldest first (`الأقدم أولًا`)
 *
 * Callers map the semantic value onto their own server-side ordering contract
 * and place the control immediately before result cards (visual left in RTL).
 */
export function ListSortControl({
  disabled = false,
  onChange,
  value,
}: ListSortControlProps) {
  function selectValue(nextValue: ListSortValue): void {
    if (disabled || nextValue === value) {
      return
    }

    onChange(nextValue)
  }

  return (
    <div
      aria-label={listCopy.ordering}
      className="inline-flex items-center gap-1"
      dir="ltr"
      role="group"
    >
      <SortArrowButton
        active={value === 'newest'}
        disabled={disabled}
        icon={ArrowDown}
        label={listCopy.newestFirst}
        onClick={() => selectValue('newest')}
      />
      <SortArrowButton
        active={value === 'oldest'}
        disabled={disabled}
        icon={ArrowUp}
        label={listCopy.oldestFirst}
        onClick={() => selectValue('oldest')}
      />
    </div>
  )
}

interface SortArrowButtonProps {
  active: boolean
  disabled: boolean
  icon: typeof ArrowDown
  label: string
  onClick: () => void
}

function SortArrowButton({
  active,
  disabled,
  icon: Icon,
  label,
  onClick,
}: SortArrowButtonProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={[
        'inline-flex size-9 items-center justify-center rounded-lg border transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sloty-primary)]/30',
        active
          ? 'border-[var(--sloty-primary)] bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]'
          : 'border-transparent bg-transparent text-[var(--sloty-text-muted)] hover:border-[var(--sloty-border)] hover:bg-[var(--sloty-surface)]',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ].join(' ')}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon aria-hidden="true" className="size-4" strokeWidth={2.25} />
    </button>
  )
}
