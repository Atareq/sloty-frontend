import { useState } from 'react'
import type { FormEvent } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import type { Value } from 'react-phone-number-input'
import { SlotyPhoneNumberInput } from '../../../../shared/components/PhoneNumberInput/PhoneNumberInput'
import { isValidSlotyPhoneNumber } from '../../../../shared/validation/phone'

export interface AddBookingSheetValues {
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
  onClose: () => void
  onSubmit: (values: AddBookingSheetValues) => Promise<void>
}

/**
 * Quick manual booking sheet for available/cancelled Booking Board slots.
 *
 * It only collects customer basics. Payment and freeing a HOLD slot happen
 * after creation through focused booking/payment flows.
 */
export function AddBookingSheet({
  courtName,
  dateLabel,
  endTime,
  error,
  isSubmitting,
  onClose,
  onSubmit,
  startTime,
}: AddBookingSheetProps) {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState<Value | undefined>()
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

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

    await onSubmit({
      customer_name: trimmedName,
      customer_phone: customerPhone,
      notes: trimmedNotes || undefined,
    })
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-0 md:items-center md:justify-center md:p-6"
      role="dialog"
    >
      <form
        className="w-full rounded-t-3xl bg-[var(--sloty-surface)] p-5 shadow-2xl md:max-w-md md:rounded-3xl"
        onSubmit={handleSubmit}
      >
        <div className="space-y-1">
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            حجز يدوي سريع
          </p>
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            إضافة حجز
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            {courtName} - {dateLabel}
          </p>
          <p
            className="text-lg font-black text-[var(--sloty-primary-dark)]"
            dir="ltr"
          >
            {startTime} - {endTime}
          </p>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            بعد حفظ الحجز يمكنك تسجيل دفعة أو تحرير الموعد.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>اسم العميل</span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
              disabled={isSubmitting}
              onChange={(event) => setCustomerName(event.target.value)}
              value={customerName}
            />
          </label>

          <div className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>رقم الهاتف</span>

            <SlotyPhoneNumberInput
              disabled={isSubmitting}
              error={validationError === 'رقم الهاتف غير صحيح'}
              onChange={setCustomerPhone}
              value={customerPhone}
            />
          </div>

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
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الحجز'}
          </AppButton>
          <AppButton
            disabled={isSubmitting}
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
