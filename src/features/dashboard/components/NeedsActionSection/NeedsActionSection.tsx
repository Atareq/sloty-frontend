import { SummaryActionCard } from '../SummaryActionCard/SummaryActionCard'
import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import type { DashboardSummaryResponse } from '../../dashboard.types'
import { buildSummaryLink } from '../../summaryLinks'

const needsActionItems = [
  {
    key: 'hold_waiting_payment_count',
    label: 'حجوزات انتظار الدفع',
    query: { status: 'HOLD' },
  },
  {
    key: 'overdue_confirmed_count',
    label: 'حجوزات وقتها عدى ولم تكتمل',
    query: { overdue: true, status: 'CONFIRMED' },
  },
  {
    key: 'remaining_after_slot_end_count',
    label: 'حجوزات بها مبلغ متبقي بعد الوقت',
    query: { ended: true, remaining_amount_gt: 0, status: 'CONFIRMED' },
  },
  {
    key: 'expiring_hold_count',
    label: 'حجوزات انتظار قاربت على الانتهاء',
    query: { hold_expiring: true, status: 'HOLD' },
  },
] as const

interface NeedsActionSectionProps {
  summary: DashboardSummaryResponse
}

export function NeedsActionSection({ summary }: NeedsActionSectionProps) {
  if (summary.summary.needs_action_count === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
          تحتاج إجراء
        </h2>
        <AppCard>
          <p className="text-sm font-black text-[var(--sloty-text-primary)]">
            لا توجد حجوزات تحتاج إجراء
          </p>
          <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
            كل الحجوزات الحالية مستقرة.
          </p>
        </AppCard>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
        تحتاج إجراء
      </h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {needsActionItems.map((item) => (
          <SummaryActionCard
            helper="افتح الحجوزات المطابقة"
            key={item.key}
            label={item.label}
            to={buildSummaryLink('/bookings', summary.context, item.query)}
            tone="amber"
            value={summary.needs_action_breakdown[item.key]}
          />
        ))}
      </div>
    </section>
  )
}
