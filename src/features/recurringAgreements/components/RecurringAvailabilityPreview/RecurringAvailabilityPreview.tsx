import { formatMoneyAmount } from '../../../../shared/utils/money'
import { formatArabicDateWithWeekday } from '../../../../shared/utils/date'
import type { RecurringAgreementAvailabilityResponse } from '../../recurringAgreements.types'

export interface RecurringAvailabilityPreviewProps {
  availability: RecurringAgreementAvailabilityResponse
}

/**
 * Read-only backend recurring availability summary.
 */
export function RecurringAvailabilityPreview({
  availability,
}: RecurringAvailabilityPreviewProps) {
  const unavailableSlots = availability.slots.filter((slot) => !slot.available)

  return (
    <div
      className={[
        'space-y-3 rounded-xl border px-3 py-3 text-sm',
        availability.all_available
          ? 'border-[var(--sloty-primary)]/30 bg-[var(--sloty-soft-mint)]'
          : 'border-[var(--sloty-danger)]/25 bg-[var(--sloty-danger-soft)]',
      ].join(' ')}
    >
      <p className="font-black text-[var(--sloty-text-primary)]">
        {availability.all_available
          ? 'الموعد متاح للحجز الأسبوعي'
          : 'يوجد تعارض في بعض الأسابيع'}
      </p>
      <p className="font-bold text-[var(--sloty-text-muted)]">
        مدة الفحص: {availability.horizon_weeks} أسبوع
      </p>
      <p className="font-bold text-[var(--sloty-text-muted)]">
        الأسابيع المتاحة: {availability.slots.length - unavailableSlots.length}
        {' / '}
        {availability.slots.length}
      </p>
      <div className="max-h-40 space-y-2 overflow-auto">
        {availability.slots.map((slot) => (
          <div
            className="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2"
            key={`${slot.date}-${slot.start_time}`}
          >
            <span className="font-bold text-[var(--sloty-text-primary)]">
              {formatArabicDateWithWeekday(slot.date)}
            </span>
            <span className="font-bold text-[var(--sloty-text-muted)]">
              {slot.slot_price ? formatMoneyAmount(slot.slot_price) : '-'}
            </span>
            <span
              className={[
                'text-xs font-black',
                slot.available
                  ? 'text-[var(--sloty-primary-dark)]'
                  : 'text-[var(--sloty-danger)]',
              ].join(' ')}
            >
              {slot.available ? 'متاح' : 'غير متاح'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

