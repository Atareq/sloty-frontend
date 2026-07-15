import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import type { ReportsTotals } from '../../reports.types'

export interface ReportsTotalsCardProps {
  totals: ReportsTotals | undefined
}

const totalItems: Array<{
  key: keyof ReportsTotals
  label: string
  suffix?: string
}> = [
  { key: 'bookings_count', label: 'إجمالي الحجوزات' },
  { key: 'completed_count', label: 'مكتملة' },
  { key: 'cancelled_count', label: 'ملغية' },
  { key: 'no_show_count', label: 'عدم حضور' },
  { key: 'gross_amount', label: 'إجمالي المبالغ', suffix: 'جنيه' },
  { key: 'paid_amount', label: 'المدفوع', suffix: 'جنيه' },
  { key: 'remaining_amount', label: 'المتبقي', suffix: 'جنيه' },
  {
    key: 'cancelled_payment_amount',
    label: 'المدفوعات الملغية',
    suffix: 'جنيه',
  },
]

/**
 * Backend-calculated report totals. It never derives values from raw rows.
 */
export function ReportsTotalsCard({ totals }: ReportsTotalsCardProps) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {totalItems.map((item) => {
        const value = totals?.[item.key]

        return (
          <AppCard className="space-y-2" key={item.key}>
            <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
              {item.label}
            </p>
            <p
              className="text-xl font-black text-[var(--sloty-primary-dark)]"
              dir={typeof value === 'string' ? 'ltr' : 'rtl'}
            >
              {value ?? '-'}
              {value !== undefined && item.suffix ? (
                <span className="ms-1 text-sm text-[var(--sloty-text-muted)]">
                  {item.suffix}
                </span>
              ) : null}
            </p>
          </AppCard>
        )
      })}
    </section>
  )
}
