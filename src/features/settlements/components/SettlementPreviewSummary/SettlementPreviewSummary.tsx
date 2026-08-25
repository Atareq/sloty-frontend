import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type { SettlementPreview } from '../../settlements.types'

interface SettlementPreviewSummaryProps {
  preview: SettlementPreview
  mode?: 'management' | 'staff'
}

export function SettlementPreviewSummary({
  mode = 'management',
  preview,
}: SettlementPreviewSummaryProps) {
  return (
    <AppCard className="space-y-4">
      <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
        {mode === 'staff' ? 'عهدتي' : 'ملخص العهدة'}
      </h2>

      <dl className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3">
          <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
            {mode === 'staff' ? 'الموظف' : 'الموظف المحصل'}
          </dt>
          <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
            {preview.collected_by_name}
          </dd>
        </div>

        <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3">
          <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
            عدد التحصيلات
          </dt>
          <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
            {preview.transaction_count}
          </dd>
        </div>

        <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3">
          <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
            {mode === 'staff' ? 'معاك دلوقتي' : 'إجمالي العهدة'}
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
