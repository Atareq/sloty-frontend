import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { getClubUserDisplayName } from '../../../shared/utils/displayNames'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import type { ClubUser } from '../../clubUsers/clubUsers.types'
import { listAuditLogs } from '../auditApi'
import type { AuditLogEntry, AuditQueryParams } from '../audit.types'
import {
  auditActionOptions,
  getAuditActionLabel,
} from '../auditActionLabels'
import { AuditLogList } from '../components/AuditLogList/AuditLogList'

interface FilterState {
  date_from: string
  date_to: string
  actor: string
  action: string
}

interface FilterOption {
  value: string
  label: string
}

function buildParams(filters: FilterState): AuditQueryParams {
  return {
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(filters.actor.trim() ? { actor: filters.actor.trim() } : {}),
    ...(filters.action.trim() ? { action: filters.action.trim() } : {}),
  }
}

function getFiltersFromSearch(search: string): FilterState {
  const query = toQueryObject(search)

  return {
    date_from: query.date_from ?? '',
    date_to: query.date_to ?? '',
    actor: query.actor ?? '',
    action: query.action ?? '',
  }
}

function getAuditSearch(params: AuditQueryParams): string {
  const searchParams = new URLSearchParams()

  if (params.date_from) {
    searchParams.set('date_from', params.date_from)
  }

  if (params.date_to) {
    searchParams.set('date_to', params.date_to)
  }

  if (params.actor) {
    searchParams.set('actor', String(params.actor))
  }

  if (params.action) {
    searchParams.set('action', params.action)
  }

  const queryString = searchParams.toString()

  return queryString ? `?${queryString}` : ''
}

function normalizeClubUsersResponse(
  response: ClubUser[] | { results: ClubUser[] },
): ClubUser[] {
  return Array.isArray(response) ? response : response.results
}

/**
 * Read-only sensitive activity log for club owners.
 */
export function AuditLogsPage() {
  const { role, selectedClubSlug } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const filtersFromSearch = useMemo(
    () => getFiltersFromSearch(location.search),
    [location.search],
  )
  const [filters, setFilters] = useState<FilterState>(filtersFromSearch)
  const [userOptions, setUserOptions] = useState<FilterOption[]>([])
  const [isUserOptionsLoading, setIsUserOptionsLoading] = useState(false)
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(
    null,
  )
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canViewAuditLogs = role === 'OWNER'

  useEffect(() => {
    if (!selectedClubSlug || !canViewAuditLogs) {
      return
    }

    let isActive = true
    const clubSlug = selectedClubSlug
    const params = buildParams(filtersFromSearch)

    void Promise.resolve().then(async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await listAuditLogs(clubSlug, params)

        if (isActive) {
          setEntries(response.results)
        }
      } catch (error) {
        if (isActive) {
          setEntries([])
          setError(getApiErrorMessage(error, 'تعذر تحميل سجل النشاط'))
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    })

    return () => {
      isActive = false
    }
  }, [canViewAuditLogs, filtersFromSearch, selectedClubSlug])

  useEffect(() => {
    if (!selectedClubSlug || !canViewAuditLogs) {
      return
    }

    let isActive = true
    const clubSlug = selectedClubSlug

    async function loadUserOptions(): Promise<void> {
      setIsUserOptionsLoading(true)
      setFilterOptionsError(null)

      try {
        const response = await listClubUsers(clubSlug, {
          is_active: true,
        })

        if (!isActive) {
          return
        }

        setUserOptions(
          normalizeClubUsersResponse(response).map((clubUser) => ({
            value: String(clubUser.id),
            label: getClubUserDisplayName(clubUser),
          })),
        )
      } catch {
        if (isActive) {
          setUserOptions([])
          setFilterOptionsError('تعذر تحميل خيارات الفلاتر')
        }
      } finally {
        if (isActive) {
          setIsUserOptionsLoading(false)
        }
      }
    }

    void Promise.resolve().then(loadUserOptions)

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
    navigate({
      pathname: location.pathname,
      search: getAuditSearch(buildParams(filters)),
    })
  }

  const shouldShowActorFallbackOption =
    Boolean(filters.actor) &&
    !userOptions.some((option) => option.value === filters.actor)
  const shouldShowActionFallbackOption =
    Boolean(filters.action) &&
    !auditActionOptions.some((option) => option.value === filters.action)

  return (
    <div className="space-y-5">
      {!selectedClubSlug ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            اختر ناديًا أولًا لعرض سجل النشاطات
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug && !canViewAuditLogs ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-danger)]">
            ليس لديك صلاحية عرض سجل النشاطات
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug && canViewAuditLogs ? (
        <>
          <AppCard>
            {filterOptionsError ? (
              <p className="mb-3 text-xs font-bold text-[var(--sloty-danger)]">
                {filterOptionsError}
              </p>
            ) : null}
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
                <span>المستخدم</span>
                <select
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  disabled={isUserOptionsLoading}
                  onChange={(event) => updateFilter('actor', event.target.value)}
                  value={filters.actor}
                >
                  <option value="">
                    {isUserOptionsLoading
                      ? 'جاري تحميل المستخدمين...'
                      : 'كل المستخدمين'}
                  </option>
                  {shouldShowActorFallbackOption ? (
                    <option value={filters.actor}>مستخدم #{filters.actor}</option>
                  ) : null}
                  {userOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>نوع الإجراء</span>
                <select
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) => updateFilter('action', event.target.value)}
                  value={filters.action}
                >
                  {shouldShowActionFallbackOption ? (
                    <option value={filters.action}>
                      {getAuditActionLabel(filters.action)}
                    </option>
                  ) : null}
                  {auditActionOptions.map((option) => (
                    <option key={option.value || 'all-actions'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
                جاري تحميل سجل النشاطات...
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
