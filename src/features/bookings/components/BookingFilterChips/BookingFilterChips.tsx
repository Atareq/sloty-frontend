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
        <span
          className="inline-flex items-center gap-2 rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]"
          key={chip.key}
        >
          {chip.label}
          <button
            aria-label={`إزالة فلتر ${chip.label}`}
            className="rounded-full px-1 text-sm leading-none hover:bg-white/70"
            onClick={() => onRemove(chip.key)}
            type="button"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )
}
