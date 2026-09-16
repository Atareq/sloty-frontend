import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  getFirstFieldErrorMessage,
} from '../../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../../core/api/apiClient'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { UnsavedChangesPrompt } from '../../../../shared/components/AppSheet/UnsavedChangesPrompt'
import type {
  BookingListItem,
  BookingNotesUpdatePayload,
} from '../../../schedule/scheduleApi.types'

export interface EditBookingDetailsSheetProps {
  booking: BookingListItem
  isSubmitting: boolean
  error: string | null
  fieldErrors?: Record<string, ApiFieldError[]> | null
  onClose: () => void
  onSubmit: (payload: BookingNotesUpdatePayload) => Promise<void>
}

/**
 * Edits booking notes only. Customer identity fields are immutable on backend PATCH.
 */
export function EditBookingDetailsSheet({
  booking,
  error,
  fieldErrors = null,
  isSubmitting,
  onClose,
  onSubmit,
}: EditBookingDetailsSheetProps) {
  const [notes, setNotes] = useState(booking.notes ?? '')
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const notesFieldError = getFirstFieldErrorMessage(fieldErrors, 'notes')
  const initialNotes = booking.notes ?? ''
  const isDirty = notes !== initialNotes

  function requestClose(): boolean | void {
    if (isDirty) {
      setIsDiscardPromptOpen(true)
      return false
    }

    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({
      notes: notes.trim(),
    })
  }

  return (
    <>
      <AppSheet
        ariaLabel="تعديل ملاحظات الحجز"
        isOpen
        onRequestClose={requestClose}
        title="تعديل ملاحظات الحجز"
      >
        <form className="p-5 pt-14 text-right" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
              تعديل ملاحظات الحجز
            </h2>
            <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
              بيانات العميل غير قابلة للتعديل حفاظاً على دقة السجلات. يمكنك تعديل الملاحظات فقط.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-3.5 space-y-2">
              <div className="text-xs font-semibold text-[var(--sloty-text-muted)]">
                بيانات العميل (للقراءة فقط)
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-[var(--sloty-text-primary)]">
                  {booking.customer_name || 'غير محدد'}
                </span>
                <span dir="ltr" className="text-xs font-medium text-[var(--sloty-text-muted)]">
                  {booking.customer_phone || ''}
                </span>
              </div>
            </div>

            <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>ملاحظات</span>
              <textarea
                className="sloty-mobile-safe-input min-h-24 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                disabled={isSubmitting}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="أضف ملاحظات على الحجز..."
                value={notes}
              />
            </label>
            {notesFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {notesFieldError}
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
              {error}
            </p>
          ) : null}

          <div className="mt-5">
            <AppButton
              disabled={isSubmitting}
              fullWidth
              type="submit"
              variant="primary"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
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
