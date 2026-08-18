import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface AppSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface AppSelectProps {
  label?: string
  value: string
  options: AppSelectOption[]
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  loadingLabel?: string
  emptyLabel?: string
  ariaLabel?: string
}

function getNextEnabledIndex(
  options: AppSelectOption[],
  currentIndex: number,
  direction: 1 | -1,
): number {
  if (options.length === 0) {
    return -1
  }

  let nextIndex = currentIndex

  for (let step = 0; step < options.length; step += 1) {
    nextIndex = (nextIndex + direction + options.length) % options.length

    if (!options[nextIndex]?.disabled) {
      return nextIndex
    }
  }

  return -1
}

function getFirstEnabledIndex(options: AppSelectOption[]): number {
  return options.findIndex((option) => !option.disabled)
}

function getLastEnabledIndex(options: AppSelectOption[]): number {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (!options[index]?.disabled) {
      return index
    }
  }

  return -1
}

/**
 * Sloty product dropdown.
 *
 * The component owns visual and keyboard interaction only. Feature code keeps
 * domain values, fallback options, and any string-to-number conversion.
 */
export function AppSelect({
  ariaLabel,
  className,
  disabled = false,
  emptyLabel = 'لا توجد خيارات',
  label,
  loading = false,
  loadingLabel = 'جاري التحميل...',
  onChange,
  options,
  placeholder = 'اختر',
  value,
}: AppSelectProps) {
  const generatedId = useId()
  const labelId = `${generatedId}-label`
  const valueId = `${generatedId}-value`
  const listboxId = `${generatedId}-listbox`
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const renderedOptions = useMemo<AppSelectOption[]>(() => {
    if (loading) {
      return [{ value: '__loading__', label: loadingLabel, disabled: true }]
    }

    if (options.length === 0) {
      return [{ value: '__empty__', label: emptyLabel, disabled: true }]
    }

    return options
  }, [emptyLabel, loading, loadingLabel, options])

  const selectedOption =
    options.find((option) => option.value === value) ?? null
  const isDisabled = disabled || loading

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  function openMenu(): void {
    if (isDisabled) {
      return
    }

    const selectedIndex = renderedOptions.findIndex(
      (option) => option.value === value && !option.disabled,
    )
    setActiveIndex(
      selectedIndex >= 0 ? selectedIndex : getFirstEnabledIndex(renderedOptions),
    )
    setIsOpen(true)
  }

  function closeMenu(): void {
    setIsOpen(false)
    setActiveIndex(-1)
  }

  function handleSelect(option: AppSelectOption): void {
    if (option.disabled) {
      return
    }

    onChange(option.value)
    closeMenu()
    triggerRef.current?.focus()
  }

  function handleTriggerKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
  ): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()

      if (!isOpen) {
        openMenu()
        return
      }

      setActiveIndex((currentIndex) =>
        getNextEnabledIndex(
          renderedOptions,
          currentIndex,
          event.key === 'ArrowDown' ? 1 : -1,
        ),
      )
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      if (!isOpen) {
        openMenu()
      }
      setActiveIndex(getFirstEnabledIndex(renderedOptions))
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      if (!isOpen) {
        openMenu()
      }
      setActiveIndex(getLastEnabledIndex(renderedOptions))
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()

      if (!isOpen) {
        openMenu()
        return
      }

      const activeOption = renderedOptions[activeIndex]
      if (activeOption) {
        handleSelect(activeOption)
      }
      return
    }

    if (event.key === 'Escape') {
      closeMenu()
    }
  }

  return (
    <div
      className={['relative w-full', className].filter(Boolean).join(' ')}
      ref={rootRef}
    >
      {label ? (
        <span
          className="mb-2 block text-xs font-bold text-[var(--sloty-text-muted)]"
          id={labelId}
        >
          {label}
        </span>
      ) : null}

      <button
        aria-activedescendant={
          isOpen && activeIndex >= 0
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
        aria-controls={isOpen ? listboxId : undefined}
        aria-disabled={isDisabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={!label ? ariaLabel : undefined}
        aria-labelledby={label ? `${labelId} ${valueId}` : undefined}
        className={[
          'flex min-h-11 w-full items-center justify-between gap-3',
          'rounded-xl border bg-[var(--sloty-surface)] px-3 text-right',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[var(--sloty-primary)]/15',
          isDisabled
            ? 'cursor-not-allowed opacity-60'
            : 'hover:border-[var(--sloty-primary)]',
          isOpen
            ? 'border-[var(--sloty-primary)]'
            : 'border-[var(--sloty-border)]',
        ].join(' ')}
        disabled={isDisabled}
        onClick={() => {
          if (isOpen) {
            closeMenu()
          } else {
            openMenu()
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        type="button"
        value={value}
      >
        <span
          className={[
            'min-w-0 truncate text-sm font-black',
            selectedOption
              ? 'text-[var(--sloty-text-primary)]'
              : 'text-[var(--sloty-text-muted)]',
          ].join(' ')}
          id={valueId}
        >
          {selectedOption?.label ?? placeholder}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={[
            'h-4 w-4 shrink-0 text-[var(--sloty-text-muted)]',
            'transition-transform duration-150',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          strokeWidth={1.8}
        />
      </button>

      {isOpen ? (
        <div
          className={[
            'absolute inset-x-0 top-[calc(100%+0.5rem)] z-40',
            'overflow-hidden rounded-2xl border border-[var(--sloty-border)]',
            'bg-[var(--sloty-surface)] p-1.5 shadow-[var(--sloty-shadow)]',
          ].join(' ')}
          id={listboxId}
          role="listbox"
        >
          <div className="max-h-64 overflow-y-auto">
            {renderedOptions.map((option, index) => {
              const isSelected = option.value === value
              const isActive = index === activeIndex

              return (
                <button
                  aria-disabled={option.disabled}
                  aria-selected={isSelected}
                  className={[
                    'flex min-h-11 w-full items-center justify-between gap-3',
                    'rounded-xl px-3 py-2.5 text-right text-sm font-bold',
                    'transition-colors duration-150',
                    option.disabled
                      ? 'cursor-not-allowed text-[var(--sloty-text-muted)] opacity-70'
                      : 'text-[var(--sloty-text-primary)] hover:bg-[var(--sloty-bg)]',
                    isSelected
                      ? 'bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]'
                      : '',
                    isActive && !option.disabled
                      ? 'bg-[var(--sloty-bg)]'
                      : '',
                  ].join(' ')}
                  disabled={option.disabled}
                  id={`${listboxId}-option-${index}`}
                  key={`${option.value}-${index}`}
                  onClick={() => handleSelect(option)}
                  role="option"
                  type="button"
                  value={option.value}
                >
                  <span className="min-w-0 truncate">{option.label}</span>

                  {isSelected ? (
                    <Check
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-[var(--sloty-primary)]"
                      strokeWidth={2.2}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
