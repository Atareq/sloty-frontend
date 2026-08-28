import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { financeCopy } from '../../../../shared/copy/appCopy'
import { formatArabicDateTime } from '../../../../shared/utils/date'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type {
  SettlementLine,
  SettlementPreviewTransaction,
} from '../../settlements.types'
import { settlementPaymentMethodLabels } from '../../settlements.types'
import {
  getTransactionType,
  transactionTypeLabels,
} from '../../../transactions/transactions.types'

type SettlementTransactionRow = SettlementPreviewTransaction | SettlementLine

export interface SettlementTransactionsListProps {
  emptyMessage?: string
  transactions: SettlementTransactionRow[]
}

function getReference(transaction: SettlementTransactionRow): string | null {
  if (
    'payment_method' in transaction &&
    transaction.payment_method === 'CASH'
  ) {
    return null
  }

  if ('payment_reference' in transaction && transaction.payment_reference) {
    return transaction.payment_reference
  }

  return null
}

/**
 * Read-only list of transactions included in a settlement preview/detail.
 */
export function SettlementTransactionsList({
  emptyMessage = 'لا توجد عمليات مرتبطة لهذا الموظف.',
  transactions,
}: SettlementTransactionsListProps) {
  if (transactions.length === 0) {
    return (
      <AppCard>
        <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
          {emptyMessage}
        </p>
      </AppCard>
    )
  }

  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {transactions.map((transaction) => {
        const createdLabel =
          'created' in transaction
            ? formatArabicDateTime(transaction.created)
            : null
        const reference = getReference(transaction)
        const transactionType = getTransactionType(transaction)

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
              {'court_name' in transaction && transaction.court_name ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    الملعب
                  </dt>
                  <dd className="font-black text-[var(--sloty-text-primary)]">
                    {transaction.court_name}
                  </dd>
                </div>
              ) : null}
              {reference ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    {financeCopy.paymentReference}
                  </dt>
                  <dd className="font-black text-[var(--sloty-text-primary)]">
                    {reference}
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
            </dl>
          </AppCard>
        )
      })}
    </section>
  )
}
