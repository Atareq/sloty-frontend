import { Link } from 'react-router'
import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { financeCopy } from '../../../../shared/copy/appCopy'
import { buildPathWithQuery } from '../../../../shared/utils/buildPathWithQuery'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import type {
  DashboardSummaryResponse,
  PaymentMethod,
} from '../../dashboard.types'

const paymentMethodLabels: Record<PaymentMethod, string> = {
  BANK_TRANSFER: 'تحويل بنكي',
  CASH: 'كاش',
  DIGITAL_WALLET: 'محفظة إلكترونية',
  OTHER: 'أخرى',
}

interface StaffUnsettledMoneySectionProps {
  summary: DashboardSummaryResponse
  mode: 'staff' | 'management'
}

export function StaffUnsettledMoneySection({
  mode,
  summary,
}: StaffUnsettledMoneySectionProps) {
  if (mode === 'staff') {
    const amount = summary.summary.unsettled_transaction_total_amount
    const transactionCount = summary.summary.unsettled_transaction_count ?? 0
    const hasUnsettledMoney = Number(amount ?? 0) !== 0 || transactionCount > 0

    return (
      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-[var(--sloty-text-primary)]">
          عهدتي
        </h2>

        <AppCard className="space-y-2">
          {hasUnsettledMoney ? (
            <>
              <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                معاك دلوقتي
              </p>
              <p
                className="text-right text-3xl font-black text-[var(--sloty-primary-dark)]"
                dir="ltr"
              >
                {formatMoneyAmount(amount, { suffix: 'ج.م' })}
              </p>
              <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                من {transactionCount} معاملة
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-[var(--sloty-text-primary)]">
              {financeCopy.noAmountWithYou}
            </p>
          )}
        </AppCard>
      </section>
    )
  }

  const visibleCount = summary.staff_unsettled_money.length
  const totalCount = summary.summary.staff_with_unsettled_transactions_count

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-[var(--sloty-text-primary)]">
          المبالغ مع الموظفين
        </h2>

        {visibleCount < totalCount ? (
          <Link
            className="text-sm font-black text-[var(--sloty-primary)]"
            to="/settlements"
          >
            عرض كل الموظفين
          </Link>
        ) : null}
      </div>

      {visibleCount === 0 ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
            مفيش مبالغ مع الموظفين دلوقتي
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--sloty-text-muted)]">
            كل المبالغ الحالية اتسلّمت.
          </p>
        </AppCard>
      ) : (
        <>
          {visibleCount < totalCount ? (
            <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
              يعرض {visibleCount} من أصل {totalCount} موظف معهم مبالغ دلوقتي
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summary.staff_unsettled_money.map((staff) => (
              <AppCard className="space-y-4" key={staff.collected_by}>
                <div>
                  <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
                    {staff.collected_by_name}
                  </p>
                  {staff.court_name ? (
                    <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
                      {staff.court_name}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3">
                  <p className="text-xs font-semibold text-[var(--sloty-text-muted)]">
                    {financeCopy.withEmployeeNow}
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-[var(--sloty-primary-dark)]">
                    {formatMoneyAmount(staff.total_unsettled_amount)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--sloty-text-muted)]">
                    من {staff.unsettled_transaction_count} معاملة
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {Object.entries(staff.totals_by_payment_method).map(
                    ([method, amount]) => (
                      <span
                        className="rounded-full bg-[var(--sloty-soft-mint)] px-2.5 py-1 text-xs font-black text-[var(--sloty-primary-dark)]"
                        key={method}
                      >
                        {paymentMethodLabels[method as PaymentMethod]}:{' '}
                        {formatMoneyAmount(amount)}
                      </span>
                    ),
                  )}
                </div>

                <Link
                  className="sloty-green-surface-button inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--sloty-primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)] focus:ring-offset-2"
                  to={buildPathWithQuery('/settlements/preview', {
                    collected_by: staff.collected_by,
                    court: staff.court,
                  })}
                >
                  {financeCopy.receiveAmount}
                </Link>
              </AppCard>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
