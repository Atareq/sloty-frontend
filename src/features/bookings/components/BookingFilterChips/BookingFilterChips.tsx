import type { BookingFilterChipKey } from './BookingFilterChips.helpers'

interface BookingFilterChipsProps {
  chips: Array<{ key: BookingFilterChipKey; label: string }>
  onRemove: (key: BookingFilterChipKey) => void
}

export function BookingFilterChips({
  chips,
  onRemove,
}: BookingFilterChipsProps) {
  if (chips.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          aria-label={`إزالة فلتر ${chip.label}`}
          className="
            inline-flex items-center gap-2 rounded-full
            bg-[var(--sloty-soft-mint)]
            px-3 py-1
            text-xs font-black
            text-[var(--sloty-primary-dark)]
            transition
            hover:bg-[var(--sloty-primary)]/15
            focus:outline-none
            focus:ring-2
            focus:ring-[var(--sloty-primary)]/30
          "
          key={chip.key}
          onClick={() => onRemove(chip.key)}
          type="button"
        >
          <span>{chip.label}</span>

          <span
            aria-hidden="true"
            className="text-sm leading-none"
          >
            ×
          </span>
        </button>
      ))}
    </div>
  )
}