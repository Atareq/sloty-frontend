import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import type { ScheduleBooking } from '../../schedule.types'
import type { BookingListItem } from '../../scheduleApi.types'
import { formatTime12Hour } from '../../scheduleBoard.helpers'

export interface HoldBookingActionSheetProps {
  booking: BookingListItem
  courtName: string
  dateLabel: string
  slot: ScheduleBooking
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onAddPayment: (booking: BookingListItem) => void
  onFreeSlot: (booking: BookingListItem) => void
}

/**
 * Focused next-step sheet for HOLD bookings.
 *
 * A HOLD blocks the board but is not confirmed yet, so users either record a
 * payment through the existing payment form or free the slot through cancel.
 */
export function HoldBookingActionSheet({
  booking,
  courtName,
  dateLabel,
  error,
  isSubmitting,
  onAddPayment,
  onClose,
  onFreeSlot,
  slot,
}: HoldBookingActionSheetProps) {
  const displayStartTime = formatTime12Hour(slot.startTime)
  const displayEndTime = formatTime12Hour(slot.endTime)
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-0 md:items-center md:justify-center md:p-6"
      role="dialog"
    >
      <div className="w-full rounded-t-3xl bg-[var(--sloty-surface)] p-5 shadow-2xl md:max-w-md md:rounded-3xl">
        <div className="space-y-2">
          <p className="text-sm font-bold text-amber-800">بانتظار العربون</p>
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            بانتظار العربون
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            هذا الموعد محجوز بانتظار العربون. يمكنك تسجيل دفعة لتأكيد الحجز أو
            تحرير الموعد.
          </p>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            {courtName} - {dateLabel}
          </p>
          <p
            className="text-lg font-black text-amber-900"
            dir="ltr"
          >
            {displayStartTime} - {displayEndTime}
          </p>
        </div>

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
          <div className="rounded-2xl bg-amber-50 p-3">
            <dt className="font-bold text-amber-800">الحالة</dt>
            <dd className="mt-1 inline-flex rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
              بانتظار العربون
            </dd>
          </div>
        </dl>

        {error ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppButton
            disabled={isSubmitting}
            fullWidth
            onClick={() => onAddPayment(booking)}
            type="button"
            variant="primary"
          >
            إضافة دفعة
          </AppButton>
          <AppButton
            disabled={isSubmitting}
            fullWidth
            onClick={() => onFreeSlot(booking)}
            type="button"
            variant="danger"
          >
            {isSubmitting ? 'جاري التحرير...' : 'تحرير الموعد'}
          </AppButton>
          <AppButton
            className="sm:col-span-2"
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
