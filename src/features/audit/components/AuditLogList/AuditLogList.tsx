import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import type { AuditLogEntry, AuditMetadataValue } from '../../audit.types'

export interface AuditLogListProps {
  entries: AuditLogEntry[]
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

function formatMetadataValue(value: AuditMetadataValue): string {
  if (value === null) {
    return '-'
  }

  if (typeof value === 'boolean') {
    return value ? 'نعم' : 'لا'
  }

  return String(value)
}

/**
 * Read-only audit cards with clean metadata key/value display.
 */
export function AuditLogList({ entries }: AuditLogListProps) {
  if (entries.length === 0) {
    return (
      <AppCard>
        <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
          لا يوجد نشاط مسجل
        </p>
      </AppCard>
    )
  }

  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {entries.map((entry) => {
        const createdLabel = formatDateTime(entry.created)
        const metadataEntries = Object.entries(entry.metadata ?? {})

        return (
          <AppCard className="space-y-3" key={entry.id}>
            <div className="space-y-1">
              <p className="text-sm font-black text-[var(--sloty-text-primary)]">
                {entry.message ?? entry.action}
              </p>
              <p className="text-xs font-bold text-[var(--sloty-text-muted)]" dir="ltr">
                {entry.action}
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm">
              {entry.actor ? (
                <div className="flex items-center justify-between rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    المستخدم
                  </dt>
                  <dd className="font-black text-[var(--sloty-text-primary)]">
                    {entry.actor.name}
                  </dd>
                </div>
              ) : null}
              {createdLabel ? (
                <div className="flex items-center justify-between rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    التاريخ
                  </dt>
                  <dd className="font-black text-[var(--sloty-text-primary)]">
                    {createdLabel}
                  </dd>
                </div>
              ) : null}
              {entry.target_type || entry.target_id ? (
                <div className="flex items-center justify-between rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    الهدف
                  </dt>
                  <dd className="font-black text-[var(--sloty-text-primary)]" dir="ltr">
                    {[entry.target_type, entry.target_id].filter(Boolean).join(' #')}
                  </dd>
                </div>
              ) : null}
            </dl>

            {metadataEntries.length > 0 ? (
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                  التفاصيل
                </p>
                <dl className="mt-2 grid grid-cols-1 gap-1 text-sm">
                  {metadataEntries.map(([key, value]) => (
                    <div className="flex items-center justify-between gap-3" key={key}>
                      <dt className="font-bold text-[var(--sloty-text-muted)]" dir="ltr">
                        {key}
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {formatMetadataValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </AppCard>
        )
      })}
    </section>
  )
}
