import { RepeatOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import {
  bookingActionCopy,
  recurringCopy,
} from '../../../../shared/copy/appCopy'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type { BookingListItem } from '../../../schedule/scheduleApi.types'
import {
  getBookingActionPresentation,
  type BookingSecondaryAction,
} from '../../bookingActionPresentation.helpers'
import { hasActiveRecurrence } from '../../bookingRecurrence.helpers'
import {
  formatBookingDateTimeRangeWithWeekday,
  formatHoldExpiryMessage,
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
  onEditCustomer?: (booking: BookingListItem) => void
  onReschedule?: (booking: BookingListItem) => void
}

function hasMoneyValue(value: string | number | null | undefined): boolean {
  return value !== null && value !== undefined && value !== ''
}

const HOLD_COUNTDOWN_INTERVAL_MS = 30_000

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
  onEditCustomer,
  onEndRecurrence,
  onFreeHold,
  onNoShow,
  onReschedule,
}: BookingActionSheetProps) {
  const [isEndRecurrenceConfirming, setIsEndRecurrenceConfirming] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const optionsRef = useRef<HTMLDetailsElement>(null)
  const fallbackDate =
    dateValue ?? (booking ? getBookingDateFallback(booking) : null)
  const notes = booking ? getBookingNotes(booking) : null
  const shouldTickHoldCountdown =
    isOpen &&
    booking?.status === 'HOLD' &&
    Boolean(booking.hold_expires_at)
  const holdExpiryMessage =
    booking?.status === 'HOLD'
      ? formatHoldExpiryMessage(booking.hold_expires_at, now)
      : null
  const presentation = booking
    ? getBookingActionPresentation(booking, {
        canAddPayment: Boolean(onAddPayment),
        canCancel: Boolean(onCancel),
        canComplete: Boolean(onComplete),
        canEditCustomer: Boolean(onEditCustomer),
        canFreeHold: Boolean(onFreeHold),
        canNoShow: Boolean(onNoShow),
        canEndRecurrence: Boolean(onEndRecurrence),
        canReschedule: Boolean(onReschedule),
      })
    : null

  useEffect(() => {
    if (!shouldTickHoldCountdown) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setNow(new Date())
    }, 0)
    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, HOLD_COUNTDOWN_INTERVAL_MS)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [booking?.hold_expires_at, booking?.id, shouldTickHoldCountdown])

  function closeDetails(): void {
    setIsEndRecurrenceConfirming(false)
    onClose()
  }

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

  function runSecondaryAction(action: BookingSecondaryAction): void {
    if (!booking) {
      return
    }

    if (action === 'EDIT_CUSTOMER') {
      onEditCustomer?.(booking)
      return
    }

    if (action === 'RESCHEDULE') {
      onReschedule?.(booking)
      return
    }

    if (action === 'NO_SHOW') {
      onNoShow?.(booking)
      return
    }

    if (action === 'END_RECURRENCE') {
      setIsEndRecurrenceConfirming(true)
      return
    }

    if (booking.status === 'HOLD') {
      onFreeHold?.(booking)
      return
    }

    onCancel?.(booking)
  }

  return (
    <>
      <AppSheet
        ariaLabel="تفاصيل الحجز"
        isOpen={isOpen}
        onRequestClose={closeDetails}
      >
      <div className="p-5 pt-14">
        {booking ? (
          <>
            <header>
              <h2 className="text-2xl font-extrabold text-[var(--sloty-text-primary)]">
                {booking.customer_name || 'عميل غير محدد'}
              </h2>
              {booking.customer_phone ? (
                <p
                  className="mt-1 w-fit text-base font-medium text-[var(--sloty-text-muted)]"
                  dir="ltr"
                >
                  {booking.customer_phone}
                </p>
              ) : null}
              <p className="mt-3 text-lg font-extrabold text-[var(--sloty-primary-dark)]">
                {formatBookingDateTimeRangeWithWeekday(
                  booking.start_time,
                  booking.end_time,
                  fallbackDate,
                )}
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
                {getBookingCourtLabel(booking, courtName)}
              </p>
              {booking.is_recurring && !hasActiveRecurrence(booking) ? (
                <p className="mt-3 inline-flex rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-semibold text-[var(--sloty-primary-dark)]">
                  {recurringCopy.weeklyBooking}
                </p>
              ) : null}
              {hasActiveRecurrence(booking) ? (
                <section className="mt-4 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-base font-semibold text-[var(--sloty-primary-dark)]">
                      {recurringCopy.weeklyBooking}
                    </p>
                    {onEndRecurrence ? (
                      <AppButton
                        className="shrink-0"
                        disabled={isSubmitting}
                        onClick={() => setIsEndRecurrenceConfirming(true)}
                        type="button"
                        variant="secondary"
                      >
                        <span className="inline-flex items-center gap-2">
                          <RepeatOff aria-hidden="true" className="h-4 w-4" />
                          {bookingActionCopy.endRecurrence}
                        </span>
                      </AppButton>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-medium leading-6 text-[var(--sloty-text-muted)]">
                    {recurringCopy.weeklyHelper}
                  </p>
                </section>
              ) : null}
            </header>

            <section
              aria-label="حالة الحجز"
              className="mt-5 rounded-2xl bg-[var(--sloty-soft-mint)] p-4"
            >
              <p className="text-lg font-extrabold text-[var(--sloty-primary-dark)]">
                {presentation?.stateMessage}
              </p>
              {booking.status === 'HOLD' && holdExpiryMessage ? (
                <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
                  {holdExpiryMessage}
                </p>
              ) : null}
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
                    <dd className="mt-1 font-extrabold text-[var(--sloty-text-primary)]" dir="ltr">
                      {formatMoneyAmount(booking.total_price)}
                    </dd>
                  </div>
                ) : null}
                {hasMoneyValue(booking.paid_amount) ? (
                  <div className="rounded-2xl bg-[var(--sloty-bg)] p-3">
                    <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      المدفوع
                    </dt>
                    <dd className="mt-1 font-extrabold text-[var(--sloty-text-primary)]" dir="ltr">
                      {formatMoneyAmount(booking.paid_amount)}
                    </dd>
                  </div>
                ) : null}
                {hasMoneyValue(booking.remaining_amount) ? (
                  <div className="rounded-2xl bg-[var(--sloty-bg)] p-3">
                    <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      المتبقي
                    </dt>
                    <dd className="mt-1 font-extrabold text-[var(--sloty-text-primary)]" dir="ltr">
                      {formatMoneyAmount(booking.remaining_amount)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {booking.status === 'COMPLETED' && hasRemainingAmount(booking) ? (
              <p className="mt-4 rounded-xl bg-amber-100 px-3 py-2 text-sm font-black text-amber-900">
                {bookingActionCopy.completedWithRemaining}
              </p>
            ) : null}

            {notes ? (
              <div className="mt-4 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                  {bookingActionCopy.notes}
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--sloty-text-primary)]">
                  {notes}
                </p>
              </div>
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

            {presentation?.parallelActions.includes('NO_SHOW') ? (
              <AppButton
                className="mt-3"
                disabled={isSubmitting}
                fullWidth
                onClick={() => runSecondaryAction('NO_SHOW')}
                type="button"
                variant="secondary"
              >
                {bookingActionCopy.noShow}
              </AppButton>
            ) : null}

            {presentation &&
            presentation.secondaryActions.filter(
              (action) => action !== 'END_RECURRENCE',
            ).length > 0 ? (
              <details
                className="group mt-4 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)]"
                onToggle={(event) => {
                  if (
                    event.currentTarget.open &&
                    typeof event.currentTarget.scrollIntoView === 'function'
                  ) {
                    event.currentTarget.scrollIntoView({ block: 'nearest' })
                  }
                }}
                ref={optionsRef}
              >
                <summary className="cursor-pointer list-none px-4 py-3 text-center text-sm font-semibold text-[var(--sloty-text-primary)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--sloty-primary)]/30">
                  {bookingActionCopy.otherOptions}
                </summary>
                <div className="space-y-2 border-t border-[var(--sloty-border)] p-3">
                  {presentation.secondaryActions.includes('EDIT_CUSTOMER') ? (
                    <AppButton
                      disabled={isSubmitting}
                      fullWidth
                      onClick={() => runSecondaryAction('EDIT_CUSTOMER')}
                      type="button"
                      variant="secondary"
                    >
                      {bookingActionCopy.editCustomer}
                    </AppButton>
                  ) : null}
                  {presentation.secondaryActions.includes('RESCHEDULE') ? (
                    <AppButton
                      disabled={isSubmitting}
                      fullWidth
                      onClick={() => runSecondaryAction('RESCHEDULE')}
                      type="button"
                      variant="secondary"
                    >
                      {bookingActionCopy.reschedule}
                    </AppButton>
                  ) : null}
                  {presentation.secondaryActions.includes('NO_SHOW') ? (
                    <AppButton
                      disabled={isSubmitting}
                      fullWidth
                      onClick={() => runSecondaryAction('NO_SHOW')}
                      type="button"
                      variant="secondary"
                    >
                      {bookingActionCopy.noShow}
                    </AppButton>
                  ) : null}
                  {presentation.secondaryActions.includes('CANCEL') ? (
                    <>
                      <div
                        aria-hidden="true"
                        className="border-t border-[var(--sloty-border)]"
                      />
                      <AppButton
                        disabled={isSubmitting}
                        fullWidth
                        onClick={() => runSecondaryAction('CANCEL')}
                        type="button"
                        variant="danger"
                      >
                        {isSubmitting ? 'جاري الإلغاء...' : bookingActionCopy.cancelBooking}
                      </AppButton>
                    </>
                  ) : null}
                </div>
              </details>
            ) : null}
          </>
        ) : (
          <p className="rounded-2xl bg-[var(--sloty-bg)] p-4 text-sm font-bold text-[var(--sloty-text-muted)]">
            لا توجد تفاصيل كافية لهذا الحجز
          </p>
        )}
      </div>
      </AppSheet>
      {booking && hasActiveRecurrence(booking) && isEndRecurrenceConfirming ? (
        <AppSheet
          ariaLabel={recurringCopy.stopWeeklyConfirmTitle}
          isOpen
          onRequestClose={() => setIsEndRecurrenceConfirming(false)}
        >
        <div className="p-5 pt-14">
          <h2 className="text-xl font-bold text-[var(--sloty-text-primary)]">
            {recurringCopy.stopWeeklyConfirmTitle}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[var(--sloty-text-muted)]">
            {recurringCopy.stopWeeklyConfirmBody}
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={() => setIsEndRecurrenceConfirming(false)}
              type="button"
              variant="secondary"
            >
              رجوع
            </AppButton>
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={() => onEndRecurrence?.(booking)}
              type="button"
              variant="secondary"
            >
              {isSubmitting ? 'جاري الإيقاف...' : bookingActionCopy.endRecurrence}
            </AppButton>
          </div>
        </div>
        </AppSheet>
      ) : null}
    </>
  )
}
