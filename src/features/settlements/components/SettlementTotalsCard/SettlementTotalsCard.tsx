import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import type { SettlementPaymentTotals } from '../../settlements.types'

export interface SettlementTotalsCardProps {
  totals: SettlementPaymentTotals
}

const totalItems: Array<{
  key: keyof SettlementPaymentTotals
  label: string
}> = [
  { key: 'cash', label: 'نقدي' },
  { key: 'digital_wallet', label: 'محفظة رقمية' },
  { key: 'bank_transfer', label: 'تحويل بنكي' },
  { key: 'other', label: 'أخرى' },
  { key: 'total', label: 'الإجمالي' },
]

/**
 * Displays backend-provided settlement totals without recalculating them.
 */
export function SettlementTotalsCard({ totals }: SettlementTotalsCardProps) {
  return (
    <AppCard className="space-y-4">
      <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
        إجمالي المعاملات
      </h2>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {totalItems.map((item) => (
          <div
            className={[
              'rounded-xl bg-[var(--sloty-bg)] px-3 py-3',
              item.key === 'total' ? 'sloty-green-surface text-white' : '',
            ].join(' ')}
            key={item.key}
          >
            <dt
              className={[
                'text-xs font-bold',
                item.key === 'total'
                  ? 'text-white/80'
                  : 'text-[var(--sloty-text-muted)]',
              ].join(' ')}
            >
              {item.label}
            </dt>
            <dd className="mt-1 text-lg font-black" dir="ltr">
              {totals[item.key]}
            </dd>
          </div>
        ))}
      </dl>
    </AppCard>
  )
}
