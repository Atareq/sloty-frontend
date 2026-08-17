import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import type { AuditPresentationChange } from '../../auditEntryPresentation'
import { getAuditEntryPresentation } from '../../auditEntryPresentation'
import type { AuditLogEntry } from '../../audit.types'
import { getAuditActionUiConfig } from '../../auditActionUi'

export interface AuditLogListProps {
  entries: AuditLogEntry[]
}

function AuditChangeList({ changes }: { changes: AuditPresentationChange[] }) {
  if (changes.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 rounded-2xl bg-[var(--sloty-bg)] p-3">
      <h3 className="text-xs font-black text-[var(--sloty-text-muted)]">
        التغييرات
      </h3>
      <dl className="space-y-2">
        {changes.map((change) => (
          <div className="grid gap-1 text-sm sm:grid-cols-[8rem_1fr]" key={change.label}>
            <dt className="font-bold text-[var(--sloty-text-muted)]">
              {change.label}
            </dt>
            <dd className="font-black text-[var(--sloty-text-primary)]">
              <span>{change.before}</span>
              <span className="mx-2 text-[var(--sloty-text-muted)]">←</span>
              <span>{change.after}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/**
 * Read-only audit cards rendered from a centralized presentation model.
 *
 * The list intentionally does not fetch related entity details; each row must
 * stand on the audit list payload and safe fallback formatting.
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
        const actionUi = getAuditActionUiConfig(entry.action)
        const presentation = getAuditEntryPresentation(entry)

        return (
          <AppCard
            className={[
              'space-y-4 border-r-4 bg-white',
              actionUi.accentBorderClass,
            ].join(' ')}
            key={entry.id}
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
                    <p className="text-sm font-semibold leading-6 text-[var(--sloty-text-muted)]">
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

            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {presentation.actorLabel ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                    المستخدم
                  </dt>
                  <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                    {presentation.actorLabel}
                  </dd>
                </div>
              ) : null}

              {presentation.courtLabel ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                    الملعب
                  </dt>
                  <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                    {presentation.courtLabel}
                  </dd>
                </div>
              ) : null}

              {presentation.createdLabel ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                    التاريخ
                  </dt>
                  <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                    <time dateTime={entry.created}>{presentation.createdLabel}</time>
                  </dd>
                </div>
              ) : null}
            </dl>

            {presentation.details.length > 0 ? (
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {presentation.details.map((detail) => (
                  <div
                    className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2"
                    key={`${detail.label}-${detail.value}`}
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

            <AuditChangeList changes={presentation.changes} />
          </AppCard>
        )
      })}
    </section>
  )
}
