import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { canManageSettlements } from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import type { PaginatedResponse } from '../../../shared/api/api.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { FilterSheet } from '../../../shared/components/FilterSheet/FilterSheet'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../../shared/utils/buildPathWithQuery'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import type { ClubUser } from '../../clubUsers/clubUsers.types'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import { listSettlements } from '../settlementsApi'
import type {
  Settlement,
  SettlementActor,
  SettlementQueryParams,
} from '../settlements.types'

interface HubFilterState {
  collected_by: string
  status: string
  court: string
}

const settlementFilterKeys = [
  'collected_by',
  'status',
  'court',
  'page',
] as const

const statusLabels: Record<string, string> = {
  PENDING: 'قيد المراجعة',
  SETTLED: 'مسواة',
  CANCELLED: 'ملغاة',
}

function parseSettlementQuery(search: string): SettlementQueryParams {
  const queryObject = toQueryObject(search)
  const params: SettlementQueryParams = {}

  settlementFilterKeys.forEach((key) => {
    const value = queryObject[key]

    if (!value) {
      return
    }

    params[key] = value
  })

  return params
}

function filterStateFromParams(params: SettlementQueryParams): HubFilterState {
  return {
    collected_by:
      params.collected_by === undefined ? '' : String(params.collected_by),
    status: params.status ?? '',
    court: params.court === undefined ? '' : String(params.court),
  }
}

function hasSettlementFilters(params: SettlementQueryParams): boolean {
  return settlementFilterKeys.some((key) => {
    const value = params[key]

    return value !== undefined && value !== ''
  })
}

function paramsFromFilters(filters: HubFilterState): SettlementQueryParams {
  return {
    ...(filters.collected_by ? { collected_by: filters.collected_by } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.court ? { court: filters.court } : {}),
  }
}

function getSettlementsSearch(params: SettlementQueryParams): string {
  return buildPathWithQuery('', params as Record<string, QueryParamValue>)
}

function formatDate(value: string | null | undefined): string | null {
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

function formatActor(actor: number | SettlementActor | null | undefined): string {
  if (!actor) {
    return 'غير محدد'
  }

  if (typeof actor === 'number') {
    return `#${actor}`
  }

  return actor.name ?? `#${actor.id}`
}

function getUserName(user: ClubUser): string {
  const fullName = [user.first_name, user.last_name]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')

  return fullName || user.username || `#${user.id}`
}

function normalizeClubUsers(
  response: ClubUser[] | PaginatedResponse<ClubUser>,
): ClubUser[] {
  return Array.isArray(response) ? response : response.results
}

interface SettlementFiltersFormProps {
  filters: HubFilterState
  users: ClubUser[]
  courts: Court[]
  isLoadingFilters: boolean
  isLoadingSettlements: boolean
  onApply: (filters: HubFilterState) => void
  onClose?: () => void
  onReset: () => void
}

function SettlementFiltersForm({
  courts,
  filters,
  isLoadingFilters,
  isLoadingSettlements,
  onApply,
  onClose,
  onReset,
  users,
}: SettlementFiltersFormProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  function updateFilter(field: keyof HubFilterState, value: string): void {
    setLocalFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onApply(localFilters)
    onClose?.()
  }

  return (
    <form
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      onSubmit={handleSubmit}
    >
      <label className="space-y-2 text-sm font-semibold">
        <span>الموظف المحصل</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          disabled={isLoadingFilters}
          onChange={(event) => updateFilter('collected_by', event.target.value)}
          value={localFilters.collected_by}
        >
          <option value="">كل الموظفين</option>
          {localFilters.collected_by
          && !users.some((user) => String(user.id) === localFilters.collected_by) ? (
            <option value={localFilters.collected_by}>
              الموظف #{localFilters.collected_by}
            </option>
          ) : null}
          {users.map((user) => (
            <option key={user.membership_id} value={user.id}>
              {getUserName(user)}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm font-semibold">
        <span>الحالة</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('status', event.target.value)}
          value={localFilters.status}
        >
          <option value="">كل الحالات</option>
          <option value="PENDING">قيد المراجعة</option>
          <option value="SETTLED">مسواة</option>
          <option value="CANCELLED">ملغاة</option>
        </select>
      </label>

      <label className="space-y-2 text-sm font-semibold">
        <span>الملعب</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          disabled={isLoadingFilters}
          onChange={(event) => updateFilter('court', event.target.value)}
          value={localFilters.court}
        >
          <option value="">كل الملاعب</option>
          {localFilters.court
          && !courts.some((court) => String(court.id) === localFilters.court) ? (
            <option value={localFilters.court}>ملعب #{localFilters.court}</option>
          ) : null}
          {courts.map((court) => (
            <option key={court.id} value={court.id}>
              {court.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2 xl:justify-end">
        <AppButton disabled={isLoadingSettlements} fullWidth type="submit">
          {isLoadingSettlements ? 'جاري التحميل...' : 'تحديث السجل'}
        </AppButton>
        <AppButton
          disabled={isLoadingSettlements}
          fullWidth
          onClick={() => {
            onReset()
            onClose?.()
          }}
          type="button"
          variant="secondary"
        >
          إعادة ضبط
        </AppButton>
        {onClose ? (
          <AppButton fullWidth onClick={onClose} type="button" variant="secondary">
            إغلاق
          </AppButton>
        ) : null}
      </div>
    </form>
  )
}

/**
 * Settlement management hub: safe shortcuts plus backend settlement records.
 */
export function SettlementsHubPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedClubSlug, selectedMembership } = useAuth()
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [users, setUsers] = useState<ClubUser[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCollectorId, setSelectedCollectorId] = useState('')
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingFilters, setIsLoadingFilters] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null)
  const canSettle = canManageSettlements(selectedMembership)
  const queryParams = useMemo(
    () => parseSettlementQuery(location.search),
    [location.search],
  )
  const filters = useMemo(
    () => filterStateFromParams(queryParams),
    [queryParams],
  )
  const hasAccess = Boolean(selectedClubSlug && canSettle)

  useEffect(() => {
    let isActive = true

    async function loadOptions(): Promise<void> {
      if (!hasAccess || !selectedClubSlug) {
        setUsers([])
        setCourts([])
        setFilterOptionsError(null)
        return
      }

      setIsLoadingFilters(true)
      setFilterOptionsError(null)

      const [usersResult, courtsResult] = await Promise.allSettled([
        listClubUsers(selectedClubSlug, { is_active: true }),
        listCourts(selectedClubSlug),
      ])

      if (!isActive) {
        return
      }

      if (usersResult.status === 'fulfilled') {
        const nextUsers = normalizeClubUsers(usersResult.value)

        setUsers(nextUsers)
        setSelectedCollectorId((current) => current || String(nextUsers[0]?.id ?? ''))
      } else {
        setUsers([])
        setFilterOptionsError('تعذر تحميل خيارات الفلاتر')
      }

      if (courtsResult.status === 'fulfilled') {
        setCourts(courtsResult.value.results.filter((court) => court.is_active))
      } else {
        setCourts([])
        setFilterOptionsError('تعذر تحميل خيارات الفلاتر')
      }

      setIsLoadingFilters(false)
    }

    void loadOptions()

    return () => {
      isActive = false
    }
  }, [hasAccess, selectedClubSlug])

  useEffect(() => {
    let isActive = true

    async function loadSettlements(): Promise<void> {
      if (!selectedClubSlug) {
        setSettlements([])
        setError(null)
        setMessage('اختر ناديًا أولًا لعرض التسويات.')
        setIsLoading(false)
        return
      }

      if (!canSettle) {
        setSettlements([])
        setError('ليس لديك صلاحية إدارة التسويات.')
        setMessage(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      setMessage(null)

      try {
        const response = hasSettlementFilters(queryParams)
          ? await listSettlements(selectedClubSlug, queryParams)
          : await listSettlements(selectedClubSlug)

        if (isActive) {
          setSettlements(response.results)
        }
      } catch (error) {
        if (isActive) {
          setSettlements([])
          setError(getApiErrorMessage(error, 'تعذر تحميل سجل التسويات'))
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadSettlements()

    return () => {
      isActive = false
    }
  }, [canSettle, queryParams, selectedClubSlug])

  function applyFilters(nextFilters: HubFilterState): void {
    navigate(
      {
        pathname: location.pathname,
        search: getSettlementsSearch(paramsFromFilters(nextFilters)),
      },
      { replace: false },
    )
  }

  function resetFilters(): void {
    navigate(
      {
        pathname: location.pathname,
        search: '',
      },
      { replace: false },
    )
  }

  function handleReviewSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (!selectedCollectorId) {
      return
    }

    navigate(`/settlements/preview?collected_by=${selectedCollectorId}`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        description="مراجعة وتسوية دفعات الموظفين"
        tone="brand"
        title="التسويات المالية والجرد"
      />

      {hasAccess ? (
        <AppCard className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
              مراجعة دفعات موظف
            </h2>
            <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
              اختر الموظف المحصل لمراجعة الدفعات غير المسواة قبل تأكيد التسوية.
            </p>
          </div>

          <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleReviewSubmit}>
            <label className="space-y-2 text-sm font-semibold">
              <span>الموظف المحصل</span>
              <select
                className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                disabled={isLoadingFilters || users.length === 0}
                onChange={(event) => setSelectedCollectorId(event.target.value)}
                value={selectedCollectorId}
              >
                {users.length === 0 ? (
                  <option value="">لا يوجد موظفون متاحون</option>
                ) : null}
                {users.map((user) => (
                  <option key={user.membership_id} value={user.id}>
                    {getUserName(user)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-2 md:justify-end">
              <AppButton
                disabled={!selectedCollectorId || isLoadingFilters}
                fullWidth
                type="submit"
              >
                مراجعة التسوية
              </AppButton>
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard">
              <AppButton variant="secondary">عرض لوحة التحكم</AppButton>
            </Link>
            <Link to="/transactions?settlement_status=unsettled&is_cancelled=false">
              <AppButton variant="secondary">عرض الدفعات غير المسواة</AppButton>
            </Link>
          </div>
        </AppCard>
      ) : null}

      {filterOptionsError ? (
        <p className="text-xs font-bold text-[var(--sloty-danger)]">
          {filterOptionsError}
        </p>
      ) : null}

      {hasAccess ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
              سجل التسويات
            </h2>
            <AppButton onClick={() => setIsFilterSheetOpen(true)} type="button">
              فلترة
            </AppButton>
          </div>

          <AppCard className="hidden md:block">
            <SettlementFiltersForm
              courts={courts}
              filters={filters}
              isLoadingFilters={isLoadingFilters}
              isLoadingSettlements={isLoading}
              key={`desktop-${getSettlementsSearch(queryParams) || 'empty'}`}
              onApply={applyFilters}
              onReset={resetFilters}
              users={users}
            />
          </AppCard>

          <FilterSheet
            isOpen={isFilterSheetOpen}
            onClose={() => setIsFilterSheetOpen(false)}
            title="فلترة التسويات"
          >
            <SettlementFiltersForm
              courts={courts}
              filters={filters}
              isLoadingFilters={isLoadingFilters}
              isLoadingSettlements={isLoading}
              key={`mobile-${getSettlementsSearch(queryParams) || 'empty'}`}
              onApply={applyFilters}
              onClose={() => setIsFilterSheetOpen(false)}
              onReset={resetFilters}
              users={users}
            />
          </FilterSheet>
        </>
      ) : null}

      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل سجل التسويات...
          </p>
        </AppCard>
      ) : null}

      {!isLoading && (error || message) ? (
        <AppCard>
          <p
            className={[
              'text-sm font-bold',
              error
                ? 'text-[var(--sloty-danger)]'
                : 'text-[var(--sloty-text-muted)]',
            ].join(' ')}
          >
            {error ?? message}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && !message && settlements.length === 0 ? (
        <AppCard className="space-y-3">
          <div>
            <p className="text-base font-black text-[var(--sloty-text-primary)]">
              لا توجد تسويات مسجلة حتى الآن
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
              عند تأكيد تسوية موظف ستظهر هنا كسجل مالي مغلق.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard">
              <AppButton variant="secondary">عرض لوحة التحكم</AppButton>
            </Link>
            <Link to="/transactions?settlement_status=unsettled&is_cancelled=false">
              <AppButton variant="secondary">عرض الدفعات غير المسواة</AppButton>
            </Link>
          </div>
        </AppCard>
      ) : null}

      {!isLoading && !error && settlements.length > 0 ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {settlements.map((settlement) => {
            const periodStart = formatDate(settlement.period_start)
            const periodEnd = formatDate(settlement.period_end)
            const createdDate = formatDate(
              settlement.created ?? settlement.created_at,
            )
            const settledDate = formatDate(settlement.settled_at)
            const status = settlement.status
              ? statusLabels[settlement.status] ?? settlement.status
              : 'غير محدد'

            return (
              <AppCard className="space-y-3" key={settlement.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      رقم التسوية
                    </p>
                    <p className="mt-1 text-xl font-black text-[var(--sloty-text-primary)]">
                      #{settlement.id}
                    </p>
                  </div>
                  {settlement.total_amount ? (
                    <p
                      className="rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-sm font-black text-[var(--sloty-primary-dark)]"
                      dir="ltr"
                    >
                      {settlement.total_amount}
                    </p>
                  ) : null}
                </div>

                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                    <dt className="font-bold text-[var(--sloty-text-muted)]">
                      الموظف المحصل
                    </dt>
                    <dd className="font-black text-[var(--sloty-text-primary)]">
                      {settlement.collected_by_name ??
                        (settlement.collected_by
                          ? `#${settlement.collected_by}`
                          : 'غير محدد')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                    <dt className="font-bold text-[var(--sloty-text-muted)]">
                      الحالة
                    </dt>
                    <dd className="font-black text-[var(--sloty-text-primary)]">
                      {status}
                    </dd>
                  </div>
                  {settlement.transaction_count !== undefined ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        عدد المعاملات
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {settlement.transaction_count}
                      </dd>
                    </div>
                  ) : null}
                  {periodStart || periodEnd ? (
                    <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        الفترة
                      </dt>
                      <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                        {periodStart ?? '...'} - {periodEnd ?? '...'}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                    <dt className="font-bold text-[var(--sloty-text-muted)]">
                      أنشئت بواسطة
                    </dt>
                    <dd className="font-black text-[var(--sloty-text-primary)]">
                      {formatActor(settlement.created_by)}
                    </dd>
                  </div>
                  {createdDate ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        تاريخ الإنشاء
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {createdDate}
                      </dd>
                    </div>
                  ) : null}
                  {settlement.settled_by ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        تم التسوية بواسطة
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {formatActor(settlement.settled_by)}
                      </dd>
                    </div>
                  ) : null}
                  {settledDate ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        تاريخ التسوية
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {settledDate}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <Link to={`/settlements/${settlement.id}`}>
                  <AppButton fullWidth variant="secondary">
                    عرض التفاصيل
                  </AppButton>
                </Link>
              </AppCard>
            )
          })}
        </section>
      ) : null}
    </div>
  )
}
