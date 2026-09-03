import { Link } from 'react-router'
import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import { paymentMethodLabels } from '../../../transactions/transactions.types'
import type {
  DashboardSummaryResponse,
  PaymentMethod,
} from '../../dashboard.types'
import { buildSummaryLink } from '../../summaryLinks'

const paymentMethods: PaymentMethod[] = [
  'CASH',
  'DIGITAL_WALLET',
  'BANK_TRANSFER',
  'OTHER',
]

interface MoneySummarySectionProps {
  summary: DashboardSummaryResponse
}

export function MoneySummarySection({ summary }: MoneySummarySectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
        النشاط المالي خلال الفترة
      </h2>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <AppCard className="space-y-3 lg:col-span-2">
          <h3 className="text-sm font-black text-[var(--sloty-text-primary)]">
            صافي الحركة خلال الفترة حسب طريقة الدفع
          </h3>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {paymentMethods.map((method) => {
              const total = summary.payment_method_totals[method]

              return (
                <Link
                  className="rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-3 transition hover:border-[var(--sloty-primary)]"
                  key={method}
                  to={buildSummaryLink('/transactions', summary.context, {
                    is_cancelled: false,
                    payment_method: method,
                  })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-[var(--sloty-text-primary)]">
                      {paymentMethodLabels[method]}
                    </span>
                    <span className="text-sm font-black text-[var(--sloty-primary-dark)]">
                      {formatMoneyAmount(total?.amount)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
                    {total?.count ?? 0} معاملات
                    {total?.refund && Number(total.refund) !== 0
                      ? ` · مرتجعات ${formatMoneyAmount(total.refund)}`
                      : ''}
                  </p>
                </Link>
              )
            })}
          </div>
        </AppCard>

        <AppCard className="space-y-3">
          <h3 className="text-sm font-black text-[var(--sloty-text-primary)]">
            ملخص نشاط الفترة
          </h3>

          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
              <dt className="font-bold text-[var(--sloty-text-muted)]">
                التحصيلات خلال الفترة
              </dt>
              <dd className="font-black text-[var(--sloty-text-primary)]">
                {formatMoneyAmount(summary.summary.booking_payment_total)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
              <dt className="font-bold text-[var(--sloty-text-muted)]">
                المرتجعات خلال الفترة
              </dt>
              <dd className="font-black text-[var(--sloty-text-primary)]">
                {formatMoneyAmount(summary.summary.booking_refund_total)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
              <dt className="font-bold text-[var(--sloty-text-muted)]">
                صافي الحركة المالية خلال الفترة
              </dt>
              <dd className="font-black text-[var(--sloty-text-primary)]">
                {formatMoneyAmount(summary.summary.transaction_total)}
              </dd>
            </div>
          </dl>
        </AppCard>
      </div>
    </section>
  )
}
