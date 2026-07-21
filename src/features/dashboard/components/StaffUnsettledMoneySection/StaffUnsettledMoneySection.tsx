import { Link } from 'react-router'
import { AppCard } from '../../../../shared/components/AppCard/AppCard'
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
}

export function StaffUnsettledMoneySection({
  summary,
}: StaffUnsettledMoneySectionProps) {
  const visibleCount = summary.staff_unsettled_money.length
  const totalCount = summary.summary.staff_with_unsettled_transactions_count

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
          مبالغ الموظفين غير المسواة
        </h2>

        {visibleCount < totalCount ? (
          <Link
            className="text-sm font-black text-[var(--sloty-primary)]"
            to={buildPathWithQuery('/transactions', {
              is_cancelled: false,
              settlement_status: 'unsettled',
            })}
          >
            عرض كل الموظفين
          </Link>
        ) : null}
      </div>

      {visibleCount === 0 ? (
        <AppCard>
          <p className="text-sm font-black text-[var(--sloty-text-primary)]">
            لا توجد مبالغ غير مسواة حالياً
          </p>
          <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
            كل الدفعات الحالية تمت تسويتها.
          </p>
        </AppCard>
      ) : (
        <>
          {visibleCount < totalCount ? (
            <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
              يعرض {visibleCount} من أصل {totalCount} موظف لديهم مبالغ غير مسواة
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summary.staff_unsettled_money.map((staff) => (
              <AppCard className="space-y-4" key={staff.collected_by}>
                <div>
                  <p className="text-sm font-black text-[var(--sloty-text-primary)]">
                    {staff.collected_by_name}
                  </p>
                  {staff.court_name ? (
                    <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
                      {staff.court_name}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3">
                  <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                    غير مسوى
                  </p>
                  <p className="mt-1 text-xl font-black text-[var(--sloty-primary-dark)]">
                    {formatMoneyAmount(staff.total_unsettled_amount)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
                    {staff.unsettled_transaction_count} دفعات
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
                  مراجعة التسوية
                </Link>
              </AppCard>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
