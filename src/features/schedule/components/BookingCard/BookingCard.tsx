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
    'border-[var(--sloty-primary-dark)] bg-[var(--sloty-primary)] text-white shadow-emerald-900/20',
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
        'h-12 w-[76px] max-w-[108px] rounded-2xl border-2 px-2 text-center text-sm font-black shadow-lg transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-[var(--sloty-primary-dark)] sm:h-14 sm:w-20 md:h-16 md:w-24 md:text-base lg:w-[104px]',
        slotClassesByStatus[booking.status],
      ].join(' ')}
      onClick={() => onSelect?.(booking)}
      type="button"
    >
      <span dir="ltr">{booking.startTime}</span>
    </button>
  )
}
