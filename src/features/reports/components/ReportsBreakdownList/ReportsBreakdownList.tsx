import { AppCard } from '../../../../shared/components/AppCard/AppCard'

export interface ReportsBreakdownItem {
  id: number | string
  title: string
  primaryLabel: string
  primaryValue: number | string | undefined
  secondaryLabel?: string
  secondaryValue?: number | string | undefined
}

export interface ReportsBreakdownListProps {
  emptyMessage: string
  items: ReportsBreakdownItem[]
}

/**
 * Simple report breakdown cards for court and staff summaries.
 */
export function ReportsBreakdownList({
  emptyMessage,
  items,
}: ReportsBreakdownListProps) {
  if (items.length === 0) {
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
      {items.map((item) => (
        <AppCard className="space-y-3" key={item.id}>
          <p className="text-sm font-black text-[var(--sloty-text-primary)]">
            {item.title}
          </p>
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
              <dt className="font-bold text-[var(--sloty-text-muted)]">
                {item.primaryLabel}
              </dt>
              <dd className="font-black">{item.primaryValue ?? '-'}</dd>
            </div>
            {item.secondaryLabel ? (
              <div className="flex items-center justify-between rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  {item.secondaryLabel}
                </dt>
                <dd className="font-black" dir="ltr">
                  {item.secondaryValue ?? '-'}
                </dd>
              </div>
            ) : null}
          </dl>
        </AppCard>
      ))}
    </section>
  )
}
