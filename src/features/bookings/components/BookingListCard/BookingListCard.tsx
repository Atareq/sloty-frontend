import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { StatusChip } from '../../../../shared/components/StatusChip/StatusChip'
import { formatBookingDateTimeRangeWithWeekday } from '../../bookingDisplay.helpers'
import type { Booking } from '../../bookings.types'

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
            <p className="truncate text-base font-bold text-[var(--sloty-text-primary)]">
              {booking.customer_name || 'عميل بدون اسم'}
            </p>
            {isRecurring ? (
              <span
                aria-label="حجز أسبوعي"
                className="shrink-0 text-sm font-semibold text-[var(--sloty-primary-dark)]"
                role="img"
              >
                ↻
              </span>
            ) : null}
          </div>
          <p
            className="mt-1 text-sm font-medium text-[var(--sloty-text-muted)]"
            dir={booking.customer_phone ? 'ltr' : undefined}
          >
            {booking.customer_phone || 'بدون رقم موبايل'}
          </p>
        </div>
        <StatusChip status={booking.status} />
      </div>

      <p className="text-sm font-bold text-[var(--sloty-primary-dark)]">
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
