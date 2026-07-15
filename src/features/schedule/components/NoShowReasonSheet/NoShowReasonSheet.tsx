import { useState } from 'react'
import type { FormEvent } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'

export interface NoShowReasonValues {
  reason?: string
  notes?: string
}

export interface NoShowReasonSheetProps {
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (values: NoShowReasonValues) => Promise<void> | void
}

const reasonOptions = [
  'لم يحضر العميل',
  'تأخر العميل عن الموعد',
  'تعذر التواصل مع العميل',
  'أخرى',
]

/**
 * Confirms no-show lifecycle action with optional reason details.
 */
export function NoShowReasonSheet({
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: NoShowReasonSheetProps) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const requiresNotes = reason === 'أخرى'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedReason = reason.trim()
    const trimmedNotes = notes.trim()

    if (requiresNotes && !trimmedNotes) {
      setValidationError('اكتب ملاحظة توضح سبب عدم الحضور')
      return
    }

    setValidationError(null)
    await onSubmit({
      ...(trimmedReason ? { reason: trimmedReason } : {}),
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
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
            تسجيل عدم حضور
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            سيتم تسجيل العميل كعدم حضور لهذا الحجز
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>سبب عدم الحضور</span>
            <select
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
              disabled={isSubmitting}
              onChange={(event) => {
                setReason(event.target.value)
                setValidationError(null)
              }}
              value={reason}
            >
              <option value="">بدون سبب محدد</option>
              {reasonOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

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
        </div>

        {validationError || error ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {validationError ?? error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppButton
            disabled={isSubmitting}
            fullWidth
            type="submit"
            variant="primary"
          >
            {isSubmitting ? 'جاري التسجيل...' : 'تأكيد عدم الحضور'}
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
