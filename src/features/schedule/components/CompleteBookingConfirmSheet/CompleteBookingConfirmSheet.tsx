import { useEffect, useState } from 'react'
import { getApiErrorCode, getApiErrorMessage } from '../../../../core/api/apiError.helpers'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { UnsavedChangesPrompt } from '../../../../shared/components/AppSheet/UnsavedChangesPrompt'
import { AppSelect } from '../../../../shared/components/AppSelect/AppSelect'
import { financeCopy } from '../../../../shared/copy/appCopy'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import {
  formatBookingDateWithWeekday,
  formatBookingTimeRange,
} from '../../../bookings/bookingDisplay.helpers'
import { hasPositiveRemainingAmount } from '../../../bookings/bookingPayment.helpers'
import {
  hasActiveRecurrence,
  shouldLoadRecurrenceNextPreview,
} from '../../../bookings/bookingRecurrence.helpers'
import type { PaymentMethod } from '../../../transactions/transactions.types'
import { paymentMethodLabels } from '../../../transactions/transactions.types'
import { getBookingRecurrenceNext } from '../../scheduleApi'
import type {
  BookingCompletePayload,
  BookingListItem,
  BookingRecurrenceNextPreview,
} from '../../scheduleApi.types'

export interface CompleteBookingConfirmSheetProps {
  booking: BookingListItem
  clubSlug: string
  remainingAmount?: string | null
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onConfirm: (payload?: BookingCompletePayload) => Promise<void> | void
  onRequestPayment: () => void
}

function isNonCashMethod(method: PaymentMethod): boolean {
  return method !== 'CASH'
}

/**
 * Confirms ordinary completion or the backend-owned recurring continuation
 * decision. Next date, price, and deposit come from GET recurrence-next/.
 */
export function CompleteBookingConfirmSheet({
  booking,
  clubSlug,
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
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const [preview, setPreview] = useState<BookingRecurrenceNextPreview | null>(
    null,
  )
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewErrorCode, setPreviewErrorCode] = useState<string | null>(null)
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0)
  const hasRemaining = hasPositiveRemainingAmount(remainingAmount)
  const hasActiveWeeklyRecurrence = hasActiveRecurrence(booking)
  const recurrenceNotActive =
    previewErrorCode === 'BOOKING_RECURRENCE_NOT_ACTIVE'
  const shouldFetchPreview =
    !hasRemaining && shouldLoadRecurrenceNextPreview(booking)
  const showContinuationUi =
    shouldFetchPreview && hasActiveWeeklyRecurrence && !recurrenceNotActive
  const continuationBlocked =
    previewErrorCode === 'RECURRENCE_CANNOT_CONTINUE' ||
    previewErrorCode === 'NEXT_RECURRING_SLOT_UNAVAILABLE' ||
    preview?.can_continue === false
  const canContinue =
    preview?.can_continue === true && !continuationBlocked && !isPreviewLoading
  const requiresNextDeposit = hasPositiveRemainingAmount(
    preview?.next_required_deposit,
  )
  const requiresPaymentReference =
    requiresNextDeposit &&
    preview?.requires_payment_reference === true &&
    isNonCashMethod(paymentMethod)
  const isDirty =
    requiresNextDeposit &&
    (paymentMethod !== 'CASH' ||
      paymentReference.length > 0 ||
      paymentNotes.length > 0)

  useEffect(() => {
    if (!shouldFetchPreview) {
      return
    }

    let cancelled = false

    async function loadPreview(): Promise<void> {
      setIsPreviewLoading(true)
      setPreviewError(null)
      setPreviewErrorCode(null)

      try {
        const response = await getBookingRecurrenceNext(clubSlug, booking.id)

        if (cancelled) {
          return
        }

        setPreview(response)
        setIsPreviewLoading(false)
      } catch (caught: unknown) {
        if (cancelled) {
          return
        }

        const code = getApiErrorCode(caught)
        setPreviewErrorCode(code)
        setPreview(null)
        setPreviewError(
          getApiErrorMessage(
            caught,
            'تعذر تحميل تفاصيل الموعد الأسبوع القادم.',
          ),
        )
        setIsPreviewLoading(false)
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [booking.id, clubSlug, previewRefreshKey, shouldFetchPreview])

  function requestClose(): boolean | void {
    if (isDirty) {
      setIsDiscardPromptOpen(true)
      return false
    }

    onClose()
  }

  function refreshPreview(): void {
    setPreviewRefreshKey((value) => value + 1)
  }

  async function confirmCompletion(
    payload?: BookingCompletePayload,
  ): Promise<void> {
    try {
      await onConfirm(payload)
    } catch {
      refreshPreview()
    }
  }

  async function handleContinue(): Promise<void> {
    if (!canContinue) {
      return
    }

    if (requiresPaymentReference && !paymentReference.trim()) {
      setValidationError(`${financeCopy.paymentReference} مطلوب`)
      return
    }

    setValidationError(null)
    await confirmCompletion({
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

  const continuationMessage =
    previewError ??
    (preview && !preview.can_continue
      ? 'مش متاح استمرار نفس الموعد الأسبوعي دلوقتي.'
      : null)

  return (
    <>
      <AppSheet ariaLabel="إكمال الحجز" onRequestClose={requestClose}>
      <div className="p-5 pt-14">
        <div className="space-y-2">
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            {showContinuationUi ? 'إكمال الحجز الأسبوعي' : 'إكمال الحجز'}
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            {hasRemaining
              ? 'يوجد مبلغ متبقي على هذا الحجز. يجب تسجيل الدفعة أولًا قبل إكمال الحجز.'
              : showContinuationUi
                ? 'الحجز الحالي مدفوع بالكامل. اختار إذا كان نفس الموعد الأسبوعي هيستمر ولا هيتوقف.'
                : 'بعد التأكيد هيتحسب إن الحجز تم اللعب.'}
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

        {showContinuationUi && isPreviewLoading ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل الموعد الأسبوع القادم...
          </p>
        ) : null}

        {showContinuationUi && preview ? (
          <section className="mt-4 space-y-3 rounded-2xl bg-[var(--sloty-bg)] p-4 text-sm">
            <h3 className="text-base font-black text-[var(--sloty-text-primary)]">
              استمرار الموعد الأسبوعي
            </h3>
            <div>
              <p className="font-black text-[var(--sloty-text-primary)]">
                {formatBookingDateWithWeekday(preview.next_start_time)}
              </p>
              <p className="mt-1 font-black text-[var(--sloty-text-primary)]">
                {formatBookingTimeRange(
                  preview.next_start_time,
                  preview.next_end_time,
                )}
              </p>
            </div>
            <div>
              <p className="font-bold text-[var(--sloty-text-muted)]">
                سعر الحجز
              </p>
              <p
                className="mt-1 font-black text-[var(--sloty-text-primary)]"
                dir="ltr"
              >
                {formatMoneyAmount(preview.next_total_price)}
              </p>
            </div>
            <div>
              <p className="font-bold text-[var(--sloty-text-muted)]">
                العربون المطلوب
              </p>
              <p
                className="mt-1 font-black text-[var(--sloty-text-primary)]"
                dir="ltr"
              >
                {formatMoneyAmount(preview.next_required_deposit)}
              </p>
            </div>
            {continuationMessage ? (
              <p className="rounded-xl bg-amber-100 px-3 py-2 font-black text-amber-900">
                {continuationMessage}
              </p>
            ) : null}
          </section>
        ) : null}

        {showContinuationUi &&
        !isPreviewLoading &&
        !preview &&
        continuationMessage ? (
          <p className="mt-4 rounded-xl bg-amber-100 px-3 py-2 text-sm font-black text-amber-900">
            {continuationMessage}
          </p>
        ) : null}

        {showContinuationUi && canContinue && requiresNextDeposit ? (
          <div className="mt-4 space-y-4">
            <AppSelect
              disabled={isSubmitting}
              label="طريقة الدفع"
              onChange={(value) => setPaymentMethod(value as PaymentMethod)}
              options={Object.entries(paymentMethodLabels).map(
                ([value, label]) => ({ value, label }),
              )}
              value={paymentMethod}
            />
            {isNonCashMethod(paymentMethod) ? (
              <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
                <span>{financeCopy.paymentReference}</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-base font-semibold outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20 sm:text-sm"
                  disabled={isSubmitting}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  required={requiresPaymentReference}
                  value={paymentReference}
                />
              </label>
            ) : null}
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

        {validationError || error ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {validationError ?? error}
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
          ) : showContinuationUi ? (
            <>
              {canContinue || isPreviewLoading ? (
                <AppButton
                  disabled={
                    isSubmitting ||
                    isPreviewLoading ||
                    !canContinue ||
                    (requiresPaymentReference && !paymentReference.trim())
                  }
                  fullWidth
                  onClick={() => {
                    void handleContinue()
                  }}
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
                onClick={() => {
                  void confirmCompletion({ continue_recurring: false })
                }}
                type="button"
                variant={canContinue ? 'secondary' : 'primary'}
              >
                {isSubmitting
                  ? 'جاري إكمال الحجز...'
                  : 'إكمال وإيقاف الحجز الأسبوعي'}
              </AppButton>
            </>
          ) : (
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={() => {
                void confirmCompletion()
              }}
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
