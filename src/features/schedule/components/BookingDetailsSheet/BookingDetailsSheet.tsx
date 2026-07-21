import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import type { ScheduleBooking } from '../../schedule.types'
import type { BookingListItem } from '../../scheduleApi.types'
import { formatTime12Hour } from '../../scheduleBoard.helpers'

export interface BookingDetailsSheetProps {
  booking: BookingListItem | undefined
  courtName: string
  dateLabel: string
  error: string | null
  isSubmitting: boolean
  slot: ScheduleBooking
  onAddPayment?: (booking: BookingListItem) => void
  onClose: () => void
  onRequestCancel: (booking: BookingListItem) => void
  onRequestComplete: (booking: BookingListItem) => void
  onRequestNoShow: (booking: BookingListItem) => void
}

const statusLabelByStatus: Record<BookingListItem['status'], string> = {
  HOLD: 'محجوز مؤقتًا',
  CONFIRMED: 'مؤكد',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغي',
  NO_SHOW: 'لم يحضر',
  EXPIRED: 'منتهي',
}

/**
 * Details sheet for confirmed Booking Board slots.
 *
 * It keeps slot buttons free from financial details while confirmed booking
 * lifecycle actions stay inside the details workflow.
 */
export function BookingDetailsSheet({
  booking,
  courtName,
  dateLabel,
  error,
  isSubmitting,
  onAddPayment,
  onClose,
  onRequestCancel,
  onRequestComplete,
  onRequestNoShow,
  slot,
}: BookingDetailsSheetProps) {
  const shouldShowActions = booking?.status === 'CONFIRMED'
  const lockedMessageByStatus: Partial<Record<BookingListItem['status'], string>> = {
    COMPLETED: 'هذا الحجز مكتمل ولا يمكن تعديله',
    CANCELLED: 'هذا الحجز ملغي ولا يؤثر على توفر الموعد',
    NO_SHOW: 'تم تسجيل هذا الحجز كعدم حضور',
    EXPIRED: 'انتهت صلاحية هذا الحجز',
    HOLD: 'هذا الحجز في انتظار التأكيد',
  }
  const lockedMessage = booking ? lockedMessageByStatus[booking.status] : null
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
            {displayStartTime} - {displayEndTime}
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

        {lockedMessage ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            {lockedMessage}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shouldShowActions && booking && onAddPayment ? (
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={() => onAddPayment(booking)}
              type="button"
              variant="primary"
            >
              إضافة دفعة
            </AppButton>
          ) : null}
          {shouldShowActions ? (
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={() => booking && onRequestComplete(booking)}
              type="button"
              variant="primary"
            >
              إكمال الحجز
            </AppButton>
          ) : null}
          {shouldShowActions ? (
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={() => booking && onRequestNoShow(booking)}
              type="button"
              variant="secondary"
            >
              تسجيل عدم حضور
            </AppButton>
          ) : null}
          {shouldShowActions ? (
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={() => booking && onRequestCancel(booking)}
              type="button"
              variant="danger"
            >
              إلغاء الحجز
            </AppButton>
          ) : null}
          {shouldShowActions ? (
            <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)] sm:col-span-2">
              تغيير الموعد سيتم إضافته بعد اعتماد واجهة الخلفية
            </p>
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
