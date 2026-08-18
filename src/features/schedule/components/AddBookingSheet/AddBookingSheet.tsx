import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  getFirstFieldErrorMessage,
} from '../../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../../core/api/apiClient'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSelect } from '../../../../shared/components/AppSelect/AppSelect'
import type { Value } from 'react-phone-number-input'
import { SlotyPhoneNumberInput } from '../../../../shared/components/PhoneNumberInput/PhoneNumberInput'
import { isValidSlotyPhoneNumber } from '../../../../shared/validation/phone'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import {
  BookingTypeSelector,
  type BookingType,
} from '../../../recurringAgreements/components/BookingTypeSelector/BookingTypeSelector'
import { RecurringAvailabilityPreview } from '../../../recurringAgreements/components/RecurringAvailabilityPreview/RecurringAvailabilityPreview'
import type { RecurringAgreementAvailabilityResponse } from '../../../recurringAgreements/recurringAgreements.types'
import type { PaymentMethod } from '../../../transactions/transactions.types'
import { paymentMethodLabels } from '../../../transactions/transactions.types'
import { formatTime12Hour } from '../../scheduleBoard.helpers'

export interface AddBookingSheetValues {
  booking_type?: BookingType
  customer_name: string
  customer_phone: string
  payment_method?: PaymentMethod
  reference?: string
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
  isCheckingRecurringAvailability?: boolean
  recurringAvailability?: RecurringAgreementAvailabilityResponse | null
  recurringWeekdayLabel?: string
  slotPrice?: string | null
  onClose: () => void
  onCheckRecurringAvailability?: (values: AddBookingSheetValues) => Promise<void>
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
  fieldErrors = null,
  isCheckingRecurringAvailability = false,
  isSubmitting,
  onClose,
  onCheckRecurringAvailability,
  onSubmit,
  recurringAvailability = null,
  recurringWeekdayLabel,
  slotPrice = null,
  startTime,
}: AddBookingSheetProps) {
  const [bookingType, setBookingType] = useState<BookingType>('one_time')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState<Value | undefined>()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const nameFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'customer_name',
  )
  const phoneFieldError =
    getFirstFieldErrorMessage(fieldErrors, 'customer_phone') ??
    getFirstFieldErrorMessage(fieldErrors, 'phone_number')

  const displayStartTime = formatTime12Hour(startTime)
  const displayEndTime = formatTime12Hour(endTime)

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
      ...(bookingType === 'weekly' ? { booking_type: bookingType } : {}),
      customer_name: trimmedName,
      customer_phone: customerPhone,
      ...(bookingType === 'weekly'
        ? {
            payment_method: paymentMethod,
            reference: reference.trim() || undefined,
          }
        : {}),
      notes: trimmedNotes || undefined,
    }

    if (bookingType === 'weekly' && !recurringAvailability) {
      await onCheckRecurringAvailability?.(values)
      return
    }

    if (bookingType === 'weekly' && recurringAvailability?.all_available === false) {
      setValidationError('لا يمكن إنشاء الحجز الأسبوعي مع وجود تعارض')
      return
    }

    await onSubmit(values)
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-slate-700/45 p-0 md:items-center md:justify-center md:p-6"
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
            {displayStartTime} - {displayEndTime}
          </p>
          {slotPrice ? (
            <p className="text-sm font-black text-[var(--sloty-primary-dark)]">
              السعر {formatMoneyAmount(slotPrice)}
            </p>
          ) : null}
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            بعد حفظ الحجز يمكنك تسجيل دفعة أو تحرير الموعد.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <BookingTypeSelector
            disabled={isSubmitting || isCheckingRecurringAvailability}
            onChange={(value) => {
              setBookingType(value)
              setValidationError(null)
            }}
            value={bookingType}
          />

          {bookingType === 'weekly' ? (
            <div className="space-y-1 rounded-xl bg-[var(--sloty-bg)] px-3 py-3 text-sm font-bold text-[var(--sloty-text-primary)]">
              <p>يتكرر أسبوعيًا كل: {recurringWeekdayLabel ?? dateLabel}</p>

            </div>
          ) : null}

          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>اسم العميل</span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
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

          {bookingType === 'weekly' ? (
            <>
              <AppSelect
                disabled={isSubmitting || isCheckingRecurringAvailability}
                label="طريقة دفع التأمين"
                onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                options={Object.entries(paymentMethodLabels).map(
                  ([value, label]) => ({
                    value,
                    label,
                  }),
                )}
                value={paymentMethod}
              />

              <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
                <span>رقم العملية</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                  disabled={isSubmitting || isCheckingRecurringAvailability}
                  onChange={(event) => setReference(event.target.value)}
                  value={reference}
                />
              </label>
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-text-muted)]">
                اختياري حسب طريقة الدفع وسياسة الملعب
              </p>
            </>
          ) : null}

          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>ملاحظات</span>
            <textarea
              className="min-h-20 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
              disabled={isSubmitting}
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>

          {bookingType === 'weekly' && recurringAvailability ? (
            <RecurringAvailabilityPreview availability={recurringAvailability} />
          ) : null}
        </div>

        {validationError || error ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {validationError ?? error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <AppButton
            disabled={isSubmitting || isCheckingRecurringAvailability}
            fullWidth
            type="submit"
            variant="primary"
          >
            {isSubmitting || isCheckingRecurringAvailability
              ? 'جاري الحفظ...'
              : bookingType === 'weekly' && !recurringAvailability
                ? 'فحص الإتاحة'
                : bookingType === 'weekly'
                  ? 'تأكيد الحجز الأسبوعي'
                  : 'حفظ الحجز'}
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
