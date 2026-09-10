import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { StatusChip } from '../../../../shared/components/StatusChip/StatusChip'
import {
  formatBookingDateTimeRangeWithWeekday,
  getBookingCourtLabel,
  getBookingNotes,
} from '../../bookingDisplay.helpers'
import type { Booking } from '../../bookings.types'

interface BookingListCardProps {
  booking: Booking
  onSelect?: (booking: Booking) => void
}

/** Compact history row; full operational context belongs to BookingActionSheet. */
export function BookingListCard({ booking, onSelect }: BookingListCardProps) {
  const isClickable = Boolean(onSelect)
  const isRecurring = booking.is_recurring
  const notes = getBookingNotes(booking)
  const hasRemainingAmount = Number(booking.remaining_amount) > 0

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
        <div className="flex shrink-0 items-center gap-1.5">
          {hasRemainingAmount ? (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-800">
              متبقي
            </span>
          ) : null}
          <StatusChip status={booking.status} />
        </div>
      </div>

      <p className="text-sm font-bold text-[var(--sloty-primary-dark)]">
        {formatBookingDateTimeRangeWithWeekday(
          booking.start_time,
          booking.end_time,
        )}
      </p>
      <p className="text-sm font-semibold text-[var(--sloty-text-muted)]">
        {getBookingCourtLabel(booking)}
      </p>
      {booking.last_status_changed_by_name ? (
        <p className="text-xs font-semibold text-[var(--sloty-text-muted)]">
          آخر تحديث للحالة بواسطة: {booking.last_status_changed_by_name}
        </p>
      ) : null}

      {notes ? (
        <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
          <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
            ملاحظة
          </p>
          <p className="sloty-booking-card-note mt-1 text-sm font-semibold leading-6 text-[var(--sloty-text-primary)]">
            {notes}
          </p>
        </div>
      ) : null}
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
