import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { financeCopy } from '../../../../shared/copy/appCopy'
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
  return (
    <AppSheet
      className="md:max-w-lg"
      isOpen={isOpen}
      onRequestClose={() => {
        if (!isSubmitting) {
          onClose()
        }
      }}
      title={financeCopy.confirmReceiveAmount}
    >
      <section className="p-4 sm:p-5">
        <div className="space-y-4 pt-7">
          <div>
            <h2
              className="text-lg font-black text-[var(--sloty-text-primary)]"
            >
              {financeCopy.confirmReceiveAmount}
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--sloty-text-muted)]">
              هل تؤكد استلام {formatMoneyAmount(totalAmount)} من{' '}
              {collectorName}؟
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--sloty-text-muted)]">
              بعد التأكيد المبلغ مش هيفضل ظاهر ضمن المبالغ اللي لسه مع الموظف.
            </p>
          </div>

          <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3 text-sm font-bold text-[var(--sloty-text-primary)]">
            عدد المعاملات: {transactionCount}
          </div>

          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>ملاحظات اختيارية</span>
            <textarea
              className="sloty-mobile-safe-input min-h-24 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-2 text-right outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
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
              {isSubmitting
                ? 'جاري تأكيد الاستلام...'
                : financeCopy.confirmReceiveAmount}
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
    </AppSheet>
  )
}
