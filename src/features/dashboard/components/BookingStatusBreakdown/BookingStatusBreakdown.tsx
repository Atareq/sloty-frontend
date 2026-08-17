import { SummaryActionCard } from '../SummaryActionCard/SummaryActionCard'
import type { DashboardSummaryResponse } from '../../dashboard.types'
import { buildSummaryLink } from '../../summaryLinks'

const bookingStatuses = [
  { key: 'hold_bookings', label: 'بانتظار العربون', status: 'HOLD', tone: 'amber' },
  { key: 'confirmed_bookings', label: 'مؤكد', status: 'CONFIRMED', tone: 'green' },
  { key: 'completed_bookings', label: 'مكتمل', status: 'COMPLETED', tone: 'blue' },
  { key: 'cancelled_bookings', label: 'ملغي', status: 'CANCELLED', tone: 'red' },
  { key: 'no_show_bookings', label: 'لم يحضر', status: 'NO_SHOW', tone: 'red' },
  { key: 'expired_bookings', label: 'منتهي', status: 'EXPIRED', tone: 'gray' },
] as const

interface BookingStatusBreakdownProps {
  summary: DashboardSummaryResponse
}

export function BookingStatusBreakdown({ summary }: BookingStatusBreakdownProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
        حالات الحجوزات
      </h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {bookingStatuses.map((item) => (
          <SummaryActionCard
            helper="عرض الحجوزات المطابقة"
            key={item.key}
            label={item.label}
            to={buildSummaryLink('/bookings', summary.context, {
              status: item.status,
            })}
            tone={item.tone}
            value={summary.summary[item.key]}
          />
        ))}
      </div>
    </section>
  )
}
