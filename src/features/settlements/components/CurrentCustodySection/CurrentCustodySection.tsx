import { Link } from 'react-router'
import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { financeCopy } from '../../../../shared/copy/appCopy'
import { buildPathWithQuery } from '../../../../shared/utils/buildPathWithQuery'
import {
  formatMoneyAmount,
  isNonZeroMoneyAmount,
} from '../../../../shared/utils/money'
import { getCurrentCustodyPresentation } from '../../currentCustodyPresentation'
import {
  settlementPaymentMethodLabels,
  type CurrentCustodyRecord,
  type SettlementPaymentMethod,
} from '../../settlements.types'

const paymentMethods: SettlementPaymentMethod[] = [
  'CASH',
  'DIGITAL_WALLET',
  'BANK_TRANSFER',
  'OTHER',
]

interface CurrentCustodyDisplayRecord extends CurrentCustodyRecord {
  can_approve?: boolean
  is_self?: boolean
}

interface CurrentCustodySectionProps {
  court?: number | string
  error?: string | null
  isLoading?: boolean
  mode: 'staff' | 'management'
  records: CurrentCustodyDisplayRecord[]
  showTitle?: boolean
  snapshotLabel?: string | null
}

export function CurrentCustodyValue({
  record,
}: {
  record: CurrentCustodyRecord
}) {
  const presentation = getCurrentCustodyPresentation({
    netAmount: record.net_amount,
    transactionCount: record.transaction_count,
  })

  if (presentation.state === 'empty') {
    return (
      <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
        {presentation.copy}
      </p>
    )
  }

  if (presentation.state === 'negative') {
    return (
      <p
        className="text-right text-2xl font-black text-[var(--sloty-text-primary)]"
        data-custody-state="negative"
        dir="ltr"
      >
        {presentation.amountLabel}
      </p>
    )
  }

  return (
    <p className="text-sm font-black text-[var(--sloty-primary-dark)]">
      {presentation.copy}
    </p>
  )
}

export function CurrentCustodyPaymentBreakdown({
  totals,
}: {
  totals: CurrentCustodyRecord['totals_by_payment_method']
}) {
  const visibleMethods = paymentMethods.filter((method) =>
    isNonZeroMoneyAmount(totals[method]),
  )

  if (visibleMethods.length === 0) {
    return null
  }

  return (
    <dl
      aria-label="تفصيل العهدة الحالية حسب طريقة الدفع"
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      {visibleMethods.map((method) => (
        <div
          className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm"
          key={method}
        >
          <dt className="font-bold text-[var(--sloty-text-muted)]">
            {settlementPaymentMethodLabels[method]}
          </dt>
          <dd className="font-black text-[var(--sloty-text-primary)]" dir="ltr">
            {formatMoneyAmount(totals[method], { suffix: 'ج.م' })}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Displays Backend-authoritative current custody without transaction arithmetic.
 * Date-filtered financial activity is loaded and rendered independently.
 */
export function CurrentCustodySection({
  court,
  error = null,
  isLoading = false,
  mode,
  records,
  showTitle = true,
  snapshotLabel = null,
}: CurrentCustodySectionProps) {
  const title =
    mode === 'staff'
      ? financeCopy.currentCustody
      : financeCopy.currentEmployeeMoney

  return (
    <section className="space-y-3" aria-label={title}>
      {showTitle ? (
        <h2 className="text-base font-extrabold text-[var(--sloty-text-primary)]">
          {title}
        </h2>
      ) : null}
      {snapshotLabel ? (
        <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
          {snapshotLabel}
        </p>
      ) : null}

      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل العهدة الحالية...
          </p>
        </AppCard>
      ) : null}

      {!isLoading && error ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-danger)]">{error}</p>
        </AppCard>
      ) : null}

      {!isLoading && !error && records.length === 0 ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
            {financeCopy.currentCustodyEmpty}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && records.length > 0 ? (
        <div
          className={
            mode === 'management'
              ? 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'
              : undefined
          }
        >
          {records.map((record) => (
            <AppCard className="space-y-4" key={record.collected_by}>
              {mode === 'management' ? (
                <p className="text-base font-black text-[var(--sloty-text-primary)]">
                  {record.collected_by_name}
                </p>
              ) : null}

              <CurrentCustodyValue record={record} />

              <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                {record.transaction_count} معاملات
              </p>

              <CurrentCustodyPaymentBreakdown
                totals={record.totals_by_payment_method}
              />

              {mode === 'management' && record.can_approve ? (
                <Link
                  className="sloty-green-surface-button inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--sloty-primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)] focus:ring-offset-2"
                  to={buildPathWithQuery('/settlements/preview', {
                    collected_by: record.collected_by,
                    court,
                  })}
                >
                  {financeCopy.receiveAmount}
                </Link>
              ) : null}

              {mode === 'management' && record.is_self && !record.can_approve ? (
                <p className="text-sm font-medium text-[var(--sloty-text-muted)]">
                  {financeCopy.selfPreviewDenied}
                </p>
              ) : null}
            </AppCard>
          ))}
        </div>
      ) : null}
    </section>
  )
}
