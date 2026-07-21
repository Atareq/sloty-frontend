import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type { Booking } from '../../bookings.types'
import { bookingStatusLabels } from '../../bookings.types'

function getOptionalBookingField(
  booking: Booking,
  key: string,
): string | number | null {
  const value = (booking as unknown as Record<string, unknown>)[key]

  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  return null
}

function getCourtLabel(booking: Booking): string {
  const courtName = getOptionalBookingField(booking, 'court_name')

  if (courtName) {
    return String(courtName)
  }

  return `ملعب #${booking.court}`
}

function formatDateTimeRange(startTime: string, endTime: string): string {
  const startDate = new Date(startTime)
  const endDate = new Date(endTime)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${startTime} - ${endTime}`
  }

  const date = new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
  }).format(startDate)
  const start = new Intl.DateTimeFormat('ar-EG', {
    timeStyle: 'short',
  }).format(startDate)
  const end = new Intl.DateTimeFormat('ar-EG', {
    timeStyle: 'short',
  }).format(endDate)

  return `${date}، ${start} - ${end}`
}

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

function hasRemainingAmount(booking: Booking): boolean {
  const remaining = Number(booking.remaining_amount ?? 0)

  return Number.isFinite(remaining) && remaining > 0
}

interface BookingListCardProps {
  booking: Booking
}

export function BookingListCard({ booking }: BookingListCardProps) {
  const totalAmount = booking.total_price ?? getOptionalBookingField(booking, 'total_amount')
  const notes = getOptionalBookingField(booking, 'notes')
  const created = getOptionalBookingField(booking, 'created')
  const showsFinancialWarning =
    booking.status === 'COMPLETED' && hasRemainingAmount(booking)

  return (
    <AppCard className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
            الحجز
          </p>
          <p className="mt-1 text-xl font-black text-[var(--sloty-primary-dark)]">
            #{booking.id}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${statusClassName(
            booking.status,
          )}`}
        >
          {bookingStatusLabels[booking.status]}
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
          <dt className="font-bold text-[var(--sloty-text-muted)]">العميل</dt>
          <dd className="font-black text-[var(--sloty-text-primary)]">
            {booking.customer_name || '-'}
          </dd>
        </div>

        {booking.customer_phone ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
            <dt className="font-bold text-[var(--sloty-text-muted)]">الهاتف</dt>
            <dd className="font-black text-[var(--sloty-text-primary)]" dir="ltr">
              {booking.customer_phone}
            </dd>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
          <dt className="font-bold text-[var(--sloty-text-muted)]">الملعب</dt>
          <dd className="font-black text-[var(--sloty-text-primary)]">
            {getCourtLabel(booking)}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
          <dt className="font-bold text-[var(--sloty-text-muted)]">الوقت</dt>
          <dd className="font-black text-[var(--sloty-text-primary)]">
            {formatDateTimeRange(booking.start_time, booking.end_time)}
          </dd>
        </div>

        {totalAmount ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
            <dt className="font-bold text-[var(--sloty-text-muted)]">الإجمالي</dt>
            <dd className="font-black text-[var(--sloty-text-primary)]" dir="ltr">
              {formatMoneyAmount(totalAmount)}
            </dd>
          </div>
        ) : null}

        {booking.paid_amount ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
            <dt className="font-bold text-[var(--sloty-text-muted)]">المدفوع</dt>
            <dd className="font-black text-[var(--sloty-text-primary)]" dir="ltr">
              {formatMoneyAmount(booking.paid_amount)}
            </dd>
          </div>
        ) : null}

        {booking.remaining_amount ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
            <dt className="font-bold text-[var(--sloty-text-muted)]">المتبقي</dt>
            <dd className="font-black text-[var(--sloty-text-primary)]" dir="ltr">
              {formatMoneyAmount(booking.remaining_amount)}
            </dd>
          </div>
        ) : null}

        {created ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
            <dt className="font-bold text-[var(--sloty-text-muted)]">أُنشئ</dt>
            <dd className="font-black text-[var(--sloty-text-primary)]">
              {String(created)}
            </dd>
          </div>
        ) : null}
      </dl>

      {notes ? (
        <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
          {String(notes)}
        </p>
      ) : null}

      {showsFinancialWarning ? (
        <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-black text-amber-900">
          حجز مكتمل به مبلغ متبقي — يحتاج مراجعة
        </p>
      ) : null}
    </AppCard>
  )
}
