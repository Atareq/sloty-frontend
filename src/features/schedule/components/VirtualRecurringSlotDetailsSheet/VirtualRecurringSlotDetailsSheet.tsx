import { RepeatOff } from 'lucide-react'
import { useState } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import {
  bookingActionCopy,
  recurringCopy,
} from '../../../../shared/copy/appCopy'
import { formatArabicDateWithWeekday } from '../../../../shared/utils/date'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type { ScheduleBooking } from '../../schedule.types'
import { formatTime12Hour } from '../../scheduleBoard.helpers'

export interface VirtualRecurringSlotDetailsSheetProps {
  slot: ScheduleBooking
  courtName: string
  error?: string | null
  isSubmitting?: boolean
  onClose: () => void
  onEndRecurrence: (anchorBookingId: number) => void
}

/**
 * Presentational details for a RECURRING_RESERVED Schedule slot.
 *
 * The selected slot owns occurrence date/time/price. Recurring context owns
 * customer identity and the anchor Booking ID used only for end-recurrence.
 * This is not a concrete Booking and must not reuse BookingActionSheet.
 */
export function VirtualRecurringSlotDetailsSheet({
  courtName,
  error = null,
  isSubmitting = false,
  onClose,
  onEndRecurrence,
  slot,
}: VirtualRecurringSlotDetailsSheetProps) {
  const [isEndRecurrenceConfirming, setIsEndRecurrenceConfirming] =
    useState(false)
  const context = slot.recurringContext
  const anchorBookingId =
    context?.anchor_booking_id ?? slot.recurringAnchorBookingId ?? null
  const dateLabel = slot.date
    ? formatArabicDateWithWeekday(slot.date)
    : null
  const timeRange = `${formatTime12Hour(slot.startTime)} – ${formatTime12Hour(slot.endTime)}`
  const showCurrentPrice =
    slot.slotPrice !== null &&
    slot.slotPrice !== undefined &&
    slot.slotPrice !== ''

  function closeDetails(): void {
    setIsEndRecurrenceConfirming(false)
    onClose()
  }

  return (
    <>
      <AppSheet
        ariaLabel="تفاصيل المعاد"
        isOpen
        onRequestClose={closeDetails}
      >
        <div className="p-5 pt-14">
          <header>
            <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
              تفاصيل المعاد
            </p>
            <h2 className="mt-2 text-2xl font-black text-[var(--sloty-text-primary)]">
              {context?.customer_name || 'عميل غير محدد'}
            </h2>
            {context?.customer_phone ? (
              <p
                className="mt-1 w-fit text-base font-bold text-[var(--sloty-text-primary)]"
                dir="ltr"
              >
                {context.customer_phone}
              </p>
            ) : null}
            {dateLabel ? (
              <p className="mt-4 text-lg font-black text-[var(--sloty-primary-dark)]">
                {dateLabel}
              </p>
            ) : null}
            <p
              className="mt-1 text-base font-bold text-[var(--sloty-text-primary)]"
              dir="ltr"
            >
              {timeRange}
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
              {courtName}
            </p>
            <p className="mt-3 text-base font-semibold text-[var(--sloty-primary-dark)]">
              {recurringCopy.weeklyReserved}
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-[var(--sloty-text-muted)]">
              {recurringCopy.weeklyHelper}
            </p>
          </header>

          {showCurrentPrice ? (
            <dl className="mt-4 rounded-2xl bg-[var(--sloty-bg)] p-3">
              <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                السعر الحالي
              </dt>
              <dd
                className="mt-1 font-black text-[var(--sloty-text-primary)]"
                dir="ltr"
              >
                {formatMoneyAmount(slot.slotPrice, { suffix: 'ج.م' })}
              </dd>
            </dl>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
              {error}
            </p>
          ) : null}

          {anchorBookingId ? (
            <AppButton
              className="mt-5"
              disabled={isSubmitting}
              fullWidth
              onClick={() => setIsEndRecurrenceConfirming(true)}
              type="button"
              variant="secondary"
            >
              <span className="inline-flex items-center gap-2">
                <RepeatOff aria-hidden="true" className="h-4 w-4" />
                {bookingActionCopy.endRecurrence}
              </span>
            </AppButton>
          ) : (
            <p className="mt-5 rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-medium text-[var(--sloty-text-muted)]">
              تعذر عرض خيارات التكرار لهذا المعاد.
            </p>
          )}
        </div>
      </AppSheet>

      {anchorBookingId && isEndRecurrenceConfirming ? (
        <AppSheet
          ariaLabel={recurringCopy.stopWeeklyConfirmTitle}
          isOpen
          onRequestClose={() => setIsEndRecurrenceConfirming(false)}
        >
          <div className="p-5 pt-14">
            <h2 className="text-xl font-bold text-[var(--sloty-text-primary)]">
              {recurringCopy.stopWeeklyConfirmTitle}
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[var(--sloty-text-muted)]">
              {recurringCopy.stopWeeklyConfirmBody}
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AppButton
                disabled={isSubmitting}
                fullWidth
                onClick={() => setIsEndRecurrenceConfirming(false)}
                type="button"
                variant="secondary"
              >
                رجوع
              </AppButton>
              <AppButton
                disabled={isSubmitting}
                fullWidth
                onClick={() => onEndRecurrence(anchorBookingId)}
                type="button"
                variant="secondary"
              >
                {isSubmitting
                  ? 'جاري الإيقاف...'
                  : bookingActionCopy.endRecurrence}
              </AppButton>
            </div>
          </div>
        </AppSheet>
      ) : null}
    </>
  )
}
