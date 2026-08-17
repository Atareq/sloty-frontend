import { Link } from 'react-router'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type { BookingListItem } from '../../../schedule/scheduleApi.types'
import {
  bookingStatusLabels,
  canBookingAddPayment,
  canBookingCancel,
  canBookingComplete,
  canBookingFreeHold,
  canBookingNoShow,
  formatBookingDateTimeRangeWithWeekday,
  getBookingCourtLabel,
  getBookingDateFallback,
  getBookingNotes,
  hasRemainingAmount,
  isBookingReadOnlyStatus,
} from '../../bookingDisplay.helpers'

export interface BookingActionSheetProps {
  booking: BookingListItem | null
  isOpen: boolean
  isSubmitting?: boolean
  error?: string | null
  courtName?: string | null
  dateValue?: string | null
  onClose: () => void
  onAddPayment?: (booking: BookingListItem) => void
  onComplete?: (booking: BookingListItem) => void
  onNoShow?: (booking: BookingListItem) => void
  onCancel?: (booking: BookingListItem) => void
  onFreeHold?: (booking: BookingListItem) => void
}

function getReadOnlyMessage(booking: BookingListItem): string | null {
  const messages: Partial<Record<BookingListItem['status'], string>> = {
    COMPLETED: 'هذا الحجز مكتمل ومغلق للعرض فقط',
    CANCELLED: 'هذا الحجز ملغي للعرض فقط',
    NO_SHOW: 'تم تسجيل هذا الحجز كعدم حضور للعرض فقط',
    EXPIRED: 'انتهت صلاحية هذا الحجز للعرض فقط',
  }

  return messages[booking.status] ?? null
}

/**
 * Reusable booking action/details sheet.
 *
 * API mutations still live in the calling page for now. This component only
 * presents one consistent action entry point for existing bookings.
 */
export function BookingActionSheet({
  booking,
  courtName,
  dateValue,
  error = null,
  isOpen,
  isSubmitting = false,
  onAddPayment,
  onCancel,
  onClose,
  onComplete,
  onFreeHold,
  onNoShow,
}: BookingActionSheetProps) {
  if (!isOpen) {
    return null
  }

  const fallbackDate = dateValue ?? (booking ? getBookingDateFallback(booking) : null)
  const readOnlyMessage = booking ? getReadOnlyMessage(booking) : null
  const notes = booking ? getBookingNotes(booking) : null
  const recurringAgreementId = booking?.recurring_agreement_id
  const isRecurringBooking =
    booking?.is_recurring || booking?.source === 'RECURRING'

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
            {booking ? `حجز ${bookingStatusLabels[booking.status]}` : 'تفاصيل الحجز'}
          </h2>
          {booking ? (
            <>
              <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
                {getBookingCourtLabel(booking, courtName)}
              </p>
              <p className="text-lg font-black text-[var(--sloty-primary-dark)]">
                {formatBookingDateTimeRangeWithWeekday(
                  booking.start_time,
                  booking.end_time,
                  fallbackDate,
                )}
              </p>
            </>
          ) : null}
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
            {booking.customer_phone ? (
              <div className="rounded-2xl bg-[var(--sloty-bg)] p-3">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  رقم الهاتف
                </dt>
                <dd
                  className="mt-1 font-black text-[var(--sloty-text-primary)]"
                  dir="ltr"
                >
                  {booking.customer_phone}
                </dd>
              </div>
            ) : null}
            {isRecurringBooking ? (
              <div className="rounded-2xl bg-[var(--sloty-soft-mint)] p-3">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  نوع الحجز
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-primary-dark)]">
                  حجز أسبوعي
                </dd>
              </div>
            ) : null}
            <div className="rounded-2xl bg-[var(--sloty-bg)] p-3">
              <dt className="font-bold text-[var(--sloty-text-muted)]">
                الحالة
              </dt>
              <dd className="mt-1 font-black text-[var(--sloty-primary-dark)]">
                {bookingStatusLabels[booking.status]}
              </dd>
            </div>
            {booking.paid_amount ? (
              <div className="rounded-2xl bg-[var(--sloty-bg)] p-3">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  المدفوع
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]" dir="ltr">
                  {formatMoneyAmount(booking.paid_amount)}
                </dd>
              </div>
            ) : null}
            {booking.remaining_amount ? (
              <div className="rounded-2xl bg-[var(--sloty-bg)] p-3">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  المتبقي
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]" dir="ltr">
                  {formatMoneyAmount(booking.remaining_amount)}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-5 rounded-2xl bg-[var(--sloty-bg)] p-4 text-sm font-bold text-[var(--sloty-text-muted)]">
            لا توجد تفاصيل كافية لهذا الحجز
          </p>
        )}

        {booking && booking.status === 'COMPLETED' && hasRemainingAmount(booking) ? (
          <p className="mt-4 rounded-xl bg-amber-100 px-3 py-2 text-sm font-black text-amber-900">
            حجز مكتمل به مبلغ متبقي — يحتاج مراجعة مالية
          </p>
        ) : null}

        {notes ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
            {notes}
          </p>
        ) : null}

        {readOnlyMessage ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            {readOnlyMessage}
          </p>
        ) : null}

        {booking?.status === 'CONFIRMED' ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
            تغيير الموعد سيتم إضافته بعد اعتماد واجهة الخلفية
          </p>
        ) : null}

        {recurringAgreementId ? (
          <Link
            className="mt-4 block rounded-xl bg-[var(--sloty-soft-mint)] px-3 py-2 text-center text-sm font-black text-[var(--sloty-primary-dark)]"
            to={`/recurring-agreements/${recurringAgreementId}`}
          >
            عرض الحجز الأسبوعي
          </Link>
        ) : null}

        {isRecurringBooking ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
            إلغاء هذا الحجز الأسبوعي يتم من صفحة الحجز الأسبوعي حتى لا يظهر
            كإلغاء حجز منفرد.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {booking && canBookingAddPayment(booking.status) && onAddPayment ? (
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
          {booking && canBookingFreeHold(booking.status) && onFreeHold ? (
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={() => onFreeHold(booking)}
              type="button"
              variant="danger"
            >
              {isSubmitting ? 'جاري التحرير...' : 'تحرير الموعد'}
            </AppButton>
          ) : null}
          {booking && canBookingComplete(booking.status) && onComplete ? (
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={() => onComplete(booking)}
              type="button"
              variant="primary"
            >
              إكمال الحجز
            </AppButton>
          ) : null}
          {booking && canBookingNoShow(booking.status) && onNoShow ? (
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={() => onNoShow(booking)}
              type="button"
              variant="secondary"
            >
              تسجيل عدم حضور
            </AppButton>
          ) : null}
          {booking &&
          !isRecurringBooking &&
          canBookingCancel(booking.status) &&
          onCancel ? (
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={() => onCancel(booking)}
              type="button"
              variant="danger"
            >
              إلغاء الحجز
            </AppButton>
          ) : null}
          {booking && isBookingReadOnlyStatus(booking.status) ? (
            <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)] sm:col-span-2">
              عرض التفاصيل فقط
            </p>
          ) : null}
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
