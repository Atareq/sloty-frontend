import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { customerCopy } from '../../../../shared/copy/appCopy'
import { listClubPlayers } from '../../playersApi'
import { getClubPlayerPhone } from '../../players.types'
import type { ClubPlayer } from '../../players.types'

export interface PlayerComboboxProps {
  clubSlug?: string | null
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
 * Searchable player name combobox with free-text typing.
 *
 * Allows selecting previously used player identities ordered by last booking usage,
 * live-searching by player name, or freely typing a brand-new custom name.
 * Free text is always valid; player selection from dropdown is never forced.
 */
export function PlayerCombobox({
  ariaLabel = customerCopy.playerName,
  clubSlug,
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
  const [nameSearchResults, setNameSearchResults] = useState<
    ClubPlayer[] | null
  >(null)
  const [isSearchingName, setIsSearchingName] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<number | null>(null)
  const prevPlayerOptionsRef = useRef(playerOptions)

  // When playerOptions from parent change, reset local name-search results
  useEffect(() => {
    if (prevPlayerOptionsRef.current !== playerOptions) {
      prevPlayerOptionsRef.current = playerOptions
      setNameSearchResults(null)
    }
  }, [playerOptions])

  // Use name-search results when user typed a name search; otherwise use props playerOptions (from phone lookup)
  const displayedOptions = nameSearchResults ?? playerOptions
  const activeLoading = isLoading || isSearchingName

  // Close dropdown on click outside
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

  // Clear pending debounce timers on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const triggerNameSearch = useCallback(
    (query: string) => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current)
      }

      const trimmed = query.trim()
      if (!clubSlug || !trimmed) {
        setNameSearchResults(null)
        setIsSearchingName(false)
        return
      }

      setIsSearchingName(true)
      searchTimeoutRef.current = window.setTimeout(async () => {
        try {
          const results = await listClubPlayers(clubSlug, {
            search: trimmed,
            order_by: '-last_used_at',
          })
          setNameSearchResults(results)
        } catch {
          setNameSearchResults([])
        } finally {
          setIsSearchingName(false)
        }
      }, 300)
    },
    [clubSlug],
  )

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value
    onChange(nextValue)
    setIsOpen(true)
    setActiveIndex(-1)
    triggerNameSearch(nextValue)
  }

  function handleSelect(player: ClubPlayer) {
    onChange(player.display_name)
    onSelectPlayer?.(player)
    setIsOpen(false)
    setActiveIndex(-1)
    setNameSearchResults(null)
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        if (displayedOptions.length > 0) {
          setActiveIndex(0)
        }
      } else if (displayedOptions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % displayedOptions.length)
      }
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        if (displayedOptions.length > 0) {
          setActiveIndex(displayedOptions.length - 1)
        }
      } else if (displayedOptions.length > 0) {
        setActiveIndex((prev) =>
          prev <= 0 ? displayedOptions.length - 1 : prev - 1,
        )
      }
      return
    }

    if (event.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && displayedOptions[activeIndex]) {
        event.preventDefault()
        handleSelect(displayedOptions[activeIndex])
      }
      return
    }

    if (event.key === 'Escape') {
      if (isOpen) {
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
    if (disabled) {
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
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={
            isOpen && activeIndex >= 0 && displayedOptions[activeIndex]
              ? `${listboxId}-opt-${displayedOptions[activeIndex].id}`
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
            if (displayedOptions.length > 0) {
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
          {activeLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--sloty-primary)]" />
          ) : (
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-150 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>
      </div>

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--sloty-border)] bg-white p-1 shadow-lg"
        >
          {activeLoading && displayedOptions.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-[var(--sloty-text-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--sloty-primary)]" />
              <span>{customerCopy.searching}</span>
            </div>
          ) : displayedOptions.length === 0 ? (
            <div className="p-3 text-center text-xs font-bold text-[var(--sloty-text-muted)]">
              {customerCopy.noSavedPlayers}
            </div>
          ) : (
            displayedOptions.map((option, idx) => {
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
                    // Prevent blur before click completes
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
