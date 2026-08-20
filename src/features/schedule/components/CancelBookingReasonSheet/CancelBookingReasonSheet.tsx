import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  getFirstFieldErrorMessage,
} from '../../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../../core/api/apiClient'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSelect } from '../../../../shared/components/AppSelect/AppSelect'
import { formatArabicDateTime } from '../../../../shared/utils/date'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type { PaymentMethod } from '../../../transactions/transactions.types'
import { paymentMethodLabels } from '../../../transactions/transactions.types'
import type { BookingCancellationPreview } from '../../scheduleApi.types'

export interface CancelBookingReasonValues {
  reason: string
  notes?: string
  refund_payment_method?: PaymentMethod
  refund_reference?: string
  refund_notes?: string
}

export interface CancelBookingReasonSheetProps {
  isSubmitting: boolean
  error: string | null
  fieldErrors?: Record<string, ApiFieldError[]> | null
  preview?: BookingCancellationPreview | null
  onClose: () => void
  onSubmit: (values: CancelBookingReasonValues) => Promise<void> | void
}

const reasonOptions = [
  'العميل ألغى',
  'لم يتم دفع العربون',
  'حجز خاطئ',
  'حجز مكرر',
  'تغيير موعد',
  'أخرى',
]

function hasRefund(preview: BookingCancellationPreview | null | undefined): boolean {
  return Number(preview?.refund_amount ?? 0) > 0
}

/**
 * Collects the cancellation reason before sending the lifecycle action.
 */
export function CancelBookingReasonSheet({
  isSubmitting,
  error,
  fieldErrors = null,
  preview = null,
  onClose,
  onSubmit,
}: CancelBookingReasonSheetProps) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [refundPaymentMethod, setRefundPaymentMethod] =
    useState<PaymentMethod>('CASH')
  const [refundReference, setRefundReference] = useState('')
  const [refundNotes, setRefundNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const requiresNotes = reason === 'أخرى'
  const requiresRefundFields = hasRefund(preview)
  const canSubmitCancellation = preview?.can_cancel !== false
  const reasonFieldError = getFirstFieldErrorMessage(fieldErrors, 'reason')
  const refundPaymentMethodFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'refund_payment_method',
  )
  const refundReferenceFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'refund_reference',
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedReason = reason.trim()
    const trimmedNotes = notes.trim()
    const trimmedRefundReference = refundReference.trim()
    const trimmedRefundNotes = refundNotes.trim()

    if (!trimmedReason) {
      setValidationError('سبب الإلغاء مطلوب')
      return
    }

    if (requiresNotes && !trimmedNotes) {
      setValidationError('اكتب ملاحظة توضح سبب الإلغاء')
      return
    }

    setValidationError(null)
    await onSubmit({
      reason: trimmedReason,
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      ...(requiresRefundFields
        ? {
            refund_payment_method: refundPaymentMethod,
            ...(trimmedRefundReference
              ? { refund_reference: trimmedRefundReference }
              : {}),
            ...(trimmedRefundNotes ? { refund_notes: trimmedRefundNotes } : {}),
          }
        : {}),
    })
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
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            إلغاء الحجز
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            اختر سبب الإلغاء قبل تنفيذ العملية
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {preview ? (
            <section className="space-y-3 rounded-2xl bg-[var(--sloty-bg)] p-3 text-sm">
              <div>
                <p className="font-bold text-[var(--sloty-text-muted)]">
                  موعد الحجز
                </p>
                <p className="font-black text-[var(--sloty-text-primary)]">
                  {formatArabicDateTime(preview.booking_start) ?? 'غير محدد'}
                </p>
              </div>
              <div>
                <p className="font-bold text-[var(--sloty-text-muted)]">
                  سياسة استرداد العربون
                </p>
                <p className="font-black text-[var(--sloty-text-primary)]">
                  {preview.refund_notice_days === null
                    ? 'لا توجد مهلة استرداد محددة'
                    : `الإلغاء قبل الموعد بـ ${preview.refund_notice_days} يوم`}
                </p>
              </div>
              <div>
                <p className="font-bold text-[var(--sloty-text-muted)]">
                  آخر موعد للاسترداد
                </p>
                <p className="font-black text-[var(--sloty-text-primary)]">
                  {formatArabicDateTime(preview.refund_deadline) ?? 'غير محدد'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-bold text-[var(--sloty-text-muted)]">
                    المدفوع
                  </p>
                  <p className="font-black text-[var(--sloty-text-primary)]" dir="ltr">
                    {formatMoneyAmount(preview.paid_amount)}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-[var(--sloty-text-muted)]">
                    الحد الأدنى للعربون
                  </p>
                  <p className="font-black text-[var(--sloty-text-primary)]" dir="ltr">
                    {formatMoneyAmount(preview.minimum_deposit)}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-[var(--sloty-text-muted)]">
                    مبلغ الاسترداد
                  </p>
                  <p className="font-black text-[var(--sloty-primary-dark)]" dir="ltr">
                    {formatMoneyAmount(preview.refund_amount)}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-[var(--sloty-text-muted)]">
                    المبلغ المحتفظ به
                  </p>
                  <p className="font-black text-[var(--sloty-text-primary)]" dir="ltr">
                    {formatMoneyAmount(preview.retained_amount)}
                  </p>
                </div>
              </div>
              <p
                className={[
                  'rounded-xl px-3 py-2 text-sm font-black',
                  hasRefund(preview)
                    ? 'bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]'
                    : 'bg-amber-100 text-amber-900',
                ].join(' ')}
              >
                {hasRefund(preview)
                  ? `يحق للعميل استرداد ${formatMoneyAmount(preview.refund_amount)} حسب المعاينة.`
                  : 'لا يوجد مبلغ مستحق للاسترداد حسب المعاينة.'}
              </p>
            </section>
          ) : null}

          <AppSelect
            disabled={isSubmitting}
            label="سبب الإلغاء"
            onChange={(value) => {
              setReason(value)
              setValidationError(null)
            }}
            options={[
              { value: '', label: 'اختر السبب' },
              ...reasonOptions.map((option) => ({
                value: option,
                label: option,
              })),
            ]}
            value={reason}
          />
          {reasonFieldError ? (
            <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
              {reasonFieldError}
            </p>
          ) : null}

          {requiresNotes ? (
            <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>ملاحظات</span>
              <textarea
                className="min-h-24 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                disabled={isSubmitting}
                onChange={(event) => {
                  setNotes(event.target.value)
                  setValidationError(null)
                }}
                value={notes}
              />
            </label>
          ) : null}

          {requiresRefundFields ? (
            <section className="space-y-4 rounded-2xl border border-[var(--sloty-border)] p-3">
              <h3 className="text-sm font-black text-[var(--sloty-text-primary)]">
                بيانات الاسترداد
              </h3>
              <AppSelect
                disabled={isSubmitting}
                label="طريقة الاسترداد"
                onChange={(value) =>
                  setRefundPaymentMethod(value as PaymentMethod)
                }
                options={Object.entries(paymentMethodLabels).map(
                  ([value, label]) => ({
                    value,
                    label,
                  }),
                )}
                value={refundPaymentMethod}
              />
              {refundPaymentMethodFieldError ? (
                <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                  {refundPaymentMethodFieldError}
                </p>
              ) : null}
              <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
                <span>مرجع الاسترداد</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                  disabled={isSubmitting}
                  onChange={(event) => setRefundReference(event.target.value)}
                  value={refundReference}
                />
              </label>
              {refundReferenceFieldError ? (
                <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                  {refundReferenceFieldError}
                </p>
              ) : null}
              <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
                <span>ملاحظات الاسترداد</span>
                <textarea
                  className="min-h-20 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                  disabled={isSubmitting}
                  onChange={(event) => setRefundNotes(event.target.value)}
                  value={refundNotes}
                />
              </label>
            </section>
          ) : null}
        </div>

        {validationError || error ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {validationError ?? error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppButton
            disabled={isSubmitting || !canSubmitCancellation}
            fullWidth
            type="submit"
            variant="danger"
          >
            {isSubmitting ? 'جاري إلغاء الحجز...' : 'تأكيد إلغاء الحجز'}
          </AppButton>
          <AppButton
            disabled={isSubmitting}
            fullWidth
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            رجوع
          </AppButton>
        </div>
      </form>
    </div>
  )
}
