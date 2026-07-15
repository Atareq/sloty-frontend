import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import type { DashboardActivity } from '../../dashboard.types'

export interface DashboardRecentActivityProps {
  activities: DashboardActivity[]
}

function formatDateTime(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/**
 * Read-only recent activity list from the dashboard summary endpoint.
 */
export function DashboardRecentActivity({
  activities,
}: DashboardRecentActivityProps) {
  if (activities.length === 0) {
    return (
      <AppCard>
        <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
          لا يوجد نشاط حديث
        </p>
      </AppCard>
    )
  }

  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {activities.map((activity) => {
        const createdLabel = formatDateTime(activity.created)

        return (
          <AppCard className="space-y-2" key={activity.id}>
            <p className="text-sm font-black text-[var(--sloty-text-primary)]">
              {activity.message}
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-bold text-[var(--sloty-text-muted)]">
              {activity.actor ? <span>{activity.actor.name}</span> : null}
              {createdLabel ? <span>{createdLabel}</span> : null}
              {activity.action ? <span dir="ltr">{activity.action}</span> : null}
            </div>
          </AppCard>
        )
      })}
    </section>
  )
}
