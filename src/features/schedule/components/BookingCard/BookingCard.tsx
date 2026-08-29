import type { ScheduleBooking } from '../../schedule.types'
import { formatTime12Hour } from '../../scheduleBoard.helpers'
import {
  getScheduleSlotPresentation,
  type ScheduleSlotTone,
} from './bookingCard.helpers'

export interface BookingCardProps {
  booking: ScheduleBooking
  onSelect?: (booking: ScheduleBooking) => void
}

const slotClassesByTone: Record<ScheduleSlotTone, string> = {
  available:
    'border-[#22C55E] bg-white text-[var(--sloty-primary-dark)] shadow-white/30 hover:-translate-y-0.5 hover:bg-[var(--sloty-soft-mint)]',
  unavailable:
    'border-slate-300 bg-slate-100 text-[var(--sloty-text-muted)] shadow-slate-950/10',
  reserved:
    'sloty-green-surface-button border-[var(--sloty-primary-dark)] text-white shadow-emerald-900/20 hover:-translate-y-0.5 hover:bg-[var(--sloty-primary-dark)]',
  cancelled:
    'border-[#D1D5DB] bg-[#F3F4F6] text-[var(--sloty-text-muted)] shadow-white/30 hover:-translate-y-0.5 hover:bg-white',
  hold:
    'border-amber-400 bg-amber-100 text-amber-900 shadow-amber-950/10 hover:-translate-y-0.5 hover:bg-amber-50',
  confirmed:
    'sloty-green-surface-button border-[var(--sloty-primary-dark)] text-white shadow-emerald-900/20 hover:-translate-y-0.5 hover:bg-[var(--sloty-primary-dark)]',
  completed:
    'border-slate-400 bg-slate-200 text-slate-700 shadow-slate-950/10',
  no_show:
    'border-rose-300 bg-rose-100 text-rose-900 shadow-rose-950/10',
}

/**
 * Real schedule slot button rendered over the decorative court background.
 *
 * It stays intentionally minimal: time, human status, and an icon for an
 * existing recurring booking or a free slot eligible for weekly recurrence.
 * Customer and money details stay in task sheets.
 */
export function BookingCard({ booking, onSelect }: BookingCardProps) {
  const displayStartTime = formatTime12Hour(booking.startTime)
  const presentation = getScheduleSlotPresentation(booking)
  const isActionable = presentation.isClickable && Boolean(onSelect)
  const canStartRecurring =
    booking.status === 'available' && booking.canStartRecurring === true
  const accessibleLabel = [
    displayStartTime,
    presentation.label,
    booking.booking?.is_recurring ? 'حجز متكرر' : null,
    canStartRecurring ? 'متاح للتثبيت أسبوعيًا' : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      aria-label={accessibleLabel}
      className={[
        'relative flex min-h-16 w-full max-w-[88px] flex-col items-center justify-center justify-self-center rounded-xl border-2 px-1.5 py-2 text-center font-black shadow-lg transition focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-[var(--sloty-primary-dark)] sm:max-w-[96px] md:min-h-20 md:max-w-[108px]',
        isActionable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
        slotClassesByTone[presentation.tone],
      ].join(' ')}
      disabled={!isActionable}
      onClick={() => {
        if (isActionable) {
          onSelect?.(booking)
        }
      }}
      type="button"
    >
      {presentation.showRecurringIcon ? (
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-1 text-xs leading-none"
        >
          ↻
        </span>
      ) : null}
      <span className="text-sm md:text-base" dir="ltr">
        {displayStartTime}
      </span>
      <span className="mt-1 text-[10px] leading-tight sm:text-xs">
        {presentation.label}
      </span>
    </button>
  )
}
