import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { customerCopy } from '../../../../shared/copy/appCopy'
import { getClubPlayerPhone } from '../../players.types'
import type { ClubPlayer } from '../../players.types'

export interface PlayerComboboxProps {
  value: string
  onChange: (value: string) => void
  onSelectPlayer?: (player: ClubPlayer) => void
  playerOptions?: ClubPlayer[]
  isLoading?: boolean
  disabled?: boolean
  error?: boolean
  id?: string
  ariaLabel?: string
  placeholder?: string
}

const EMPTY_PLAYER_OPTIONS: ClubPlayer[] = []

/**
 * Free-text customer name field with optional phone-scoped suggestions.
 *
 * Suggestions come only from `playerOptions`, which the booking sheet loads
 * for the entered phone. Typing never searches all customers, never rejects
 * an unknown name, and never replaces the typed value.
 */
export function PlayerCombobox({
  ariaLabel = customerCopy.playerName,
  disabled = false,
  error = false,
  id,
  isLoading = false,
  onChange,
  onSelectPlayer,
  placeholder = customerCopy.playerNamePlaceholder,
  playerOptions = EMPTY_PLAYER_OPTIONS,
  value,
}: PlayerComboboxProps) {
  const generatedId = useId()
  const inputId = id ?? `${generatedId}-player-input`
  const listboxId = `${generatedId}-player-listbox`

  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const canShowSuggestions = playerOptions.length > 0 || isLoading
  const suggestionsOpen = isOpen && canShowSuggestions

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value)
    setActiveIndex(-1)
    setIsOpen(playerOptions.length > 0)
  }

  function handleSelect(player: ClubPlayer) {
    onChange(player.display_name)
    onSelectPlayer?.(player)
    setIsOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!canShowSuggestions) {
        return
      }
      if (!isOpen) {
        setIsOpen(true)
        if (playerOptions.length > 0) {
          setActiveIndex(0)
        }
      } else if (playerOptions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % playerOptions.length)
      }
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!canShowSuggestions) {
        return
      }
      if (!isOpen) {
        setIsOpen(true)
        if (playerOptions.length > 0) {
          setActiveIndex(playerOptions.length - 1)
        }
      } else if (playerOptions.length > 0) {
        setActiveIndex((prev) =>
          prev <= 0 ? playerOptions.length - 1 : prev - 1,
        )
      }
      return
    }

    if (event.key === 'Enter') {
      if (suggestionsOpen && activeIndex >= 0 && playerOptions[activeIndex]) {
        event.preventDefault()
        handleSelect(playerOptions[activeIndex])
      }
      return
    }

    if (event.key === 'Escape') {
      if (suggestionsOpen) {
        event.preventDefault()
        setIsOpen(false)
        setActiveIndex(-1)
      }
      return
    }

    if (event.key === 'Tab') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  function handleToggleDropdown() {
    if (disabled || !canShowSuggestions) {
      return
    }
    setIsOpen((prev) => !prev)
    setActiveIndex(-1)
    if (!isOpen) {
      inputRef.current?.focus()
    }
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={suggestionsOpen}
          aria-autocomplete="list"
          aria-controls={suggestionsOpen ? listboxId : undefined}
          aria-activedescendant={
            suggestionsOpen && activeIndex >= 0 && playerOptions[activeIndex]
              ? `${listboxId}-opt-${playerOptions[activeIndex].id}`
              : undefined
          }
          aria-label={ariaLabel}
          autoComplete="off"
          className={`sloty-mobile-safe-input h-11 w-full rounded-xl border bg-white ps-3 pe-10 font-semibold text-[var(--sloty-text-primary)] outline-none transition-all focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20 ${
            error
              ? 'border-[var(--sloty-danger)]'
              : 'border-[var(--sloty-border)]'
          }`}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => {
            if (playerOptions.length > 0) {
              setIsOpen(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          value={value}
        />

        <button
          type="button"
          aria-label="عرض قائمة اللاعبين"
          tabIndex={-1}
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--sloty-text-muted)] hover:text-[var(--sloty-text-primary)] focus:outline-none"
          onClick={handleToggleDropdown}
          disabled={disabled}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--sloty-primary)]" />
          ) : (
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-150 ${
                suggestionsOpen ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>
      </div>

      {suggestionsOpen ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--sloty-border)] bg-white p-1 shadow-lg"
        >
          {isLoading && playerOptions.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-[var(--sloty-text-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--sloty-primary)]" />
              <span>{customerCopy.searching}</span>
            </div>
          ) : (
            playerOptions.map((option, idx) => {
              const optionPhone = getClubPlayerPhone(option)
              const isOptionActive = activeIndex === idx

              return (
                <div
                  key={option.id}
                  id={`${listboxId}-opt-${option.id}`}
                  role="option"
                  aria-selected={isOptionActive}
                  className={`cursor-pointer rounded-lg px-3 py-2 text-right transition-colors ${
                    isOptionActive
                      ? 'bg-[var(--sloty-primary)]/10 text-[var(--sloty-primary-dark)]'
                      : 'hover:bg-[var(--sloty-bg)] text-[var(--sloty-text-primary)]'
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault()
                  }}
                  onClick={() => handleSelect(option)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[var(--sloty-text-primary)]">
                      {option.display_name}
                    </span>
                    {idx === 0 ? (
                      <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        {customerCopy.lastUsed}
                      </span>
                    ) : null}
                  </div>
                  {optionPhone ? (
                    <div
                      className="mt-0.5 text-xs font-medium text-[var(--sloty-text-muted)]"
                      dir="ltr"
                    >
                      {optionPhone}
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}
