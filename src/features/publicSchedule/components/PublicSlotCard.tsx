import { formatTime12Hour } from '../../schedule/scheduleBoard.helpers'
import type { PublicScheduleSlot } from '../publicSchedule.types'

export interface PublicSlotCardProps {
  slot: PublicScheduleSlot
  onSelect?: (slot: PublicScheduleSlot) => void
}

/**
 * Clean public slot button for the guest court schedule.
 *
 * Exposes only 2 states:
 * - AVAILABLE: clickable button labeled "متاح", triggers login attention on click.
 * - UNAVAILABLE: disabled button labeled "محجوز", completely non-interactive.
 * - UNAVAILABLE: disabled button labeled "غير متاح", completely non-interactive.
 *
 * Strictly sanitized: no customer, payment, or operational booking data.
 */
export function PublicSlotCard({ slot, onSelect }: PublicSlotCardProps) {
  const displayStartTime = formatTime12Hour(slot.startTime)
  const isAvailable = slot.isAvailable
  const label = isAvailable ? 'متاح' : 'غير متاح'
  const accessibleLabel = `${displayStartTime} ${label}`

  return (
    <button
      aria-label={accessibleLabel}
      className={[
        'relative flex min-h-16 w-full max-w-[88px] flex-col items-center justify-center justify-self-center rounded-xl border-2 px-1.5 py-2 text-center font-black shadow-lg transition focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-[var(--sloty-primary-dark)] sm:max-w-[96px] md:min-h-20 md:max-w-[108px]',
        isAvailable
          ? 'cursor-pointer border-[#22C55E] bg-white text-[var(--sloty-primary-dark)] shadow-white/30 hover:-translate-y-0.5 hover:bg-[var(--sloty-soft-mint)]'
          : 'cursor-not-allowed border-slate-300 bg-slate-100 text-[var(--sloty-text-muted)] opacity-70 shadow-slate-950/10',
      ].join(' ')}
      aria-disabled={!isAvailable ? 'true' : undefined}
      disabled={!isAvailable}
      onClick={() => {
        if (isAvailable) {
          onSelect?.(slot)
        }
      }}
      type="button"
    >
      <span className="text-sm md:text-base" dir="ltr">
        {displayStartTime}
      </span>
      <span className="mt-1 text-[10px] leading-tight sm:text-xs">
        {label}
      </span>
    </button>
  )
}

