import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type { SettlementPaymentMethod } from '../../settlements.types'
import { settlementPaymentMethodLabels } from '../../settlements.types'

const paymentMethods: SettlementPaymentMethod[] = [
  'CASH',
  'DIGITAL_WALLET',
  'BANK_TRANSFER',
  'OTHER',
]

interface SettlementPaymentTotalsProps {
  totalsByPaymentMethod: Partial<Record<SettlementPaymentMethod, string>>
}

export function SettlementPaymentTotals({
  totalsByPaymentMethod,
}: SettlementPaymentTotalsProps) {
  const visibleMethods = paymentMethods.filter(
    (method) => totalsByPaymentMethod[method],
  )

  return (
    <AppCard className="space-y-4">
      <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
        تفصيل طرق الدفع
      </h2>

      {visibleMethods.length === 0 ? (
        <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
          لا توجد مبالغ مفصلة حسب طريقة الدفع.
        </p>
      ) : (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {visibleMethods.map((method) => (
            <div
              className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3"
              key={method}
            >
              <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                {settlementPaymentMethodLabels[method]}
              </dt>
              <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                {formatMoneyAmount(totalsByPaymentMethod[method])}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </AppCard>
  )
}
