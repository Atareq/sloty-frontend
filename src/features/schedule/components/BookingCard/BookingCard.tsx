import type { ScheduleBooking } from '../../schedule.types'

export interface BookingCardProps {
  booking: ScheduleBooking
  onSelect?: (booking: ScheduleBooking) => void
}

const slotClassesByStatus: Record<ScheduleBooking['status'], string> = {
  available:
    'border-[#22C55E] bg-white text-[var(--sloty-primary-dark)] shadow-white/30',
  cancelled:
    'border-[#D1D5DB] bg-[#F3F4F6] text-[var(--sloty-text-muted)] shadow-white/30',
  confirmed:
    'sloty-green-surface-button border-[var(--sloty-primary-dark)] text-white shadow-emerald-900/20',
}

const statusLabelByStatus: Record<ScheduleBooking['status'], string> = {
  available: 'متاح',
  cancelled: 'ملغي',
  confirmed: 'مؤكد',
}

/**
 * Real schedule slot button rendered over the decorative court background.
 *
 * The visual label intentionally shows only the time. Customer names, payment
 * amounts, and booking details belong in a future details sheet/modal.
 */
export function BookingCard({ booking, onSelect }: BookingCardProps) {
  return (
    <button
      aria-label={`${booking.startTime} ${statusLabelByStatus[booking.status]}`}
      className={[
        'h-11 w-full max-w-[72px] justify-self-center rounded-xl border-2 px-1 text-center text-xs font-black shadow-lg transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-[var(--sloty-primary-dark)] sm:h-12 sm:max-w-[76px] sm:text-sm md:h-14 md:max-w-[96px] md:text-base lg:h-16 lg:max-w-[108px]',
        slotClassesByStatus[booking.status],
      ].join(' ')}
      onClick={() => onSelect?.(booking)}
      type="button"
    >
      <span dir="ltr">{booking.startTime}</span>
    </button>
  )
}
