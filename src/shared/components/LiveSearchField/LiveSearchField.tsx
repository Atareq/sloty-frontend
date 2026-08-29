import { useEffect, useId, useState } from 'react'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

export interface LiveSearchFieldProps {
  'aria-label'?: string
  debounceMs?: number
  label: string
  onSearch: (value: string) => void
  /**
   * Immediate draft updates for sibling UI such as quick-search shortcuts.
   * Debounced `onSearch` remains the server-query callback.
   */
  onDraftChange?: (value: string) => void
  placeholder?: string
  value: string
}

/**
 * Canonical live text search: the input stays mounted and focused while
 * the parent refreshes only the results region after a short debounce.
 */
export function LiveSearchField({
  'aria-label': ariaLabel,
  debounceMs = 350,
  label,
  onSearch,
  onDraftChange,
  placeholder,
  value,
}: LiveSearchFieldProps) {
  const inputId = useId()
  const [draft, setDraft] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const query = isFocused ? draft : value
  const debouncedQuery = useDebouncedValue(query, debounceMs)

  useEffect(() => {
    const nextValue = debouncedQuery.trim()
    const currentValue = value.trim()

    if (nextValue === currentValue) {
      return
    }

    onSearch(nextValue)
  }, [debouncedQuery, onSearch, value])

  return (
    <label className="min-w-0 flex-1 space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
      <span>{label}</span>
      <input
        aria-label={ariaLabel ?? label}
        autoComplete="off"
        className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] px-3 font-semibold text-[var(--sloty-text-primary)] outline-none transition focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
        id={inputId}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => {
          const nextDraft = event.target.value
          setIsFocused(true)
          setDraft(nextDraft)
          onDraftChange?.(nextDraft)
        }}
        onFocus={() => {
          setDraft(value)
          setIsFocused(true)
        }}
        placeholder={placeholder}
        type="search"
        value={query}
      />
    </label>
  )
}
