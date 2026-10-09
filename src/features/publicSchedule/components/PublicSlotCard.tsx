import { forwardRef } from 'react'
import { formatTime12Hour } from '../../schedule/scheduleBoard.helpers'
import type { PublicScheduleSlot } from '../publicSchedule.types'

export interface PublicSlotCardProps {
  slot: PublicScheduleSlot
  /**
   * Phase 6 navigation context: highlights the slot that the visitor clicked
   * from discovery without changing its availability status or auto-activating it.
   */
  isHandoffTarget?: boolean
  onSelect?: (slot: PublicScheduleSlot) => void
}

const HANDOFF_TARGET_CONTEXT_LABEL = 'الميعاد اللي اخترته'

/**
 * Clean public slot button for the guest court schedule.
 *
 * Exposes only 2 states:
 * - AVAILABLE: clickable button labeled "متاح", triggers visitor guidance on click.
 * - UNAVAILABLE: disabled button labeled "غير متاح", completely non-interactive.
 *
 * Strictly sanitized: no customer, payment, or operational booking data.
 */
export const PublicSlotCard = forwardRef<
  HTMLButtonElement,
  PublicSlotCardProps
>(function PublicSlotCard(
  { slot, isHandoffTarget = false, onSelect },
  ref,
) {
  const displayStartTime = formatTime12Hour(slot.startTime)
  const isAvailable = slot.isAvailable
  const label = isAvailable ? 'متاح' : 'غير متاح'
  const accessibleLabel = isHandoffTarget
    ? `${HANDOFF_TARGET_CONTEXT_LABEL} · ${displayStartTime} ${label}`
    : `${displayStartTime} ${label}`

  return (
    <button
      aria-disabled={!isAvailable ? 'true' : undefined}
      aria-label={accessibleLabel}
      className={[
        'relative flex min-h-16 w-full max-w-[88px] flex-col items-center justify-center justify-self-center rounded-xl border-2 px-1.5 py-2 text-center font-black shadow-lg transition focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-[var(--sloty-primary-dark)] sm:max-w-[96px] md:min-h-20 md:max-w-[108px]',
        isAvailable
          ? 'cursor-pointer border-[#22C55E] bg-white text-[var(--sloty-primary-dark)] shadow-white/30 hover:-translate-y-0.5 hover:bg-[var(--sloty-soft-mint)]'
          : 'cursor-not-allowed border-slate-300 bg-slate-100 text-[var(--sloty-text-muted)] opacity-70 shadow-slate-950/10',
        isHandoffTarget
          ? 'ring-2 ring-[var(--sloty-primary)] ring-offset-2 ring-offset-[var(--sloty-soft-mint)]'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-handoff-target={isHandoffTarget ? 'true' : undefined}
      data-testid={`public-slot-${slot.startTime}`}
      disabled={!isAvailable}
      onClick={() => {
        if (isAvailable) {
          onSelect?.(slot)
        }
      }}
      ref={ref}
      type="button"
    >
      {isHandoffTarget ? (
        <span className="sr-only">{HANDOFF_TARGET_CONTEXT_LABEL}</span>
      ) : null}
      <span className="text-sm md:text-base" dir="ltr">
        {displayStartTime}
      </span>
      <span className="mt-1 text-[10px] leading-tight sm:text-xs">
        {label}
      </span>
    </button>
  )
})
