import { useState, type FormEvent } from 'react'
import {
  getFirstFieldErrorMessage,
} from '../../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../../core/api/apiClient'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { UnsavedChangesPrompt } from '../../../../shared/components/AppSheet/UnsavedChangesPrompt'

export interface CancelTransactionValues {
  reason: string
}

export interface CancelTransactionSheetProps {
  isSubmitting: boolean
  error: string | null
  fieldErrors?: Record<string, ApiFieldError[]> | null
  onClose: () => void
  onSubmit: (values: CancelTransactionValues) => Promise<void> | void
}

export function CancelTransactionSheet({
  error,
  fieldErrors = null,
  isSubmitting,
  onClose,
  onSubmit,
}: CancelTransactionSheetProps) {
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const reasonFieldError = getFirstFieldErrorMessage(fieldErrors, 'reason')

  function requestClose(): boolean | void {
    if (reason.length > 0) {
      setIsDiscardPromptOpen(true)
      return false
    }

    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedReason = reason.trim()

    if (!trimmedReason) {
      setValidationError('سبب الإلغاء مطلوب')
      return
    }

    setValidationError(null)
    await onSubmit({ reason: trimmedReason })
  }

  return (
    <>
      <AppSheet ariaLabel="إلغاء تسجيل الدفعة" onRequestClose={requestClose}>
      <form
        className="p-5 pt-14"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            إلغاء تسجيل الدفعة
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            هذا تصحيح لدفعة مسجلة بالخطأ، وليس عملية استرداد للعميل. ستظل
            الدفعة ظاهرة في السجل، لكن مش هتدخل ضمن الإجماليات.
          </p>
        </div>

        <label className="mt-5 block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
          <span>سبب الإلغاء</span>
          <textarea
            className="min-h-24 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 text-base font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20 sm:text-sm"
            disabled={isSubmitting}
            onChange={(event) => {
              setReason(event.target.value)
              setValidationError(null)
            }}
            value={reason}
          />
        </label>
        {reasonFieldError ? (
          <p className="mt-2 text-xs font-bold text-[var(--sloty-danger)]">
            {reasonFieldError}
          </p>
        ) : null}

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
            variant="danger"
          >
            {isSubmitting ? 'جاري الإلغاء...' : 'تأكيد إلغاء تسجيل الدفعة'}
          </AppButton>
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
