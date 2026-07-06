import { useState } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import type { ScheduleBooking } from '../../schedule.types'
import type { BookingListItem } from '../../scheduleApi.types'

export interface BookingDetailsSheetProps {
  booking: BookingListItem | undefined
  courtName: string
  dateLabel: string
  error: string | null
  isSubmitting: boolean
  slot: ScheduleBooking
  onCancel: (bookingId: number | string) => Promise<void>
  onClose: () => void
}

const statusLabelByStatus: Record<BookingListItem['status'], string> = {
  HOLD: 'انتظار',
  CONFIRMED: 'مؤكد',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغي',
  NO_SHOW: 'لم يحضر',
  EXPIRED: 'منتهي',
}

/**
 * Details sheet for confirmed Booking Board slots.
 *
 * Sprint 3C exposes only booking details and cancellation. Payments and later
 * lifecycle actions stay out of this focused modal.
 */
export function BookingDetailsSheet({
  booking,
  courtName,
  dateLabel,
  error,
  isSubmitting,
  onCancel,
  onClose,
  slot,
}: BookingDetailsSheetProps) {
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false)

  async function handleCancelClick(): Promise<void> {
    if (!booking) {
      return
    }

    if (!isConfirmingCancel) {
      setIsConfirmingCancel(true)
      return
    }

    await onCancel(booking.id)
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-0 md:items-center md:justify-center md:p-6"
      role="dialog"
    >
      <div className="w-full rounded-t-3xl bg-[var(--sloty-surface)] p-5 shadow-2xl md:max-w-md md:rounded-3xl">
        <div className="space-y-2">
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            تفاصيل الحجز
          </p>
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            حجز مؤكد
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            {courtName} - {dateLabel}
          </p>
          <p
            className="text-lg font-black text-[var(--sloty-primary-dark)]"
            dir="ltr"
          >
            {slot.startTime} - {slot.endTime}
          </p>
        </div>

        {booking ? (
          <dl className="mt-5 grid grid-cols-1 gap-3 text-sm">
            <div className="rounded-2xl bg-[var(--sloty-bg)] p-3">
              <dt className="font-bold text-[var(--sloty-text-muted)]">
                اسم العميل
              </dt>
              <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                {booking.customer_name || 'غير متوفر'}
              </dd>
            </div>
            <div className="rounded-2xl bg-[var(--sloty-bg)] p-3">
              <dt className="font-bold text-[var(--sloty-text-muted)]">
                رقم الهاتف
              </dt>
              <dd
                className="mt-1 font-black text-[var(--sloty-text-primary)]"
                dir="ltr"
              >
                {booking.customer_phone || 'غير متوفر'}
              </dd>
            </div>
            <div className="rounded-2xl bg-[var(--sloty-bg)] p-3">
              <dt className="font-bold text-[var(--sloty-text-muted)]">
                الحالة
              </dt>
              <dd className="mt-1 font-black text-[var(--sloty-primary-dark)]">
                {statusLabelByStatus[booking.status]}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-5 rounded-2xl bg-[var(--sloty-bg)] p-4 text-sm font-bold text-[var(--sloty-text-muted)]">
            لا توجد تفاصيل كافية لهذا الحجز
          </p>
        )}

        {isConfirmingCancel && booking ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            سيتم إلغاء هذا الحجز بعد التأكيد.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {booking ? (
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={handleCancelClick}
              type="button"
              variant="danger"
            >
              {isConfirmingCancel ? 'تأكيد إلغاء الحجز' : 'إلغاء الحجز'}
            </AppButton>
          ) : null}
          <AppButton
            disabled={isSubmitting}
            fullWidth
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            إغلاق
          </AppButton>
        </div>
      </div>
    </div>
  )
}
