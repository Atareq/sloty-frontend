import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import { hasPositiveRemainingAmount } from '../../../bookings/bookingPayment.helpers'

export interface CompleteBookingConfirmSheetProps {
  remainingAmount?: string | null
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => Promise<void> | void
  onRequestPayment: () => void
}

/**
 * Explicit completion confirmation before locking a booking lifecycle state.
 */
export function CompleteBookingConfirmSheet({
  remainingAmount,
  isSubmitting,
  error,
  onClose,
  onConfirm,
  onRequestPayment,
}: CompleteBookingConfirmSheetProps) {
  const hasRemaining = hasPositiveRemainingAmount(remainingAmount)

  return (
    <AppSheet ariaLabel="إكمال الحجز" onRequestClose={onClose}
    >
      <div className="p-5 pt-14">
        <div className="space-y-2">
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            إكمال الحجز
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            {hasRemaining
              ? 'يوجد مبلغ متبقي على هذا الحجز. يجب تسجيل الدفعة أولًا قبل إكمال الحجز.'
              : 'سيتم اعتبار الحجز مكتملاً بعد التأكيد.'}
          </p>
          {hasRemaining ? (
            <dl className="rounded-2xl bg-[var(--sloty-bg)] p-3 text-sm">
              <dt className="font-bold text-[var(--sloty-text-muted)]">
                المبلغ المتبقي
              </dt>
              <dd
                className="mt-1 font-black text-[var(--sloty-primary-dark)]"
                dir="ltr"
              >
                {formatMoneyAmount(remainingAmount)}
              </dd>
            </dl>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppButton
            disabled={isSubmitting}
            fullWidth
            onClick={hasRemaining ? onRequestPayment : onConfirm}
            type="button"
            variant="primary"
          >
            {isSubmitting
              ? 'جاري إكمال الحجز...'
              : hasRemaining
                ? 'تسجيل الدفعة'
                : 'تأكيد إكمال الحجز'}
          </AppButton>
          <AppButton
            disabled={isSubmitting}
            fullWidth
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            رجوع
          </AppButton>
        </div>
      </div>
    </AppSheet>
  )
}
