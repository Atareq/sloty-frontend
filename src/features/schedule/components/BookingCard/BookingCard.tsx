import type { ScheduleBooking } from '../../schedule.types'

export interface BookingCardProps {
  booking: ScheduleBooking
  onSelect?: (booking: ScheduleBooking) => void
}

const slotClassesByStatus: Record<ScheduleBooking['status'], string> = {
  available:
    'border-[var(--sloty-primary)] bg-white text-[var(--sloty-primary)] shadow-white/30',
  cancelled:
    'border-[var(--sloty-primary)] bg-white text-[var(--sloty-primary)] shadow-white/30',
  confirmed:
    'border-[var(--sloty-success)] bg-[var(--sloty-success)] text-white shadow-emerald-900/20',
  hold: 'border-[var(--sloty-hold)] bg-[var(--sloty-hold)] text-white shadow-amber-900/20',
  completed:
    'border-[var(--sloty-completed)] bg-[var(--sloty-completed)] text-white shadow-blue-900/20',
  expired:
    'border-[var(--sloty-expired)] bg-[var(--sloty-expired)] text-white shadow-gray-900/15',
  noShow:
    'border-[var(--sloty-no-show)] bg-[var(--sloty-no-show)] text-white shadow-red-950/20',
}

const statusLabelByStatus: Record<ScheduleBooking['status'], string> = {
  available: 'متاح',
  cancelled: 'ملغي',
  confirmed: 'مؤكد',
  hold: 'انتظار الدفع',
  completed: 'مكتمل',
  expired: 'منتهي',
  noShow: 'لم يحضر',
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
      aria-label={`${booking.timeStart} - ${booking.timeEnd} ${statusLabelByStatus[booking.status]}`}
      className={[
        'min-h-14 rounded-2xl border-2 px-3 py-3 text-center text-sm font-black shadow-lg transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-[var(--sloty-primary-dark)] sm:min-h-16 md:min-h-20 md:text-base',
        slotClassesByStatus[booking.status],
      ].join(' ')}
      onClick={() => onSelect?.(booking)}
      type="button"
    >
      <span dir="ltr">
        {booking.timeStart} - {booking.timeEnd}
      </span>
    </button>
  )
}
