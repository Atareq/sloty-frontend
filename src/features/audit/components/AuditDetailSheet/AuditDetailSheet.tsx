import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import type {
  AuditPresentationChange,
  AuditPresentationDetail,
} from '../../auditEntryPresentation'
import { getAuditEntryPresentation } from '../../auditEntryPresentation'
import type { AuditLogDetail } from '../../audit.types'

interface AuditDetailSheetProps {
  entry: AuditLogDetail | null
  error: string | null
  isLoading: boolean
  onClose: () => void
  onRetry: () => void
}

function DetailRows({ details }: { details: AuditPresentationDetail[] }) {
  if (details.length === 0) {
    return (
      <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
        لا توجد تفاصيل إضافية متاحة لهذا النشاط.
      </p>
    )
  }

  return (
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
      {details.map((detail) => (
        <div
          className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2"
          key={`${detail.label}-${detail.value}`}
        >
          <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
            {detail.label}
          </dt>
          <dd className="mt-1 whitespace-pre-wrap break-words font-black text-[var(--sloty-text-primary)]">
            {detail.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ChangeRows({ changes }: { changes: AuditPresentationChange[] }) {
  if (changes.length === 0) {
    return null
  }

  return (
    <section className="space-y-2 rounded-2xl bg-[var(--sloty-bg)] p-3">
      <h3 className="text-xs font-black text-[var(--sloty-text-muted)]">
        التغييرات
      </h3>
      <dl className="space-y-2">
        {changes.map((change) => (
          <div className="grid gap-1 text-sm" key={change.label}>
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
    </section>
  )
}

/**
 * Full read-only Activity detail. It renders only the selected Audit response
 * and never resolves linked User/Court/Booking/Transaction/Settlement entities.
 */
export function AuditDetailSheet({
  entry,
  error,
  isLoading,
  onClose,
  onRetry,
}: AuditDetailSheetProps) {
  const presentation = entry ? getAuditEntryPresentation(entry) : null

  return (
    <AppSheet
      ariaLabel="تفاصيل النشاط"
      className="md:max-w-2xl"
      onRequestClose={onClose}
    >
      <div className="space-y-5 p-5 pt-12">
        <header className="space-y-1">
          <p className="text-xs font-black text-[var(--sloty-text-muted)]">
            تفاصيل النشاط
          </p>
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            {presentation?.title ?? 'جاري تحميل النشاط...'}
          </h2>
          {presentation?.description ? (
            <p className="text-sm font-semibold leading-6 text-[var(--sloty-text-muted)]">
              {presentation.description}
            </p>
          ) : null}
        </header>

        {isLoading ? (
          <p className="rounded-2xl bg-[var(--sloty-bg)] p-4 text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل تفاصيل النشاط...
          </p>
        ) : null}

        {error ? (
          <div className="space-y-3 rounded-2xl bg-red-50 p-4 text-sm font-bold text-[var(--sloty-danger)]">
            <p>{error}</p>
            <AppButton onClick={onRetry} type="button" variant="secondary">
              حاول مرة تانية
            </AppButton>
          </div>
        ) : null}

        {presentation && !isLoading && !error ? (
          <>
            <DetailRows
              details={[
                ...(presentation.actorLabel
                  ? [{ label: 'نفذ الإجراء', value: presentation.actorLabel }]
                  : []),
                ...(presentation.createdLabel
                  ? [{ label: 'وقت تنفيذ الإجراء', value: presentation.createdLabel }]
                  : []),
                ...presentation.details,
              ]}
            />
            <ChangeRows changes={presentation.changes} />
          </>
        ) : null}
      </div>
    </AppSheet>
  )
}
