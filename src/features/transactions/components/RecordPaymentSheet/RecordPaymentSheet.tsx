import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  getFirstFieldErrorMessage,
  PAYMENT_REFERENCE_REQUIRED_CODE,
  PAYMENT_REFERENCE_REQUIRED_MESSAGE,
} from '../../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../../core/api/apiClient'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { UnsavedChangesPrompt } from '../../../../shared/components/AppSheet/UnsavedChangesPrompt'
import { AppSelect } from '../../../../shared/components/AppSelect/AppSelect'
import { FormField } from '../../../../shared/components/FormField/FormField'
import {
  bookingActionCopy,
  financeCopy,
  validationCopy,
} from '../../../../shared/copy/appCopy'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type {
  PaymentMethod,
} from '../../transactions.types'
import { paymentMethodLabels } from '../../transactions.types'

export interface RecordPaymentSheetValues {
  amount: string
  client_request_id: string
  payment_method: PaymentMethod
  reference?: string
  notes?: string
  occurred_at: string
}

export interface RecordPaymentBookingMoney {
  totalPrice?: string | null
  paidAmount?: string | null
  remainingAmount?: string | null
}

export interface RecordPaymentSheetProps {
  bookingId: number | string
  bookingMoney?: RecordPaymentBookingMoney | null
  error: string | null
  errorCode?: string | null
  fieldErrors?: Record<string, ApiFieldError[]> | null
  isSubmitting: boolean
  minimumDepositHint?: string | null
  paymentPurpose?: 'deposit' | 'remaining'
  onClose: () => void
  onSubmit: (values: RecordPaymentSheetValues) => Promise<void> | void
}

function hasMoneyValue(value: string | number | null | undefined): boolean {
  return value !== null && value !== undefined && value !== ''
}

function createFallbackUuid(): string {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (value) => {
    const numeric = Number(value)
    const random = crypto.getRandomValues(new Uint8Array(1))[0] & 15

    return (numeric ^ (random >> (numeric / 4))).toString(16)
  })
}

function createPaymentClientRequestId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return createFallbackUuid()
}

function createPaymentBusinessKey({
  amount,
  bookingId,
  notes,
  paymentMethod,
  reference,
}: {
  amount: string
  bookingId: number | string
  notes?: string
  paymentMethod: PaymentMethod
  reference?: string
}): string {
  return [bookingId, amount, paymentMethod, reference ?? '', notes ?? ''].join(
    ':',
  )
}

/**
 * Record payment sheet (deposit or remaining collection).
 *
 * It provides local validation for the positive amount and delegates API mutation
 * errors to the parent surface.
 */
export function RecordPaymentSheet({
  bookingId,
  bookingMoney = null,
  error,
  errorCode = null,
  fieldErrors = null,
  isSubmitting,
  minimumDepositHint = null,
  paymentPurpose,
  onClose,
  onSubmit,
}: RecordPaymentSheetProps) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [amountValidationError, setAmountValidationError] = useState<string | null>(
    null,
  )
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const idempotencyRef = useRef<{
    businessKey: string
    clientRequestId: string
    occurredAt: string
  } | null>(null)
  const amountFieldError = getFirstFieldErrorMessage(fieldErrors, 'amount')
  const referenceFieldError =
    getFirstFieldErrorMessage(fieldErrors, 'reference') ??
    getFirstFieldErrorMessage(fieldErrors, 'payment_reference')
  const isReferenceRequired =
    errorCode === PAYMENT_REFERENCE_REQUIRED_CODE ||
    fieldErrors?.reference?.some(
      (e) => e.code === PAYMENT_REFERENCE_REQUIRED_CODE,
    ) ||
    fieldErrors?.payment_reference?.some(
      (e) => e.code === PAYMENT_REFERENCE_REQUIRED_CODE,
    ) ||
    error === PAYMENT_REFERENCE_REQUIRED_MESSAGE

  const isReferenceInvalid = Boolean(referenceFieldError) || Boolean(isReferenceRequired)
  const displayedAmountError = amountFieldError ?? amountValidationError
  const bannerError =
    error && error !== displayedAmountError
      ? error
      : isReferenceRequired && !displayedAmountError
        ? PAYMENT_REFERENCE_REQUIRED_MESSAGE
        : null
  const showPaymentReference = paymentMethod !== 'CASH'
  const isDirty =
    amount.length > 0 ||
    paymentMethod !== 'CASH' ||
    reference.length > 0 ||
    notes.length > 0

  function requestClose(): boolean | void {
    if (isDirty) {
      setIsDiscardPromptOpen(true)
      return false
    }

    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedAmount = amount.trim()
    const trimmedReference = reference.trim()
    const trimmedNotes = notes.trim()
    const numericAmount = Number(trimmedAmount)

    if (!trimmedAmount) {
      setAmountValidationError(validationCopy.amountRequired)
      return
    }

    if (paymentPurpose === 'deposit') {
      const backendMinimumDeposit =
        minimumDepositHint !== null &&
        minimumDepositHint !== undefined &&
        Number.isFinite(Number(minimumDepositHint)) &&
        Number(minimumDepositHint) >= 0
          ? Number(minimumDepositHint)
          : 0

      if (Number.isNaN(numericAmount) || numericAmount < backendMinimumDeposit) {
        const minimumLabel =
          minimumDepositHint && backendMinimumDeposit > 0
            ? formatMoneyAmount(minimumDepositHint, { suffix: 'ج.م' })
            : formatMoneyAmount('0.00', { suffix: 'ج.م' })

        setAmountValidationError(
          validationCopy.firstPaymentMinimum(minimumLabel),
        )
        return
      }
    } else {
      if (Number.isNaN(numericAmount) || numericAmount <= 0) {
        setAmountValidationError(validationCopy.amountPositive)
        return
      }
    }

    setAmountValidationError(null)
    const submittedReference = showPaymentReference
      ? trimmedReference || undefined
      : undefined
    const submittedNotes = trimmedNotes || undefined
    const businessKey = createPaymentBusinessKey({
      amount: trimmedAmount,
      bookingId,
      notes: submittedNotes,
      paymentMethod,
      reference: submittedReference,
    })
    const idempotency =
      idempotencyRef.current?.businessKey === businessKey
        ? idempotencyRef.current
        : {
            businessKey,
            clientRequestId: createPaymentClientRequestId(),
            occurredAt: new Date().toISOString(),
          }

    idempotencyRef.current = idempotency

    try {
      await onSubmit({
        amount: trimmedAmount,
        client_request_id: idempotency.clientRequestId,
        payment_method: paymentMethod,
        reference: submittedReference,
        notes: submittedNotes,
        occurred_at: idempotency.occurredAt,
      })
    } catch {
      // The parent owns the API error message so this form stays presentational.
    }
  }

  return (
    <>
      <AppSheet
        ariaLabel={
          paymentPurpose === 'deposit'
            ? 'تسجيل العربون'
            : paymentPurpose === 'remaining'
              ? 'تحصيل المبلغ المتبقي'
              : 'إضافة دفعة'
        }
        onRequestClose={requestClose}
      >
        <form className="p-5 pt-14" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            {paymentPurpose === 'deposit'
              ? 'تسجيل العربون'
              : paymentPurpose === 'remaining'
                ? 'تحصيل المبلغ المتبقي'
                : 'إضافة دفعة'}
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            {paymentPurpose === 'deposit'
              ? 'سجل العربون لتأكيد الحجز'
              : paymentPurpose === 'remaining'
                ? 'سجل المبلغ الذي تم تحصيله لهذا الحجز'
                : 'سجل دفعة جديدة لهذا الحجز'}
          </p>
          {paymentPurpose === 'deposit' && minimumDepositHint ? (
            <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              {bookingActionCopy.requiredDeposit}
              <span className="ms-2" dir="ltr">
                {formatMoneyAmount(minimumDepositHint, { suffix: 'ج.م' })}
              </span>
            </p>
          ) : null}
          {bookingMoney &&
          (hasMoneyValue(bookingMoney.totalPrice) ||
            hasMoneyValue(bookingMoney.paidAmount) ||
            hasMoneyValue(bookingMoney.remainingAmount)) ? (
            <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {hasMoneyValue(bookingMoney.totalPrice) ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                    {bookingActionCopy.bookingTotal}
                  </dt>
                  <dd className="mt-1 font-black" dir="ltr">
                    {formatMoneyAmount(bookingMoney.totalPrice, { suffix: 'ج.م' })}
                  </dd>
                </div>
              ) : null}
              {hasMoneyValue(bookingMoney.paidAmount) ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                    {bookingActionCopy.paidAmount}
                  </dt>
                  <dd className="mt-1 font-black" dir="ltr">
                    {formatMoneyAmount(bookingMoney.paidAmount, { suffix: 'ج.م' })}
                  </dd>
                </div>
              ) : null}
              {hasMoneyValue(bookingMoney.remainingAmount) ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                    {bookingActionCopy.remainingNowLabel}
                  </dt>
                  <dd className="mt-1 font-black" dir="ltr">
                    {formatMoneyAmount(bookingMoney.remainingAmount, {
                      suffix: 'ج.م',
                    })}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>المبلغ</span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-base font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20 sm:text-sm"
              dir="ltr"
              disabled={isSubmitting}
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              value={amount}
            />
          </label>
          {displayedAmountError ? (
            <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
              {displayedAmountError}
            </p>
          ) : null}

          <AppSelect
            disabled={isSubmitting}
            label="طريقة الدفع"
            onChange={(value) => setPaymentMethod(value as PaymentMethod)}
            options={Object.entries(paymentMethodLabels).map(([value, label]) => ({
              value,
              label,
            }))}
            value={paymentMethod}
          />

          {showPaymentReference ? (
            <FormField
              error={isReferenceInvalid}
              label={financeCopy.paymentReference}
            >
              <input
                aria-invalid={isReferenceInvalid ? true : undefined}
                aria-label="أدخل مرجع العملية"
                className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-base font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20 sm:text-sm"
                disabled={isSubmitting}
                onChange={(event) => setReference(event.target.value)}
                value={reference}
              />
            </FormField>
          ) : null}

          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>ملاحظات</span>
            <textarea
              className="min-h-20 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 text-base font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20 sm:text-sm"
              disabled={isSubmitting}
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>
        </div>

        {bannerError ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {bannerError}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <AppButton
            disabled={isSubmitting}
            fullWidth
            type="submit"
            variant="primary"
          >
            {isSubmitting
              ? 'جاري التسجيل...'
              : paymentPurpose === 'deposit'
                ? 'تسجيل العربون'
                : paymentPurpose === 'remaining'
                  ? 'تسجيل التحصيل'
                  : 'تسجيل الدفعة'}
          </AppButton>
          <AppButton
            disabled={isSubmitting}
            fullWidth
            onClick={requestClose}
            type="button"
            variant="secondary"
          >
            إلغاء
          </AppButton>
        </div>
        </form>
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
