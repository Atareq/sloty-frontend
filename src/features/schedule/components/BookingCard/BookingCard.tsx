import type { ScheduleBooking } from '../../schedule.types'
import { formatTime12Hour } from '../../scheduleBoard.helpers'

export interface BookingCardProps {
  booking: ScheduleBooking
  onSelect?: (booking: ScheduleBooking) => void
}

const slotClassesByStatus: Record<ScheduleBooking['status'], string> = {
  available:
  'border-[#22C55E] bg-white text-[var(--sloty-primary-dark)] shadow-white/30 hover:-translate-y-0.5 hover:bg-[var(--sloty-soft-mint)]',
  cancelled:
  'border-[#D1D5DB] bg-[#F3F4F6] text-[var(--sloty-text-muted)] shadow-white/30 hover:-translate-y-0.5 hover:bg-white',
  hold:
  'border-amber-400 bg-amber-100 text-amber-900 shadow-amber-950/10 hover:-translate-y-0.5 hover:bg-amber-50',
  confirmed:
  'sloty-green-surface-button border-[var(--sloty-primary-dark)] text-white shadow-emerald-900/20 hover:-translate-y-0.5 hover:bg-[var(--sloty-primary-dark)]',
  completed:
  'border-slate-400 bg-slate-200 text-slate-700 shadow-slate-950/10',
}

const statusLabelByStatus: Record<ScheduleBooking['status'], string> = {
  available: 'متاح',
  cancelled: 'ملغي',
  hold: 'محجوز مؤقتًا',
  confirmed: 'مؤكد',
  completed: 'مكتمل',
}

/**
 * Real schedule slot button rendered over the decorative court background.
*
* The visual label intentionally shows only the time. Customer names, payment
* amounts, and booking actions belong in the focused sheets opened by status.
*/
export function BookingCard({ booking, onSelect }: BookingCardProps) {
  const displayStartTime = formatTime12Hour(booking.startTime)
  const isActionable = Boolean(onSelect) && booking.status !== 'completed'

  return (
    <button
        aria-label={`${displayStartTime} ${statusLabelByStatus[booking.status]}`}      className={[
        'h-11 w-full max-w-[72px] justify-self-center rounded-xl border-2 px-1 text-center text-xs font-black shadow-lg transition focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-[var(--sloty-primary-dark)] sm:h-12 sm:max-w-[76px] sm:text-sm md:h-14 md:max-w-[96px] md:text-base lg:h-16 lg:max-w-[108px]',
        isActionable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
        slotClassesByStatus[booking.status],
      ].join(' ')}
      disabled={!isActionable}
      onClick={() => {
        if (isActionable) {
          onSelect?.(booking)
        }
      }}
      type="button"
    >
      <span dir="ltr">{displayStartTime}</span>
    </button>
  )
}
