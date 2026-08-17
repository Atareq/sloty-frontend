import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type { SettlementPreviewTransaction } from '../../settlements.types'
import { settlementPaymentMethodLabels } from '../../settlements.types'
import {
  getTransactionType,
  transactionTypeLabels,
} from '../../../transactions/transactions.types'

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

function getReference(transaction: SettlementPreviewTransaction): string | null {
  return transaction.payment_reference || transaction.reference || null
}

interface SettlementPreviewTransactionsListProps {
  transactions: SettlementPreviewTransaction[]
}

export function SettlementPreviewTransactionsList({
  transactions,
}: SettlementPreviewTransactionsListProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
        الدفعات غير المسواة
      </h2>

      {transactions.length === 0 ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            لا توجد معاملات غير مسواة لهذا الموظف
          </p>
        </AppCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {transactions.map((transaction) => {
            const createdLabel = formatDate(transaction.created)
            const reference = getReference(transaction)
            const transactionType = getTransactionType(transaction)

            return (
              <AppCard className="space-y-3" key={transaction.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      المبلغ
                    </p>
                    <p className="mt-1 text-xl font-black text-[var(--sloty-primary-dark)]">
                      {formatMoneyAmount(transaction.amount)}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <span className="rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]">
                      {transactionTypeLabels[transactionType]}
                    </span>
                    <span className="rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]">
                      {settlementPaymentMethodLabels[transaction.payment_method]}
                    </span>
                  </div>
                </div>

                <dl className="grid grid-cols-1 gap-2 text-sm">
                  {transaction.booking ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        الحجز
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        حجز #{transaction.booking}
                      </dd>
                    </div>
                  ) : null}

                  {transaction.court_name ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        الملعب
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {transaction.court_name}
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

                  {reference ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        رقم العملية
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {reference}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </AppCard>
            )
          })}
        </div>
      )}
    </section>
  )
}
