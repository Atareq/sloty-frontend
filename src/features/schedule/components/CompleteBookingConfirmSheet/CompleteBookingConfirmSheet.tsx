import { useState } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { UnsavedChangesPrompt } from '../../../../shared/components/AppSheet/UnsavedChangesPrompt'
import { AppSelect } from '../../../../shared/components/AppSelect/AppSelect'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import { formatBookingDateTimeRangeWithWeekday } from '../../../bookings/bookingDisplay.helpers'
import { hasPositiveRemainingAmount } from '../../../bookings/bookingPayment.helpers'
import {
  getRecurrenceBlockedReasonMessage,
  hasActiveRecurrence,
} from '../../../bookings/bookingRecurrence.helpers'
import type { PaymentMethod } from '../../../transactions/transactions.types'
import { paymentMethodLabels } from '../../../transactions/transactions.types'
import type {
  BookingCompletePayload,
  BookingListItem,
} from '../../scheduleApi.types'

export interface CompleteBookingConfirmSheetProps {
  booking: BookingListItem
  remainingAmount?: string | null
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onConfirm: (payload?: BookingCompletePayload) => Promise<void> | void
  onRequestPayment: () => void
}

/**
 * Confirms ordinary completion or the backend-owned recurring continuation
 * decision. It never derives the next occurrence, price, deposit, or amount.
 */
export function CompleteBookingConfirmSheet({
  booking,
  remainingAmount,
  isSubmitting,
  error,
  onClose,
  onConfirm,
  onRequestPayment,
}: CompleteBookingConfirmSheetProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const hasRemaining = hasPositiveRemainingAmount(remainingAmount)
  const hasActiveWeeklyRecurrence = hasActiveRecurrence(booking)
  const recurrenceNext = booking.recurrence_next
  const canContinue = recurrenceNext?.can_continue === true
  const requiresNextDeposit = hasPositiveRemainingAmount(
    recurrenceNext?.required_deposit,
  )
  const isDirty =
    requiresNextDeposit &&
    (paymentMethod !== 'CASH' ||
      paymentReference.length > 0 ||
      paymentNotes.length > 0)

  function requestClose(): boolean | void {
    if (isDirty) {
      setIsDiscardPromptOpen(true)
      return false
    }

    onClose()
  }

  function handleContinue(): void {
    onConfirm({
      continue_recurring: true,
      ...(requiresNextDeposit
        ? {
            next_deposit_payment_method: paymentMethod,
            ...(paymentReference.trim()
              ? { next_deposit_payment_reference: paymentReference.trim() }
              : {}),
            ...(paymentNotes.trim()
              ? { next_deposit_notes: paymentNotes.trim() }
              : {}),
          }
        : {}),
    })
  }

  return (
    <>
      <AppSheet ariaLabel="إكمال الحجز" onRequestClose={requestClose}>
      <div className="p-5 pt-14">
        <div className="space-y-2">
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            {hasActiveWeeklyRecurrence
              ? 'إكمال الحجز الأسبوعي'
              : 'إكمال الحجز'}
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            {hasRemaining
              ? 'يوجد مبلغ متبقي على هذا الحجز. يجب تسجيل الدفعة أولًا قبل إكمال الحجز.'
              : hasActiveWeeklyRecurrence
                ? 'الحجز الحالي مدفوع بالكامل. اختار إذا كان نفس الموعد الأسبوعي هيستمر ولا هيتوقف.'
                : 'سيتم اعتبار الحجز مكتملاً بعد التأكيد.'}
          </p>
          {hasRemaining ? (
            <dl className="rounded-2xl bg-[var(--sloty-bg)] p-3 text-sm">
              <dt className="font-bold text-[var(--sloty-text-muted)]">
                المبلغ المتبقي
              </dt>
              <dd
                className="mt-1 font-black text-[var(--sloty-primary-dark)]"
                dir="ltr"
              >
                {formatMoneyAmount(remainingAmount)}
              </dd>
            </dl>
          ) : null}
        </div>

        {!hasRemaining && hasActiveWeeklyRecurrence && recurrenceNext ? (
          <section className="mt-4 space-y-3 rounded-2xl bg-[var(--sloty-bg)] p-4 text-sm">
            <div>
              <p className="font-bold text-[var(--sloty-text-muted)]">
                الموعد القادم
              </p>
              <p className="mt-1 font-black text-[var(--sloty-text-primary)]">
                {formatBookingDateTimeRangeWithWeekday(
                  recurrenceNext.start_time,
                  recurrenceNext.end_time,
                )}
              </p>
            </div>
            {recurrenceNext.total_price !== null ? (
              <div>
                <p className="font-bold text-[var(--sloty-text-muted)]">
                  سعر الحجز القادم
                </p>
                <p
                  className="mt-1 font-black text-[var(--sloty-text-primary)]"
                  dir="ltr"
                >
                  {formatMoneyAmount(recurrenceNext.total_price)}
                </p>
              </div>
            ) : null}
            {recurrenceNext.required_deposit !== null ? (
              <div>
                <p className="font-bold text-[var(--sloty-text-muted)]">
                  عربون الأسبوع القادم
                </p>
                <p
                  className="mt-1 font-black text-[var(--sloty-text-primary)]"
                  dir="ltr"
                >
                  {formatMoneyAmount(recurrenceNext.required_deposit)}
                </p>
              </div>
            ) : null}
            {!canContinue ? (
              <p className="rounded-xl bg-amber-100 px-3 py-2 font-black text-amber-900">
                {getRecurrenceBlockedReasonMessage(
                  recurrenceNext.blocked_reason,
                )}
              </p>
            ) : null}
          </section>
        ) : null}

        {!hasRemaining && hasActiveWeeklyRecurrence && !recurrenceNext ? (
          <p className="mt-4 rounded-xl bg-amber-100 px-3 py-2 text-sm font-black text-amber-900">
            تفاصيل الموعد الأسبوع القادم غير متاحة حاليًا. تقدر تكمل الحجز وتوقف التكرار.
          </p>
        ) : null}

        {!hasRemaining &&
        hasActiveWeeklyRecurrence &&
        canContinue &&
        requiresNextDeposit ? (
          <div className="mt-4 space-y-4">
            <AppSelect
              disabled={isSubmitting}
              label="طريقة دفع عربون الأسبوع القادم"
              onChange={(value) => setPaymentMethod(value as PaymentMethod)}
              options={Object.entries(paymentMethodLabels).map(
                ([value, label]) => ({ value, label }),
              )}
              value={paymentMethod}
            />
            <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>رقم العملية</span>
              <input
                className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-base font-semibold outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20 sm:text-sm"
                disabled={isSubmitting}
                onChange={(event) => setPaymentReference(event.target.value)}
                value={paymentReference}
              />
            </label>
            <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>ملاحظات</span>
              <textarea
                className="min-h-20 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 text-base font-semibold outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20 sm:text-sm"
                disabled={isSubmitting}
                onChange={(event) => setPaymentNotes(event.target.value)}
                value={paymentNotes}
              />
            </label>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {hasRemaining ? (
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={onRequestPayment}
              type="button"
              variant="primary"
            >
              تسجيل الدفعة
            </AppButton>
          ) : hasActiveWeeklyRecurrence ? (
            <>
              {canContinue ? (
                <AppButton
                  disabled={isSubmitting}
                  fullWidth
                  onClick={handleContinue}
                  type="button"
                  variant="primary"
                >
                  {isSubmitting
                    ? 'جاري إكمال الحجز...'
                    : 'إكمال واستمرار أسبوعيًا'}
                </AppButton>
              ) : null}
              <AppButton
                disabled={isSubmitting}
                fullWidth
                onClick={() => onConfirm({ continue_recurring: false })}
                type="button"
                variant={canContinue ? 'secondary' : 'primary'}
              >
                {isSubmitting
                  ? 'جاري إكمال الحجز...'
                  : 'إكمال وإيقاف التكرار'}
              </AppButton>
            </>
          ) : (
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={() => onConfirm()}
              type="button"
              variant="primary"
            >
              {isSubmitting ? 'جاري إكمال الحجز...' : 'تأكيد إكمال الحجز'}
            </AppButton>
          )}
          <AppButton
            disabled={isSubmitting}
            fullWidth
            onClick={requestClose}
            type="button"
            variant="secondary"
          >
            رجوع
          </AppButton>
        </div>
      </div>
      </AppSheet>
      <UnsavedChangesPrompt
        isOpen={isDiscardPromptOpen}
        onContinueEditing={() => setIsDiscardPromptOpen(false)}
        onDiscard={() => {
          setIsDiscardPromptOpen(false)
          onClose()
        }}
      />
    </>
  )
}
