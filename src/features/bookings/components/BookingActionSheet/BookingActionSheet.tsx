import { useState } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type { BookingListItem } from '../../../schedule/scheduleApi.types'
import { getBookingActionPresentation } from '../../bookingActionPresentation.helpers'
import { hasActiveRecurrence } from '../../bookingRecurrence.helpers'
import {
  formatBookingDateTimeRangeWithWeekday,
  getBookingCourtLabel,
  getBookingDateFallback,
  getBookingNotes,
  hasRemainingAmount,
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
  onEndRecurrence?: (booking: BookingListItem) => void
}

function hasMoneyValue(value: string | number | null | undefined): boolean {
  return value !== null && value !== undefined && value !== ''
}

/**
 * Canonical booking details and action sheet for Schedule and Booking History.
 *
 * API mutations stay in the calling page. This component translates the
 * current booking state into one primary next step and valid secondary actions.
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
  onEndRecurrence,
  onFreeHold,
  onNoShow,
}: BookingActionSheetProps) {
  const [isEndRecurrenceConfirming, setIsEndRecurrenceConfirming] = useState(false)
  const fallbackDate = dateValue ?? (booking ? getBookingDateFallback(booking) : null)
  const notes = booking ? getBookingNotes(booking) : null
  const hasActiveWeeklyRecurrence = booking
    ? hasActiveRecurrence(booking)
    : false
  const presentation = booking
    ? getBookingActionPresentation(booking, {
        canAddPayment: Boolean(onAddPayment),
        canCancel: Boolean(onCancel),
        canComplete: Boolean(onComplete),
        canFreeHold: Boolean(onFreeHold),
        canNoShow: Boolean(onNoShow),
      })
    : null

  function runPrimaryAction(): void {
    if (!booking || !presentation?.primaryAction) {
      return
    }

    if (presentation.primaryAction.type === 'PAYMENT') {
      onAddPayment?.(booking)
      return
    }

    onComplete?.(booking)
  }

  function runSecondaryAction(action: 'CANCEL' | 'NO_SHOW'): void {
    if (!booking) {
      return
    }

    if (action === 'NO_SHOW') {
      onNoShow?.(booking)
      return
    }

    if (booking.status === 'HOLD') {
      onFreeHold?.(booking)
      return
    }

    onCancel?.(booking)
  }

  return (
    <AppSheet
      ariaLabel="تفاصيل الحجز"
      isOpen={isOpen}
      onRequestClose={onClose}
    >
      <div className="p-5 pt-14">
        {booking ? (
          <>
            <header>
              <h2 className="text-2xl font-black text-[var(--sloty-text-primary)]">
                {booking.customer_name || 'عميل غير محدد'}
              </h2>
              {booking.customer_phone ? (
                <p
                  className="mt-1 w-fit text-base font-black text-[var(--sloty-text-primary)]"
                  dir="ltr"
                >
                  {booking.customer_phone}
                </p>
              ) : null}
              <p className="mt-3 text-lg font-black text-[var(--sloty-primary-dark)]">
                {formatBookingDateTimeRangeWithWeekday(
                  booking.start_time,
                  booking.end_time,
                  fallbackDate,
                )}
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
                {getBookingCourtLabel(booking, courtName)}
              </p>
              {hasActiveWeeklyRecurrence ? (
                <p className="mt-3 inline-flex rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]">
                  ↻ بيتكرر أسبوعيًا
                </p>
              ) : null}
            </header>

            <section
              aria-label="حالة الحجز"
              className="mt-5 rounded-2xl bg-[var(--sloty-soft-mint)] p-4"
            >
              <p className="text-lg font-black text-[var(--sloty-primary-dark)]">
                {presentation?.stateMessage}
              </p>
            </section>

            {hasMoneyValue(booking.total_price) ||
            hasMoneyValue(booking.paid_amount) ||
            hasMoneyValue(booking.remaining_amount) ? (
              <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {hasMoneyValue(booking.total_price) ? (
                  <div className="rounded-2xl bg-[var(--sloty-bg)] p-3">
                    <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      إجمالي الحجز
                    </dt>
                    <dd className="mt-1 font-black text-[var(--sloty-text-primary)]" dir="ltr">
                      {formatMoneyAmount(booking.total_price)}
                    </dd>
                  </div>
                ) : null}
                {hasMoneyValue(booking.paid_amount) ? (
                  <div className="rounded-2xl bg-[var(--sloty-bg)] p-3">
                    <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      المدفوع
                    </dt>
                    <dd className="mt-1 font-black text-[var(--sloty-text-primary)]" dir="ltr">
                      {formatMoneyAmount(booking.paid_amount)}
                    </dd>
                  </div>
                ) : null}
                {hasMoneyValue(booking.remaining_amount) ? (
                  <div className="rounded-2xl bg-[var(--sloty-bg)] p-3">
                    <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      المتبقي
                    </dt>
                    <dd className="mt-1 font-black text-[var(--sloty-text-primary)]" dir="ltr">
                      {formatMoneyAmount(booking.remaining_amount)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {booking.status === 'COMPLETED' && hasRemainingAmount(booking) ? (
              <p className="mt-4 rounded-xl bg-amber-100 px-3 py-2 text-sm font-black text-amber-900">
                حجز مكتمل به مبلغ متبقي — يحتاج مراجعة مالية
              </p>
            ) : null}

            {notes ? (
              <p className="mt-4 rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
                {notes}
              </p>
            ) : null}

            {error ? (
              <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
                {error}
              </p>
            ) : null}

            {presentation?.primaryAction ? (
              <AppButton
                className="mt-5"
                disabled={isSubmitting}
                fullWidth
                onClick={runPrimaryAction}
                type="button"
                variant="primary"
              >
                {presentation.primaryAction.label}
              </AppButton>
            ) : null}

            {presentation && presentation.secondaryActions.length > 0 ? (
              <details className="group mt-4 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)]">
                <summary className="cursor-pointer list-none px-4 py-3 text-center text-sm font-black text-[var(--sloty-text-muted)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--sloty-primary)]/30">
                  ••• خيارات أخرى
                </summary>
                <div className="space-y-2 border-t border-[var(--sloty-border)] p-3">
                  {presentation.secondaryActions.includes('NO_SHOW') ? (
                    <AppButton
                      disabled={isSubmitting}
                      fullWidth
                      onClick={() => runSecondaryAction('NO_SHOW')}
                      type="button"
                      variant="secondary"
                    >
                      عدم حضور
                    </AppButton>
                  ) : null}
                  {presentation.secondaryActions.includes('CANCEL') ? (
                    <AppButton
                      disabled={isSubmitting}
                      fullWidth
                      onClick={() => runSecondaryAction('CANCEL')}
                      type="button"
                      variant="danger"
                    >
                      {isSubmitting ? 'جاري الإلغاء...' : 'إلغاء الحجز'}
                    </AppButton>
                  ) : null}
                </div>
              </details>
            ) : null}

            {hasActiveWeeklyRecurrence && onEndRecurrence ? (
              <section className="mt-4 rounded-2xl border border-[var(--sloty-border)] p-3">
                {isEndRecurrenceConfirming ? (
                  <div className="space-y-3">
                    <p className="text-sm font-bold leading-6 text-[var(--sloty-text-primary)]">
                      سيتم إيقاف تثبيت الموعد الأسبوعي، والحجز الحالي سيظل كما هو.
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <AppButton
                        disabled={isSubmitting}
                        fullWidth
                        onClick={() => onEndRecurrence(booking)}
                        type="button"
                        variant="danger"
                      >
                        تأكيد إيقاف التكرار
                      </AppButton>
                      <AppButton
                        disabled={isSubmitting}
                        fullWidth
                        onClick={() => setIsEndRecurrenceConfirming(false)}
                        type="button"
                        variant="secondary"
                      >
                        رجوع
                      </AppButton>
                    </div>
                  </div>
                ) : (
                  <AppButton
                    disabled={isSubmitting}
                    fullWidth
                    onClick={() => setIsEndRecurrenceConfirming(true)}
                    type="button"
                    variant="secondary"
                  >
                    إيقاف التكرار الأسبوعي
                  </AppButton>
                )}
              </section>
            ) : null}
          </>
        ) : (
          <p className="rounded-2xl bg-[var(--sloty-bg)] p-4 text-sm font-bold text-[var(--sloty-text-muted)]">
            لا توجد تفاصيل كافية لهذا الحجز
          </p>
        )}
      </div>
    </AppSheet>
  )
}
