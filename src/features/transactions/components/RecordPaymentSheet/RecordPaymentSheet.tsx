import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  getFirstFieldErrorMessage,
} from '../../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../../core/api/apiClient'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import type {
  PaymentMethod,
  TransactionCreatePayload,
} from '../../transactions.types'
import { paymentMethodLabels } from '../../transactions.types'

export type RecordPaymentSheetValues = Omit<
  TransactionCreatePayload,
  'booking'
>

export interface RecordPaymentSheetProps {
  bookingId: number | string
  error: string | null
  fieldErrors?: Record<string, ApiFieldError[]> | null
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (values: RecordPaymentSheetValues) => Promise<void> | void
}

/**
 * Presentational payment-recording form for confirmed bookings.
 *
 * It gathers the financial input only; the parent owns API calls and reloads so
 * this sheet can remain reusable from booking details or future transaction UI.
 */
export function RecordPaymentSheet({
  bookingId,
  error,
  fieldErrors = null,
  isSubmitting,
  onClose,
  onSubmit,
}: RecordPaymentSheetProps) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const amountFieldError = getFirstFieldErrorMessage(fieldErrors, 'amount')
  const referenceFieldError =
    getFirstFieldErrorMessage(fieldErrors, 'reference') ??
    getFirstFieldErrorMessage(fieldErrors, 'payment_reference')

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
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-end bg-slate-950/45 p-0 md:items-center md:justify-center md:p-6"
      role="dialog"
    >
      <form
        className="w-full rounded-t-3xl bg-[var(--sloty-surface)] p-5 shadow-2xl md:max-w-md md:rounded-3xl"
        onSubmit={handleSubmit}
      >
        <div className="space-y-1">
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            حجز #{bookingId}
          </p>
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            إضافة دفعة
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            سجل دفعة جديدة لهذا الحجز
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>المبلغ</span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
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

          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>طريقة الدفع</span>
            <select
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
              disabled={isSubmitting}
              onChange={(event) =>
                setPaymentMethod(event.target.value as PaymentMethod)
              }
              value={paymentMethod}
            >
              {Object.entries(paymentMethodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>رقم العملية</span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
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
              className="min-h-20 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
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
            {isSubmitting ? 'جاري التسجيل...' : 'تسجيل الدفعة'}
          </AppButton>
          <AppButton
            disabled={isSubmitting}
            fullWidth
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            إلغاء
          </AppButton>
        </div>
      </form>
    </div>
  )
}
