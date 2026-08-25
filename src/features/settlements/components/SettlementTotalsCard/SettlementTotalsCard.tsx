import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type { SettlementPaymentMethod } from '../../settlements.types'
import { settlementPaymentMethodLabels } from '../../settlements.types'

export interface SettlementTotalsCardProps {
  totalAmount?: string | null
  transactionCount?: number
  totalsByPaymentMethod?: Partial<Record<SettlementPaymentMethod, string>>
}

const paymentMethods: SettlementPaymentMethod[] = [
  'CASH',
  'DIGITAL_WALLET',
  'BANK_TRANSFER',
  'OTHER',
]

/**
 * Displays backend-provided settlement totals without recalculating them.
 */
export function SettlementTotalsCard({
  totalAmount,
  transactionCount,
  totalsByPaymentMethod = {},
}: SettlementTotalsCardProps) {
  return (
    <AppCard className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
            إجمالي العهدة
          </h2>
          {transactionCount !== undefined ? (
            <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
              عدد التحصيلات: {transactionCount}
            </p>
          ) : null}
        </div>
        {totalAmount ? (
          <p
            className="sloty-green-surface rounded-2xl px-4 py-2 text-lg font-black text-white"
            dir="ltr"
          >
            {formatMoneyAmount(totalAmount)}
          </p>
        ) : null}
      </div>

      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {paymentMethods.map((method) => (
          <div
            className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3"
            key={method}
          >
            <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
              {settlementPaymentMethodLabels[method]}
            </dt>
            <dd
              className="mt-1 text-lg font-black text-[var(--sloty-text-primary)]"
              dir="ltr"
            >
              {formatMoneyAmount(totalsByPaymentMethod[method] ?? '0.00')}
            </dd>
          </div>
        ))}
      </dl>
    </AppCard>
  )
}
