import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { formatBookingDateTimeRangeWithWeekday } from '../../bookingDisplay.helpers'
import type { Booking } from '../../bookings.types'
import { bookingStatusLabels } from '../../bookings.types'

function statusClassName(status: Booking['status']): string {
  const classes: Record<Booking['status'], string> = {
    HOLD: 'bg-amber-100 text-amber-800',
    CONFIRMED: 'bg-emerald-100 text-emerald-800',
    COMPLETED: 'bg-sky-100 text-sky-800',
    CANCELLED: 'bg-red-100 text-red-800',
    NO_SHOW: 'bg-rose-100 text-rose-900',
    EXPIRED: 'bg-slate-100 text-slate-700',
  }

  return classes[status]
}

interface BookingListCardProps {
  booking: Booking
  onSelect?: (booking: Booking) => void
}

/** Compact history row; full operational context belongs to BookingActionSheet. */
export function BookingListCard({ booking, onSelect }: BookingListCardProps) {
  const isClickable = Boolean(onSelect)
  const isRecurring = booking.is_recurring

  const content = (
    <AppCard className="h-full space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-black text-[var(--sloty-text-primary)]">
              {booking.customer_name || 'عميل بدون اسم'}
            </p>
            {isRecurring ? (
              <span
                aria-label="حجز أسبوعي"
                className="shrink-0 text-sm font-black text-[var(--sloty-primary-dark)]"
                role="img"
              >
                ↻
              </span>
            ) : null}
          </div>
          <p
            className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]"
            dir={booking.customer_phone ? 'ltr' : undefined}
          >
            {booking.customer_phone || 'بدون رقم هاتف'}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusClassName(
            booking.status,
          )}`}
        >
          {bookingStatusLabels[booking.status]}
        </span>
      </div>

      <p className="text-sm font-black text-[var(--sloty-primary-dark)]">
        {formatBookingDateTimeRangeWithWeekday(
          booking.start_time,
          booking.end_time,
        )}
      </p>
    </AppCard>
  )

  if (isClickable && onSelect) {
    return (
      <button
        aria-label={`مراجعة حجز ${booking.customer_name || 'العميل'}`}
        className="block h-full w-full rounded-2xl text-right transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/30"
        onClick={() => onSelect(booking)}
        type="button"
      >
        {content}
      </button>
    )
  }

  return content
}
