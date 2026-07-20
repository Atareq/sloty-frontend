import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { paymentMethodLabels } from '../../../transactions/transactions.types'
import type { PaymentMethod } from '../../../transactions/transactions.types'
import type { AuditLogEntry } from '../../audit.types'
import {
  getAuditActionLabel,
  getAuditActionUiConfig,
} from '../../auditActionUi'

export interface AuditLogListProps {
  entries: AuditLogEntry[]
}

interface MetadataChip {
  key: string
  label: string
  value: string
}

const metadataLabels: Record<string, string> = {
  booking: 'الحجز',
  booking_id: 'الحجز',
  customer: 'العميل',
  customer_name: 'العميل',
  court: 'الملعب',
  court_name: 'الملعب',
  payment_method: 'طريقة الدفع',
  amount: 'المبلغ',
  transaction: 'الدفع',
  transaction_id: 'الدفع',
  settlement: 'التسوية',
  settlement_id: 'التسوية',
  reason: 'السبب',
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

function isSafePrimitive(value: unknown): value is string | number | boolean {
  return ['string', 'number', 'boolean'].includes(typeof value)
}

function formatPrimitiveMetadataValue(key: string, value: string | number | boolean): string {
  if (typeof value === 'boolean') {
    return value ? 'نعم' : 'لا'
  }

  if (key === 'payment_method' && typeof value === 'string') {
    return paymentMethodLabels[value as PaymentMethod] ?? value
  }

  return String(value).trim()
}

function getMetadataChips(
  metadata: AuditLogEntry['metadata'],
): MetadataChip[] {
  if (!metadata) {
    return []
  }

  return Object.entries(metadata).flatMap(([key, value]) => {
    const label = metadataLabels[key]

    if (!label || !isSafePrimitive(value)) {
      return []
    }

    const formattedValue = formatPrimitiveMetadataValue(key, value)

    if (!formattedValue) {
      return []
    }

    return [
      {
        key,
        label,
        value: formattedValue,
      },
    ]
  })
}

function getEntryDescription(entry: AuditLogEntry): string | null {
  const description = entry.description?.trim()
  const message = entry.message?.trim()

  return description || message || null
}

/**
 * Read-only audit cards that use stable action codes for visuals and backend
 * localized labels for visible action text.
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
        const actionLabel = getAuditActionLabel(entry)
        const actionUi = getAuditActionUiConfig(entry.action)
        const createdLabel = formatDateTime(entry.created)
        const description = getEntryDescription(entry)
        const metadataChips = getMetadataChips(entry.metadata)

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
                    {actionLabel}
                  </h2>
                  {description ? (
                    <p className="text-sm font-semibold leading-6 text-[var(--sloty-text-muted)]">
                      {description}
                    </p>
                  ) : null}
                </div>
              </div>

              <span
                className={[
                  'inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1 text-xs font-black ring-1 ring-current/15',
                  actionUi.foregroundClass,
                  actionUi.softBackgroundClass,
                ].join(' ')}
              >
                {actionLabel}
              </span>
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {entry.actor?.name ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                    المستخدم
                  </dt>
                  <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                    {entry.actor.name}
                  </dd>
                </div>
              ) : null}

              {createdLabel ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                    التاريخ
                  </dt>
                  <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                    <time dateTime={entry.created}>{createdLabel}</time>
                  </dd>
                </div>
              ) : null}
            </dl>

            {metadataChips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {metadataChips.map((chip) => (
                  <span
                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--sloty-bg)] px-3 py-1 text-xs font-bold text-[var(--sloty-text-primary)] ring-1 ring-[var(--sloty-border)]"
                    key={chip.key}
                  >
                    <span className="text-[var(--sloty-text-muted)]">
                      {chip.label}
                    </span>
                    <span className="min-w-0 truncate">{chip.value}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </AppCard>
        )
      })}
    </section>
  )
}
