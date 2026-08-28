import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  getFirstFieldErrorMessage,
} from '../../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../../core/api/apiClient'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { UnsavedChangesPrompt } from '../../../../shared/components/AppSheet/UnsavedChangesPrompt'
import { AppSelect } from '../../../../shared/components/AppSelect/AppSelect'
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
  payment_method: PaymentMethod
  reference?: string
  notes?: string
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

/**
 * Presentational payment-recording form for HOLD or confirmed bookings.
 *
 * It gathers the financial input only; the parent owns API calls and reloads so
 * this sheet can remain reusable from booking details or future transaction UI.
 */
export function RecordPaymentSheet({
  bookingMoney = null,
  error,
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
  const amountFieldError = getFirstFieldErrorMessage(fieldErrors, 'amount')
  const referenceFieldError =
    getFirstFieldErrorMessage(fieldErrors, 'reference') ??
    getFirstFieldErrorMessage(fieldErrors, 'payment_reference')
  const displayedAmountError = amountFieldError ?? amountValidationError
  const bannerError =
    error && error !== displayedAmountError ? error : null
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

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setAmountValidationError(validationCopy.amountPositive)
      return
    }

    if (paymentPurpose === 'deposit' && minimumDepositHint) {
      const minimumDeposit = Number(minimumDepositHint)

      if (
        !Number.isNaN(minimumDeposit) &&
        numericAmount < minimumDeposit
      ) {
        setAmountValidationError(
          validationCopy.firstPaymentMinimum(
            formatMoneyAmount(minimumDepositHint, { suffix: 'ج.م' }),
          ),
        )
        return
      }
    }

    setAmountValidationError(null)
    try {
      await onSubmit({
        amount: trimmedAmount,
        payment_method: paymentMethod,
        reference: showPaymentReference
          ? trimmedReference || undefined
          : undefined,
        notes: trimmedNotes || undefined,
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
            <>
              <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
                <span>{financeCopy.paymentReference}</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-base font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20 sm:text-sm"
                  disabled={isSubmitting}
                  onChange={(event) => setReference(event.target.value)}
                  value={reference}
                />
              </label>
              {referenceFieldError ? (
                <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                  {referenceFieldError}
                </p>
              ) : null}
            </>
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
