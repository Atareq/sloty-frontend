import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Country } from 'react-phone-number-input'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { UnsavedChangesPrompt } from '../../../../shared/components/AppSheet/UnsavedChangesPrompt'
import { SlotyPhoneNumberInput } from '../../../../shared/components/PhoneNumberInput/PhoneNumberInput'
import { customerCopy } from '../../../../shared/copy/appCopy'
import {
  getCountryFromPhoneNumber,
  normalizeSlotyPhoneNumber,
} from '../../../../shared/validation/phone'
import type { BookingIntentRecord } from '../../../../offline/offline.types'

export interface BookingRequestCustomerEditValues {
  customer_name: string
  customer_phone: string
  notes?: string
}

interface BookingRequestCustomerEditSheetProps {
  isSubmitting: boolean
  request: BookingIntentRecord
  onClose: () => void
  onSubmit: (values: BookingRequestCustomerEditValues) => Promise<void>
}

/**
 * Edits only customer-entered request data for a locally stored Booking Request.
 *
 * Slot identity, recurrence intent, local identity, and `client_request_id`
 * stay unchanged so future sync can keep using the same logical request.
 */
export function BookingRequestCustomerEditSheet({
  isSubmitting,
  onClose,
  onSubmit,
  request,
}: BookingRequestCustomerEditSheetProps) {
  const [customerName, setCustomerName] = useState(request.customer_name)
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    return getCountryFromPhoneNumber(request.customer_phone) ?? 'EG'
  })
  const [customerPhone, setCustomerPhone] = useState(
    request.customer_phone,
  )
  const [notes, setNotes] = useState(request.notes ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const isDirty =
    customerName !== request.customer_name ||
    customerPhone !== request.customer_phone ||
    notes !== (request.notes ?? '')

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
    const trimmedPhone = customerPhone.trim()

    if (!trimmedName || !trimmedPhone) {
      setValidationError('اسم العميل ورقم الموبايل مطلوبان')
      return
    }

    const normalizedPhone = normalizeSlotyPhoneNumber(
      trimmedPhone,
      selectedCountry,
    )

    if (!normalizedPhone) {
      setValidationError('رقم الموبايل غير صحيح')
      return
    }

    setValidationError(null)

    await onSubmit({
      customer_name: trimmedName,
      customer_phone: normalizedPhone,
      notes: trimmedNotes || undefined,
    })
  }

  return (
    <>
      <AppSheet ariaLabel="تعديل طلب الحجز" onRequestClose={requestClose}>
        <form className="p-5 pt-14" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
              تعديل بيانات طلب الحجز
            </h2>
            <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
              التعديل هيحافظ على نفس المعاد ونفس رقم الطلب.
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

            <div className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>{customerCopy.mobileNumber}</span>
              <SlotyPhoneNumberInput
                country={selectedCountry}
                disabled={isSubmitting}
                error={validationError === 'رقم الموبايل غير صحيح'}
                onChange={setCustomerPhone}
                onCountryChange={setSelectedCountry}
                raw
                value={customerPhone}
              />
            </div>

            <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>ملاحظات</span>
              <textarea
                className="sloty-mobile-safe-input min-h-20 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                disabled={isSubmitting}
                onChange={(event) => setNotes(event.target.value)}
                value={notes}
              />
            </label>
          </div>

          {validationError ? (
            <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
              {validationError}
            </p>
          ) : null}

          <div className="mt-5">
            <AppButton
              disabled={isSubmitting}
              fullWidth
              type="submit"
              variant="primary"
            >
              {isSubmitting ? 'جاري حفظ التعديل...' : 'حفظ التعديل'}
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
