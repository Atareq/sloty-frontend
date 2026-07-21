import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type { SettlementPreview } from '../../settlements.types'

interface SettlementPreviewSummaryProps {
  preview: SettlementPreview
}

export function SettlementPreviewSummary({
  preview,
}: SettlementPreviewSummaryProps) {
  return (
    <AppCard className="space-y-4">
      <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
        ملخص المراجعة
      </h2>

      <dl className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3">
          <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
            الموظف المحصل
          </dt>
          <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
            {preview.collected_by_name}
          </dd>
        </div>

        <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3">
          <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
            عدد الدفعات
          </dt>
          <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
            {preview.transaction_count}
          </dd>
        </div>

        <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3">
          <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
            الإجمالي
          </dt>
          <dd className="mt-1 font-black text-[var(--sloty-primary-dark)]">
            {formatMoneyAmount(preview.total_amount)}
          </dd>
        </div>

        {preview.court_name ? (
          <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3">
            <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
              الملعب
            </dt>
            <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
              {preview.court_name}
            </dd>
          </div>
        ) : null}
      </dl>
    </AppCard>
  )
}
