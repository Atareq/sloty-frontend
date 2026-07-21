import { AppCard } from '../../../../shared/components/AppCard/AppCard'

export interface DashboardMetricCardProps {
  label: string
  value: number | string | null | undefined
  suffix?: string
}

/**
 * Compact metric card for backend-provided dashboard values.
 */
export function DashboardMetricCard({
  label,
  suffix,
  value,
}: DashboardMetricCardProps) {
  return (
    <AppCard className="space-y-2">
      <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
        {label}
      </p>
      <p
        className="text-2xl font-black text-[var(--sloty-primary-dark)]"
        dir={typeof value === 'string' ? 'ltr' : 'rtl'}
      >
        {value ?? '-'}
        {value !== undefined && suffix ? (
          <span className="ms-1 text-sm text-[var(--sloty-text-muted)]">
            {suffix}
          </span>
        ) : null}
      </p>
    </AppCard>
  )
}
