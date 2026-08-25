import { SummaryActionCard } from '../SummaryActionCard/SummaryActionCard'
import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import type { DashboardSummaryResponse } from '../../dashboard.types'
import { buildSummaryLink } from '../../summaryLinks'

const needsActionItems = [
  {
    key: 'hold_waiting_payment_count',
    label: 'بانتظار العربون',
    helper: 'افتح الحجوزات وضيف العربون',
    query: { status: 'HOLD' },
  },
  {
    key: 'overdue_confirmed_count',
    label: 'وقتها عدى ولسه مقفلتش',
    helper: 'افتح الحجوزات المكتملة زمنيًا',
    query: { overdue: true, status: 'CONFIRMED' },
  },
  {
    key: 'remaining_after_slot_end_count',
    label: 'خلصت ولسه عليها مبلغ',
    helper: 'افتح الحجوزات وحصّل المتبقي',
    query: { ended: true, has_remaining_amount: true, status: 'CONFIRMED' },
  },
  {
    key: 'expiring_hold_count',
    label: 'عربونها قرب ينتهي',
    helper: 'افتح الحجوزات القريبة من انتهاء المهلة',
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
          محتاجين إجراء
        </h2>
        <AppCard>
          <p className="text-sm font-black text-[var(--sloty-text-primary)]">
            مفيش حجوزات محتاجة إجراء دلوقتي.
          </p>
        </AppCard>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
        محتاجين إجراء
      </h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {needsActionItems
          .filter((item) => summary.needs_action_breakdown[item.key] > 0)
          .map((item) => (
            <SummaryActionCard
              helper={item.helper}
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
