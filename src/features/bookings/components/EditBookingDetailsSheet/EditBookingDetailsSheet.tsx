import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Value } from 'react-phone-number-input'
import {
  getFirstFieldErrorMessage,
} from '../../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../../core/api/apiClient'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { UnsavedChangesPrompt } from '../../../../shared/components/AppSheet/UnsavedChangesPrompt'
import { SlotyPhoneNumberInput } from '../../../../shared/components/PhoneNumberInput/PhoneNumberInput'
import { customerCopy } from '../../../../shared/copy/appCopy'
import { isValidSlotyPhoneNumber } from '../../../../shared/validation/phone'
import type {
  BookingCustomerUpdatePayload,
  BookingListItem,
} from '../../../schedule/scheduleApi.types'

export interface EditBookingDetailsSheetProps {
  booking: BookingListItem
  isSubmitting: boolean
  error: string | null
  fieldErrors?: Record<string, ApiFieldError[]> | null
  onClose: () => void
  onSubmit: (payload: BookingCustomerUpdatePayload) => Promise<void>
}

function toPhoneValue(phone: string | null | undefined): Value | undefined {
  return phone ? (phone as Value) : undefined
}

/**
 * Edits customer identity only. Court, time, price, status, and recurrence
 * stay outside this form.
 */
export function EditBookingDetailsSheet({
  booking,
  error,
  fieldErrors = null,
  isSubmitting,
  onClose,
  onSubmit,
}: EditBookingDetailsSheetProps) {
  const [customerName, setCustomerName] = useState(booking.customer_name ?? '')
  const [customerPhone, setCustomerPhone] = useState<Value | undefined>(
    toPhoneValue(booking.customer_phone),
  )
  const [notes, setNotes] = useState(booking.notes ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const nameFieldError = getFirstFieldErrorMessage(fieldErrors, 'customer_name')
  const phoneFieldError =
    getFirstFieldErrorMessage(fieldErrors, 'customer_phone') ??
    getFirstFieldErrorMessage(fieldErrors, 'phone_number')
  const notesFieldError = getFirstFieldErrorMessage(fieldErrors, 'notes')
  const initialName = (booking.customer_name ?? '').trim()
  const initialPhone = booking.customer_phone ?? ''
  const initialNotes = booking.notes ?? ''
  const isDirty =
    customerName.trim() !== initialName ||
    (customerPhone ?? '') !== initialPhone ||
    notes !== initialNotes

  function requestClose(): boolean | void {
    if (isDirty) {
      setIsDiscardPromptOpen(true)
      return false
    }

    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = customerName.trim()
    const trimmedNotes = notes.trim()

    if (!trimmedName || !customerPhone) {
      setValidationError('اسم العميل ورقم الموبايل مطلوبان')
      return
    }

    if (!isValidSlotyPhoneNumber(customerPhone)) {
      setValidationError('رقم الموبايل غير صحيح')
      return
    }

    setValidationError(null)
    await onSubmit({
      customer_name: trimmedName,
      customer_phone: customerPhone,
      notes: trimmedNotes,
    })
  }

  return (
    <>
      <AppSheet
        ariaLabel="تعديل بيانات الحجز"
        onRequestClose={requestClose}
      >
        <form className="p-5 pt-14" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
              تعديل بيانات الحجز
            </h2>
            <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
              تقدر تعدّل اسم العميل ورقم الموبايل والملاحظات فقط.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>{customerCopy.customerName}</span>
              <input
                className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                disabled={isSubmitting}
                onChange={(event) => setCustomerName(event.target.value)}
                value={customerName}
              />
            </label>
            {nameFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {nameFieldError}
              </p>
            ) : null}

            <div className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>{customerCopy.mobileNumber}</span>
              <SlotyPhoneNumberInput
                disabled={isSubmitting}
                error={
                  validationError === 'رقم الموبايل غير صحيح' ||
                  Boolean(phoneFieldError)
                }
                onChange={setCustomerPhone}
                value={customerPhone}
              />
            </div>
            {phoneFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {phoneFieldError}
              </p>
            ) : null}

            <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>ملاحظات</span>
              <textarea
                className="sloty-mobile-safe-input min-h-20 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                disabled={isSubmitting}
                onChange={(event) => setNotes(event.target.value)}
                value={notes}
              />
            </label>
            {notesFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {notesFieldError}
              </p>
            ) : null}
          </div>

          {validationError || error ? (
            <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
              {validationError ?? error}
            </p>
          ) : null}

          <div className="mt-5">
            <AppButton
              disabled={isSubmitting}
              fullWidth
              type="submit"
              variant="primary"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ البيانات'}
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
