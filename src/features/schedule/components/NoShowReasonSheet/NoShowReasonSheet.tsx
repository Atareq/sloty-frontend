import { useState } from 'react'
import type { FormEvent } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { UnsavedChangesPrompt } from '../../../../shared/components/AppSheet/UnsavedChangesPrompt'
import { AppSelect } from '../../../../shared/components/AppSelect/AppSelect'

export interface NoShowReasonValues {
  reason?: string
  notes?: string
}

export interface NoShowReasonSheetProps {
  isSubmitting: boolean
  error: string | null
  recurrenceWillEnd?: boolean
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
  recurrenceWillEnd = false,
  onClose,
  onSubmit,
}: NoShowReasonSheetProps) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const requiresNotes = reason === 'أخرى'
  const isDirty = reason.length > 0 || notes.length > 0

  function requestClose(): boolean | void {
    if (isDirty) {
      setIsDiscardPromptOpen(true)
      return false
    }

    onClose()
  }

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
    <>
      <AppSheet ariaLabel="تسجيل عدم حضور" onRequestClose={requestClose}>
        <form className="p-5 pt-14" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            تسجيل عدم حضور
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            {recurrenceWillEnd
              ? 'تسجيل الحجز كعدم حضور هيوقف كمان التكرار الأسبوعي.'
              : 'سيتم تسجيل العميل كعدم حضور لهذا الحجز'}
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <AppSelect
            disabled={isSubmitting}
            label="سبب عدم الحضور"
            onChange={(value) => {
              setReason(value)
              setValidationError(null)
            }}
            options={[
              { value: '', label: 'بدون سبب محدد' },
              ...reasonOptions.map((option) => ({
                value: option,
                label: option,
              })),
            ]}
            value={reason}
          />

          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>ملاحظات</span>
            <textarea
              className="min-h-24 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 text-base font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20 sm:text-sm"
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
