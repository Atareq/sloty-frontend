import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import type { SettlementTransaction } from '../../settlements.types'
import { settlementPaymentMethodLabels } from '../../settlements.types'

export interface SettlementTransactionsListProps {
  transactions: SettlementTransaction[]
}

function formatDate(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/**
 * Read-only list of transactions included in a settlement preview/detail.
 */
export function SettlementTransactionsList({
  transactions,
}: SettlementTransactionsListProps) {
  if (transactions.length === 0) {
    return (
      <AppCard>
        <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
          لا توجد مبالغ غير مسواة لهذه البيانات
        </p>
      </AppCard>
    )
  }

  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {transactions.map((transaction) => {
        const createdLabel = formatDate(transaction.created)

        return (
          <AppCard className="space-y-3" key={transaction.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                  المبلغ
                </p>
                <p
                  className="mt-1 text-xl font-black text-[var(--sloty-primary-dark)]"
                  dir="ltr"
                >
                  {transaction.amount}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <span className="rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]">
                  {settlementPaymentMethodLabels[transaction.payment_method]}
                </span>
                {transaction.is_cancelled ? (
                  <span className="rounded-full bg-[var(--sloty-danger-soft)] px-3 py-1 text-xs font-black text-[var(--sloty-danger)]">
                    ملغي
                  </span>
                ) : null}
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm">
              {transaction.booking ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    الحجز
                  </dt>
                  <dd
                    className="font-black text-[var(--sloty-text-primary)]"
                    dir="ltr"
                  >
                    #{transaction.booking}
                  </dd>
                </div>
              ) : null}
              {transaction.created_by ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    الموظف
                  </dt>
                  <dd className="font-black text-[var(--sloty-text-primary)]">
                    {transaction.created_by.name}
                  </dd>
                </div>
              ) : null}
              {transaction.reference ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    المرجع
                  </dt>
                  <dd className="font-black text-[var(--sloty-text-primary)]">
                    {transaction.reference}
                  </dd>
                </div>
              ) : null}
              {createdLabel ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    التاريخ
                  </dt>
                  <dd className="font-black text-[var(--sloty-text-primary)]">
                    {createdLabel}
                  </dd>
                </div>
              ) : null}
              {transaction.cancellation_reason ? (
                <div className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-danger)]">
                    سبب الإلغاء
                  </dt>
                  <dd className="mt-1 font-black text-[var(--sloty-danger)]">
                    {transaction.cancellation_reason}
                  </dd>
                </div>
              ) : null}
              {transaction.is_settled ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
                  معاملة مقفلة
                </div>
              ) : null}
            </dl>
          </AppCard>
        )
      })}
    </section>
  )
}
