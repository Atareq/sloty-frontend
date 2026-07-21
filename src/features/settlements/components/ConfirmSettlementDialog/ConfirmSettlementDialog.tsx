import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { formatMoneyAmount } from '../../../../shared/utils/money'

interface ConfirmSettlementDialogProps {
  isOpen: boolean
  collectorName: string
  totalAmount: string
  transactionCount: number
  isSubmitting: boolean
  error?: string | null
  notes: string
  onNotesChange: (value: string) => void
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmSettlementDialog({
  collectorName,
  error,
  isOpen,
  isSubmitting,
  notes,
  onClose,
  onConfirm,
  onNotesChange,
  totalAmount,
  transactionCount,
}: ConfirmSettlementDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center">
      <section
        aria-labelledby="confirm-settlement-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] p-4 shadow-[var(--sloty-shadow)]"
        role="dialog"
      >
        <div className="space-y-4">
          <div>
            <h2
              className="text-lg font-black text-[var(--sloty-text-primary)]"
              id="confirm-settlement-title"
            >
              تأكيد التسوية
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--sloty-text-muted)]">
              هل أنت متأكد من تسوية {formatMoneyAmount(totalAmount)} للموظف{' '}
              {collectorName}؟
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--sloty-text-muted)]">
              بعد التأكيد لن تظهر هذه الدفعات ضمن المبالغ غير المسواة.
            </p>
          </div>

          <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3 text-sm font-bold text-[var(--sloty-text-primary)]">
            عدد الدفعات: {transactionCount}
          </div>

          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>ملاحظات اختيارية</span>
            <textarea
              className="min-h-24 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-2 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              onChange={(event) => onNotesChange(event.target.value)}
              value={notes}
            />
          </label>

          {error ? (
            <p className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <AppButton disabled={isSubmitting} onClick={onConfirm}>
              {isSubmitting ? 'جاري تأكيد التسوية...' : 'تأكيد التسوية'}
            </AppButton>
            <AppButton
              disabled={isSubmitting}
              onClick={onClose}
              variant="secondary"
            >
              إلغاء
            </AppButton>
          </div>
        </div>
      </section>
    </div>
  )
}
