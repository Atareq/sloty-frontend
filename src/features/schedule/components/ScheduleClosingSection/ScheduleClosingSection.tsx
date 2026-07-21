import { Link } from 'react-router'
import { buildPathWithQuery } from '../../../../shared/utils/buildPathWithQuery'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import {
  bookingStatusLabels,
  formatBookingDateTimeRangeWithWeekday,
  getBookingCourtLabel,
  hasRemainingAmount,
} from '../../../bookings/bookingDisplay.helpers'
import type { BookingListItem } from '../../scheduleApi.types'
import { isPastSlot } from '../../scheduleBoard.helpers'

export interface ScheduleClosingSectionProps {
  bookings: BookingListItem[]
  totalCount: number
  selectedDate: string
  onSelectBooking: (booking: BookingListItem) => void
}

/**
 * Compact same-day operational review list for bookings needing closure.
 *
 * It intentionally lists booking records only. Empty generated slots stay out
 * of this section and the main board remains availability-focused.
 */
export function ScheduleClosingSection({
  bookings,
  onSelectBooking,
  selectedDate,
  totalCount,
}: ScheduleClosingSectionProps) {
  if (totalCount === 0) {
    return null
  }

  return (
    <section className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-3 shadow-[var(--sloty-shadow)] sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
            حجوزات تحتاج إغلاق
          </h2>
          <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
            حجوزات اليوم التي تحتاج دفع أو إكمال
          </p>
        </div>
        <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
          {totalCount} حجز
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        {bookings.map((booking) => {
          const isConfirmedEnded =
            booking.status === 'CONFIRMED' &&
            isPastSlot(selectedDate, booking.end_time)

          return (
            <button
              className="w-full rounded-2xl border border-[var(--sloty-border)] bg-white px-3 py-3 text-right transition hover:border-amber-300 hover:bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-300"
              key={booking.id}
              onClick={() => onSelectBooking(booking)}
              type="button"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-black text-[var(--sloty-text-primary)]">
                    {booking.customer_name || 'عميل بدون اسم'}
                  </p>
                  <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                    {formatBookingDateTimeRangeWithWeekday(
                      booking.start_time,
                      booking.end_time,
                      selectedDate,
                    )}
                  </p>
                  <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                    {getBookingCourtLabel(booking)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    {bookingStatusLabels[booking.status]}
                  </span>
                  {hasRemainingAmount(booking) ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                      متبقي {formatMoneyAmount(booking.remaining_amount)}
                    </span>
                  ) : null}
                  {isConfirmedEnded ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                      انتهت ولم تكتمل
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-xs font-bold text-amber-800">
                اضغط للمراجعة
              </p>
            </button>
          )
        })}
      </div>

      {totalCount > bookings.length ? (
        <Link
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-black text-amber-900 transition hover:bg-amber-50"
          to={buildPathWithQuery('/bookings', {
            date: selectedDate,
            needs_action: true,
          })}
        >
          عرض كل الحجوزات التي تحتاج إغلاق
        </Link>
      ) : null}
    </section>
  )
}
