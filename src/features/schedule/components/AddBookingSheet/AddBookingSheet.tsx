import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  getFirstFieldErrorMessage,
} from '../../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../../core/api/apiClient'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { UnsavedChangesPrompt } from '../../../../shared/components/AppSheet/UnsavedChangesPrompt'
import type { Value } from 'react-phone-number-input'
import { SlotyPhoneNumberInput } from '../../../../shared/components/PhoneNumberInput/PhoneNumberInput'
import { isValidSlotyPhoneNumber } from '../../../../shared/validation/phone'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import { formatArabicDateTime } from '../../../../shared/utils/date'
import { formatTime12Hour } from '../../scheduleBoard.helpers'

export interface AddBookingSheetValues {
  booking_type?: 'weekly'
  customer_name: string
  customer_phone: string
  notes?: string
}

export interface AddBookingSheetProps {
  courtName: string
  dateLabel: string
  startTime: string
  endTime: string
  isSubmitting: boolean
  error: string | null
  fieldErrors?: Record<string, ApiFieldError[]> | null
  slotPrice?: string | null
  canStartRecurring?: boolean | null
  recurringBlockedReason?: string | null
  firstRecurringConflictStart?: string | null
  onClose: () => void
  onSubmit: (values: AddBookingSheetValues) => Promise<void>
}

/**
 * Quick manual booking sheet for available/cancelled Booking Board slots.
 *
 * It keeps one-time and weekly creation in the same customer-first form.
 * Weekly availability validation remains internal to the submit callback.
 */
export function AddBookingSheet({
  canStartRecurring = null,
  courtName,
  dateLabel,
  endTime,
  error,
  fieldErrors = null,
  firstRecurringConflictStart = null,
  isSubmitting,
  onClose,
  onSubmit,
  recurringBlockedReason = null,
  slotPrice = null,
  startTime,
}: AddBookingSheetProps) {
  const [isRecurring, setIsRecurring] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState<Value | undefined>()
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const nameFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'customer_name',
  )
  const phoneFieldError =
    getFirstFieldErrorMessage(fieldErrors, 'customer_phone') ??
    getFirstFieldErrorMessage(fieldErrors, 'phone_number')
  const isRecurringBlocked = canStartRecurring === false
  const recurringConflictDate = formatArabicDateTime(
    firstRecurringConflictStart,
  )

  const displayStartTime = formatTime12Hour(startTime)
  const displayEndTime = formatTime12Hour(endTime)
  const isDirty =
    isRecurring ||
    customerName.length > 0 ||
    Boolean(customerPhone) ||
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

    const trimmedName = customerName.trim()
    const trimmedNotes = notes.trim()

    if (!trimmedName || !customerPhone) {
      setValidationError('اسم العميل ورقم الهاتف مطلوبان')
      return
    }

    if (!isValidSlotyPhoneNumber(customerPhone)) {
      setValidationError('رقم الهاتف غير صحيح')
      return
    }

    setValidationError(null)

    const values: AddBookingSheetValues = {
      ...(isRecurring ? { booking_type: 'weekly' as const } : {}),
      customer_name: trimmedName,
      customer_phone: customerPhone,
      notes: trimmedNotes || undefined,
    }

    await onSubmit(values)
  }

  return (
    <>
      <AppSheet ariaLabel="حجز جديد" onRequestClose={requestClose}>
        <form className="p-5 pt-14" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            حجز جديد
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            {courtName} - {dateLabel}
          </p>
          <p
            className="text-lg font-black text-[var(--sloty-primary-dark)]"
            dir="ltr"
          >
            {displayStartTime} - {displayEndTime}
          </p>
          {slotPrice ? (
            <p className="text-sm font-black text-[var(--sloty-primary-dark)]">
              السعر {formatMoneyAmount(slotPrice)}
            </p>
          ) : null}
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>اسم العميل</span>
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
            <span>رقم الهاتف</span>

            <SlotyPhoneNumberInput
              disabled={isSubmitting}
              error={
                validationError === 'رقم الهاتف غير صحيح' ||
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

          {canStartRecurring !== null ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-3 text-[var(--sloty-text-primary)]">
              <input
                checked={isRecurring}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--sloty-primary)]"
                disabled={isSubmitting || isRecurringBlocked}
                onChange={(event) => {
                  setIsRecurring(event.target.checked)
                  setValidationError(null)
                }}
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-black">
                  ثبّت نفس الموعد كل أسبوع
                </span>
                <span className="mt-1 block text-xs font-bold leading-5 text-[var(--sloty-text-muted)]">
                  {isRecurringBlocked
                    ? 'غير متاح تثبيت الموعد لهذا الحجز.'
                    : 'هيتحجز نفس اليوم والساعة للعميل كل أسبوع.'}
                </span>
                {isRecurringBlocked && recurringBlockedReason ? (
                  <span className="mt-1 block text-xs font-bold leading-5 text-amber-800">
                    {recurringBlockedReason === 'ACTIVE_RECURRENCE'
                      ? 'الموعد ده مثبت أسبوعيًا لعميل آخر.'
                      : recurringConflictDate
                        ? `فيه حجز آخر يوم ${recurringConflictDate}.`
                        : 'فيه حجز آخر بيتعارض مع تثبيت الموعد أسبوعيًا.'}
                  </span>
                ) : null}
              </span>
            </label>
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
            {isSubmitting ? 'جاري الحجز...' : 'تأكيد الحجز'}
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
