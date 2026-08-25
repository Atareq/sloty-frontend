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

export interface RecordPaymentSheetProps {
  bookingId: number | string
  error: string | null
  fieldErrors?: Record<string, ApiFieldError[]> | null
  isSubmitting: boolean
  minimumDepositHint?: string | null
  paymentPurpose?: 'deposit' | 'remaining'
  onClose: () => void
  onSubmit: (values: RecordPaymentSheetValues) => Promise<void> | void
}

/**
 * Presentational payment-recording form for HOLD or confirmed bookings.
 *
 * It gathers the financial input only; the parent owns API calls and reloads so
 * this sheet can remain reusable from booking details or future transaction UI.
 */
export function RecordPaymentSheet({
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
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const amountFieldError = getFirstFieldErrorMessage(fieldErrors, 'amount')
  const referenceFieldError =
    getFirstFieldErrorMessage(fieldErrors, 'reference') ??
    getFirstFieldErrorMessage(fieldErrors, 'payment_reference')
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
      setValidationError('المبلغ مطلوب')
      return
    }

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setValidationError('المبلغ يجب أن يكون أكبر من صفر')
      return
    }

    setValidationError(null)
    try {
      await onSubmit({
        amount: trimmedAmount,
        payment_method: paymentMethod,
        reference: trimmedReference || undefined,
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
          {minimumDepositHint ? (
            <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-xs font-bold text-[var(--sloty-text-muted)]">
              الحد الأدنى للعربون في إعدادات الملعب:{' '}
              <span dir="ltr">{formatMoneyAmount(minimumDepositHint)}</span>
            </p>
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
          {amountFieldError ? (
            <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
              {amountFieldError}
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

          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>رقم العملية</span>
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
          <p className="-mt-2 text-xs font-bold text-[var(--sloty-text-muted)]">
            اختياري حسب طريقة الدفع وسياسة الملعب
          </p>

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

        {validationError || error ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {validationError ?? error}
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
