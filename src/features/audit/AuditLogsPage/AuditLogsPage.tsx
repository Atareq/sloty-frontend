import { useEffect, useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { listAuditLogs } from '../auditApi'
import type { AuditLogEntry, AuditQueryParams } from '../audit.types'
import { AuditLogList } from '../components/AuditLogList/AuditLogList'

interface FilterState {
  date_from: string
  date_to: string
  actor: string
  action: string
}

const initialFilters: FilterState = {
  date_from: '',
  date_to: '',
  actor: '',
  action: '',
}

function buildParams(filters: FilterState): AuditQueryParams {
  return {
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(filters.actor.trim() ? { actor: filters.actor.trim() } : {}),
    ...(filters.action.trim() ? { action: filters.action.trim() } : {}),
  }
}

/**
 * Read-only sensitive activity log for club owners.
 */
export function AuditLogsPage() {
  const { role, selectedClubSlug } = useAuth()
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canViewAuditLogs = role === 'OWNER'

  async function loadLogs(params: AuditQueryParams = {}): Promise<void> {
    if (!selectedClubSlug || !canViewAuditLogs) {
      setEntries([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await listAuditLogs(selectedClubSlug, params)

      setEntries(response.results)
    } catch (error) {
      setEntries([])
      setError(getApiErrorMessage(error, 'تعذر تحميل سجل النشاط'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedClubSlug || !canViewAuditLogs) {
      return
    }

    let isActive = true
    const clubSlug = selectedClubSlug

    async function loadInitialLogs(): Promise<void> {
      try {
        const response = await listAuditLogs(clubSlug, {})

        if (isActive) {
          setEntries(response.results)
        }
      } catch (error) {
        if (isActive) {
          setEntries([])
          setError(getApiErrorMessage(error, 'تعذر تحميل سجل النشاط'))
        }
      }
    }

    void loadInitialLogs()

    return () => {
      isActive = false
    }
  }, [canViewAuditLogs, selectedClubSlug])

  function updateFilter(field: keyof FilterState, value: string): void {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void loadLogs(buildParams(filters))
  }

  return (
    <div className="space-y-5">
      <PageHeader
        description="متابعة التغييرات المهمة داخل النادي"
        tone="brand"
        title="سجل النشاط"
      />

      {!selectedClubSlug ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            اختر ناديًا أولًا لعرض سجل النشاط
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug && !canViewAuditLogs ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-danger)]">
            ليس لديك صلاحية عرض سجل النشاط
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug && canViewAuditLogs ? (
        <>
          <AppCard>
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleSubmit}>
              <label className="space-y-2 text-sm font-semibold">
                <span>من تاريخ</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) =>
                    updateFilter('date_from', event.target.value)
                  }
                  type="date"
                  value={filters.date_from}
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>إلى تاريخ</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) =>
                    updateFilter('date_to', event.target.value)
                  }
                  type="date"
                  value={filters.date_to}
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>رقم المستخدم</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  inputMode="numeric"
                  onChange={(event) => updateFilter('actor', event.target.value)}
                  value={filters.actor}
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>الإجراء</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) => updateFilter('action', event.target.value)}
                  value={filters.action}
                />
              </label>
              <div className="flex items-end">
                <AppButton disabled={isLoading} fullWidth type="submit">
                  تحديث السجل
                </AppButton>
              </div>
            </form>
          </AppCard>

          {isLoading ? (
            <AppCard>
              <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                جاري تحميل سجل النشاط...
              </p>
            </AppCard>
          ) : null}

          {error ? (
            <AppCard>
              <p className="text-sm font-bold text-[var(--sloty-danger)]">
                {error}
              </p>
            </AppCard>
          ) : null}

          {!isLoading && !error ? <AuditLogList entries={entries} /> : null}
        </>
      ) : null}
    </div>
  )
}
