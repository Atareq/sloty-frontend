import { useState, type FormEvent } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { formatArabicDateTime } from '../../../../shared/utils/date'
import type {
  RecurringAgreementCancelPayload,
  RecurringAgreementCancellationPreview,
} from '../../recurringAgreements.types'
import { recurringDepositStatusLabels } from '../../recurringAgreements.types'

export interface RecurringCancellationSheetProps {
  error: string | null
  isPreviewLoading: boolean
  isSubmitting: boolean
  preview: RecurringAgreementCancellationPreview | null
  onCancel: (values: RecurringAgreementCancelPayload) => Promise<void>
  onClose: () => void
  onPreview: (values: RecurringAgreementCancelPayload) => Promise<void>
}

/**
 * Preview-first cancellation form for recurring agreements.
 */
export function RecurringCancellationSheet({
  error,
  isPreviewLoading,
  isSubmitting,
  onCancel,
  onClose,
  onPreview,
  preview,
}: RecurringCancellationSheetProps) {
  const [effectiveDate, setEffectiveDate] = useState('')
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const values: RecurringAgreementCancelPayload = {
    reason: reason.trim(),
    ...(effectiveDate ? { effective_date: effectiveDate } : {}),
  }

  function validate(): boolean {
    if (!reason.trim()) {
      setValidationError('سبب الإلغاء مطلوب')
      return false
    }

    setValidationError(null)
    return true
  }

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validate()) {
      return
    }

    await onPreview(values)
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-end bg-slate-950/45 p-0 md:items-center md:justify-center md:p-6"
      role="dialog"
    >
      <form
        className="w-full rounded-t-3xl bg-[var(--sloty-surface)] p-5 shadow-2xl md:max-w-lg md:rounded-3xl"
        onSubmit={handlePreview}
      >
        <div className="space-y-1">
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            إلغاء حجز أسبوعي
          </p>
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            مراجعة الإلغاء
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            يجب مراجعة تأثير الإلغاء من الخادم قبل تأكيده.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>تاريخ السريان</span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
              disabled={isPreviewLoading || isSubmitting}
              onChange={(event) => setEffectiveDate(event.target.value)}
              type="date"
              value={effectiveDate}
            />
          </label>

          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>سبب الإلغاء</span>
            <textarea
              className="min-h-24 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
              disabled={isPreviewLoading || isSubmitting}
              onChange={(event) => setReason(event.target.value)}
              value={reason}
            />
          </label>
        </div>

        {preview ? (
          <div className="mt-4 space-y-2 rounded-xl bg-[var(--sloty-bg)] px-3 py-3 text-sm font-bold text-[var(--sloty-text-primary)]">
            <p>تمت مراجعة الإلغاء من الخادم.</p>
            {preview.effective_date ? (
              <p>تاريخ السريان: {preview.effective_date}</p>
            ) : null}
            {preview.deposit_status ? (
              <p>
                حالة التأمين:{' '}
                {recurringDepositStatusLabels[preview.deposit_status]}
              </p>
            ) : null}
            {preview.refund_due_at ? (
              <p>موعد الاسترداد: {formatArabicDateTime(preview.refund_due_at)}</p>
            ) : null}
            {preview.message ? <p>{preview.message}</p> : null}
          </div>
        ) : null}

        {validationError || error ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {validationError ?? error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          {preview ? (
            <AppButton
              disabled={isSubmitting}
              fullWidth
              onClick={() => void onCancel(values)}
              type="button"
              variant="danger"
            >
              {isSubmitting ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
            </AppButton>
          ) : (
            <AppButton disabled={isPreviewLoading} fullWidth type="submit">
              {isPreviewLoading ? 'جاري المراجعة...' : 'مراجعة الإلغاء'}
            </AppButton>
          )}
          <AppButton
            disabled={isPreviewLoading || isSubmitting}
            fullWidth
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            إغلاق
          </AppButton>
        </div>
      </form>
    </div>
  )
}

