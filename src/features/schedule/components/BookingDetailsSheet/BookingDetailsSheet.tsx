import { useState } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import {
  RecordPaymentSheet,
  type RecordPaymentSheetValues,
} from '../../../transactions/components/RecordPaymentSheet/RecordPaymentSheet'
import type { ScheduleBooking } from '../../schedule.types'
import type { BookingListItem } from '../../scheduleApi.types'

export interface BookingDetailsSheetProps {
  booking: BookingListItem | undefined
  courtName: string
  dateLabel: string
  error: string | null
  paymentError: string | null
  isPaymentSubmitting: boolean
  isSubmitting: boolean
  slot: ScheduleBooking
  onCancel: (bookingId: number | string) => Promise<void>
  onComplete: (bookingId: number | string) => Promise<void>
  onClose: () => void
  onNoShow: (bookingId: number | string) => Promise<void>
  onRecordPayment?: (
    bookingId: number,
    values: RecordPaymentSheetValues,
  ) => Promise<void>
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
 * It keeps slot buttons free from financial details while confirmed booking
 * actions and payment recording stay inside the details workflow.
 */
export function BookingDetailsSheet({
  booking,
  courtName,
  dateLabel,
  error,
  paymentError,
  isPaymentSubmitting,
  isSubmitting,
  onCancel,
  onComplete,
  onClose,
  onNoShow,
  onRecordPayment,
  slot,
}: BookingDetailsSheetProps) {
  const [confirmingAction, setConfirmingAction] = useState<
    'cancel' | 'complete' | 'noShow' | null
  >(null)
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false)
  const shouldShowActions = booking?.status === 'CONFIRMED'
  const canRecordPayment = shouldShowActions && Boolean(onRecordPayment)

  async function handleActionClick(
    action: 'cancel' | 'complete' | 'noShow',
    handler: (bookingId: number | string) => Promise<void>,
  ): Promise<void> {
    if (!booking) {
      return
    }

    if (confirmingAction !== action) {
      setConfirmingAction(action)
      return
    }

    await handler(booking.id)
  }

  async function handleRecordPaymentSubmit(
    values: RecordPaymentSheetValues,
  ): Promise<void> {
    if (!booking || !onRecordPayment) {
      return
    }

    await onRecordPayment(booking.id, values)
    setIsPaymentSheetOpen(false)
  }

  return (
    <>
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

          {confirmingAction === 'complete' ? (
            <p className="mt-4 rounded-xl bg-[var(--sloty-soft-mint)] px-3 py-2 text-sm font-bold text-[var(--sloty-primary-dark)]">
              سيتم اعتبار الحجز مكتملاً بعد التأكيد.
            </p>
          ) : null}

          {confirmingAction === 'noShow' ? (
            <p className="mt-4 rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              سيتم تسجيل العميل كعدم حضور بعد التأكيد.
            </p>
          ) : null}

          {confirmingAction === 'cancel' ? (
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
            {canRecordPayment ? (
              <AppButton
                disabled={isSubmitting || isPaymentSubmitting}
                fullWidth
                onClick={() => setIsPaymentSheetOpen(true)}
                type="button"
                variant="primary"
              >
                تسجيل دفع
              </AppButton>
            ) : null}
            {shouldShowActions ? (
              <AppButton
                disabled={isSubmitting || isPaymentSubmitting}
                fullWidth
                onClick={() => handleActionClick('complete', onComplete)}
                type="button"
                variant="primary"
              >
                {confirmingAction === 'complete'
                  ? 'تأكيد إكمال الحجز'
                  : 'إكمال الحجز'}
              </AppButton>
            ) : null}
            {shouldShowActions ? (
              <AppButton
                disabled={isSubmitting || isPaymentSubmitting}
                fullWidth
                onClick={() => handleActionClick('noShow', onNoShow)}
                type="button"
                variant="secondary"
              >
                {confirmingAction === 'noShow'
                  ? 'تأكيد عدم الحضور'
                  : 'تسجيل عدم حضور'}
              </AppButton>
            ) : null}
            {shouldShowActions ? (
              <AppButton
                disabled={isSubmitting || isPaymentSubmitting}
                fullWidth
                onClick={() => handleActionClick('cancel', onCancel)}
                type="button"
                variant="danger"
              >
                {confirmingAction === 'cancel'
                  ? 'تأكيد إلغاء الحجز'
                  : 'إلغاء الحجز'}
              </AppButton>
            ) : null}
            <AppButton
              disabled={isSubmitting || isPaymentSubmitting}
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

      {isPaymentSheetOpen ? (
        <RecordPaymentSheet
          error={paymentError}
          isSubmitting={isPaymentSubmitting}
          onClose={() => setIsPaymentSheetOpen(false)}
          onSubmit={handleRecordPaymentSubmit}
        />
      ) : null}
    </>
  )
}
