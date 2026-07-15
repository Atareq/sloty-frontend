import { useState } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import type { ScheduleBooking } from '../../schedule.types'

export interface RescheduleBookingSheetProps {
  bookingId: number | string
  slots: ScheduleBooking[]
  currentSlotId?: string
  courtName: string
  dateLabel: string
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (slot: ScheduleBooking) => Promise<void> | void
}

const selectableStatuses = new Set<ScheduleBooking['status']>([
  'available',
  'cancelled',
])

/**
 * Lets the user choose one generated available/cancelled slot for rescheduling.
 */
export function RescheduleBookingSheet({
  bookingId,
  slots,
  currentSlotId,
  courtName,
  dateLabel,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: RescheduleBookingSheetProps) {
  const selectableSlots = slots.filter(
    (slot) => selectableStatuses.has(slot.status) && slot.id !== currentSlotId,
  )
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const selectedSlot =
    selectableSlots.find((slot) => slot.id === selectedSlotId) ?? null

  async function handleSubmit(): Promise<void> {
    if (!selectedSlot) {
      setValidationError('اختر موعدًا جديدًا أولًا')
      return
    }

    setValidationError(null)
    await onSubmit(selectedSlot)
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-end bg-slate-950/45 p-0 md:items-center md:justify-center md:p-6"
      role="dialog"
    >
      <div className="w-full rounded-t-3xl bg-[var(--sloty-surface)] p-5 shadow-2xl md:max-w-md md:rounded-3xl">
        <div className="space-y-1">
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            حجز #{bookingId}
          </p>
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            تغيير الموعد
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            اختر موعدًا جديدًا متاحًا لهذا الحجز
          </p>
          <p className="text-sm font-bold text-[var(--sloty-primary-dark)]">
            {courtName} - {dateLabel}
          </p>
        </div>

        <div className="mt-5">
          {selectableSlots.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {selectableSlots.map((slot) => {
                const isSelected = slot.id === selectedSlotId

                return (
                  <button
                    className={[
                      'h-11 rounded-xl border px-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)] focus:ring-offset-2',
                      isSelected
                        ? 'sloty-green-surface-button border-[var(--sloty-primary-dark)] text-white'
                        : 'border-[var(--sloty-border)] bg-[var(--sloty-bg)] text-[var(--sloty-text-primary)] hover:border-[var(--sloty-primary)]',
                    ].join(' ')}
                    disabled={isSubmitting}
                    key={slot.id}
                    onClick={() => {
                      setSelectedSlotId(slot.id)
                      setValidationError(null)
                    }}
                    type="button"
                  >
                    <span dir="ltr">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="rounded-2xl bg-[var(--sloty-bg)] p-4 text-sm font-bold text-[var(--sloty-text-muted)]">
              لا توجد مواعيد متاحة في هذا اليوم
            </p>
          )}
        </div>

        {validationError || error ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {validationError ?? error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppButton
            disabled={isSubmitting || selectableSlots.length === 0}
            fullWidth
            onClick={handleSubmit}
            type="button"
            variant="primary"
          >
            {isSubmitting ? 'جاري تغيير الموعد...' : 'تأكيد تغيير الموعد'}
          </AppButton>
          <AppButton
            disabled={isSubmitting}
            fullWidth
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            إلغاء
          </AppButton>
        </div>
      </div>
    </div>
  )
}
