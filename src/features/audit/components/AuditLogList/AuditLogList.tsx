import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { getAuditEntryPresentation } from '../../auditEntryPresentation'
import type { AuditLogEntry } from '../../audit.types'
import { getAuditActionUiConfig } from '../../auditActionUi'

export interface AuditLogListProps {
  entries: AuditLogEntry[]
  onOpenEntry: (entry: AuditLogEntry) => void
}

/**
 * Summary-first read-only audit cards rendered from centralized presentation.
 *
 * The list intentionally does not fetch related entity details; each row must
 * stand on the audit list payload. Opening a card delegates one detail request
 * to the page, not a per-row enrichment chain.
 */
export function AuditLogList({ entries, onOpenEntry }: AuditLogListProps) {
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
        const actionUi = getAuditActionUiConfig(entry.action)
        const presentation = getAuditEntryPresentation(entry)
        const accessibleName = [
          presentation.title,
          presentation.summaryDetails.map((detail) => detail.value).join('، '),
          presentation.actorLabel ? `نفذ بواسطة ${presentation.actorLabel}` : '',
          presentation.createdLabel,
        ]
          .filter(Boolean)
          .join('، ')

        return (
          <AppCard
            className={[
              'space-y-4 border-r-4 bg-white',
              actionUi.accentBorderClass,
            ].join(' ')}
            key={entry.id}
          >
            <button
              aria-label={`عرض تفاصيل النشاط: ${accessibleName}`}
              className="block w-full rounded-2xl text-right outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--sloty-primary)]/30"
              onClick={() => onOpenEntry(entry)}
              type="button"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={[
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black',
                      actionUi.foregroundClass,
                      actionUi.softBackgroundClass,
                    ].join(' ')}
                  >
                    {actionUi.icon}
                  </span>

                  <div className="min-w-0 space-y-1">
                    <h2 className="text-base font-black leading-6 text-[var(--sloty-text-primary)]">
                      {presentation.title}
                    </h2>
                    {presentation.description ? (
                      <p className="line-clamp-2 text-sm font-semibold leading-6 text-[var(--sloty-text-muted)]">
                        {presentation.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                {presentation.badgeLabel ? (
                  <span
                    className={[
                      'inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1 text-xs font-black ring-1 ring-current/15',
                      actionUi.foregroundClass,
                      actionUi.softBackgroundClass,
                    ].join(' ')}
                  >
                    {presentation.badgeLabel}
                  </span>
                ) : null}
              </div>

              {presentation.summaryDetails.length > 0 ? (
                <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  {presentation.summaryDetails.map((detail) => (
                    <div
                      className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2"
                      key={`${entry.id}-${detail.label}-${detail.value}`}
                    >
                      <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                        {detail.label}
                      </dt>
                      <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                        {detail.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {presentation.actorLabel ? (
                  <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                    <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      نفذ الإجراء
                    </dt>
                    <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                      {presentation.actorLabel}
                    </dd>
                  </div>
                ) : null}

                {presentation.createdLabel ? (
                  <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                    <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      التاريخ
                    </dt>
                    <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                      <time dateTime={entry.created}>
                        {presentation.createdLabel}
                      </time>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </button>
          </AppCard>
        )
      })}
    </section>
  )
}
