import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import {
  canManageSettlements,
  canViewOwnSettlements,
} from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import type { PaginatedResponse } from '../../../shared/api/api.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { AppSelect } from '../../../shared/components/AppSelect/AppSelect'
import { FilterSheet } from '../../../shared/components/FilterSheet/FilterSheet'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../../shared/utils/buildPathWithQuery'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import type { ClubUser } from '../../clubUsers/clubUsers.types'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import { getSettlementPreview, listSettlements } from '../settlementsApi'
import { SettlementPreviewContent } from '../components/SettlementPreviewContent/SettlementPreviewContent'
import type {
  Settlement,
  SettlementActor,
  SettlementPreview,
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

const settlementStatusFilterOptions = [
  { value: '', label: 'كل الحالات' },
  { value: 'PENDING', label: 'قيد المراجعة' },
  { value: 'SETTLED', label: 'مسواة' },
  { value: 'CANCELLED', label: 'ملغاة' },
]

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

  const userFilterOptions = [
    { value: '', label: 'كل الموظفين' },
    ...(localFilters.collected_by
    && !users.some((user) => String(user.id) === localFilters.collected_by)
      ? [
        {
          value: localFilters.collected_by,
          label: `الموظف #${localFilters.collected_by}`,
        },
      ]
      : []),
    ...users.map((user) => ({
      value: String(user.id),
      label: getUserName(user),
    })),
  ]

  const courtFilterOptions = [
    { value: '', label: 'كل الملاعب' },
    ...(localFilters.court
    && !courts.some((court) => String(court.id) === localFilters.court)
      ? [{ value: localFilters.court, label: `ملعب #${localFilters.court}` }]
      : []),
    ...courts.map((court) => ({
      value: String(court.id),
      label: court.name,
    })),
  ]

  return (
    <form
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      onSubmit={handleSubmit}
    >
      <AppSelect
        disabled={isLoadingFilters}
        label="الموظف المحصل"
        onChange={(value) => updateFilter('collected_by', value)}
        options={userFilterOptions}
        value={localFilters.collected_by}
      />

      <AppSelect
        label="الحالة"
        onChange={(value) => updateFilter('status', value)}
        options={settlementStatusFilterOptions}
        value={localFilters.status}
      />

      <AppSelect
        disabled={isLoadingFilters}
        label="الملعب"
        onChange={(value) => updateFilter('court', value)}
        options={courtFilterOptions}
        value={localFilters.court}
      />

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
  const { role, selectedClubSlug, selectedMembership } = useAuth()
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [users, setUsers] = useState<ClubUser[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCollectorId, setSelectedCollectorId] = useState('')
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingFilters, setIsLoadingFilters] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [ownPreview, setOwnPreview] = useState<SettlementPreview | null>(null)
  const [isOwnPreviewLoading, setIsOwnPreviewLoading] = useState(false)
  const [ownPreviewError, setOwnPreviewError] = useState<string | null>(null)
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null)
  const canSettle = canManageSettlements(selectedMembership, role)
  const canViewOwn = canViewOwnSettlements(selectedMembership, role)
  const isOwnMode = canViewOwn && !canSettle
  const queryParams = useMemo(
    () => parseSettlementQuery(location.search),
    [location.search],
  )
  const filters = useMemo(
    () => filterStateFromParams(queryParams),
    [queryParams],
  )
  const hasAccess = Boolean(selectedClubSlug && canViewOwn)

  useEffect(() => {
    let isActive = true

    async function loadOptions(): Promise<void> {
      if (!hasAccess || !selectedClubSlug || !canSettle) {
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
  }, [canSettle, hasAccess, selectedClubSlug])

  useEffect(() => {
    let isActive = true

    async function loadOwnPreview(): Promise<void> {
      if (!selectedClubSlug || !isOwnMode) {
        setOwnPreview(null)
        setOwnPreviewError(null)
        setIsOwnPreviewLoading(false)
        return
      }

      setIsOwnPreviewLoading(true)
      setOwnPreviewError(null)

      try {
        const response = await getSettlementPreview(selectedClubSlug, {})

        if (isActive) {
          setOwnPreview(response)
        }
      } catch (error) {
        if (isActive) {
          setOwnPreview(null)
          setOwnPreviewError(
            getApiErrorMessage(error, 'تعذر تحميل المبلغ الحالي غير المسوى'),
          )
        }
      } finally {
        if (isActive) {
          setIsOwnPreviewLoading(false)
        }
      }
    }

    void loadOwnPreview()

    return () => {
      isActive = false
    }
  }, [isOwnMode, selectedClubSlug])

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

      if (!canSettle && !isOwnMode) {
        setSettlements([])
        setError('ليس لديك صلاحية عرض التسويات.')
        setMessage(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      setMessage(null)

      try {
        const response = isOwnMode
          ? await listSettlements(selectedClubSlug)
          : hasSettlementFilters(queryParams)
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
  }, [canSettle, isOwnMode, queryParams, selectedClubSlug])

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
      {isOwnMode ? (
        <AppCard className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
              المبلغ الحالي غير المسوى
            </h2>
            <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
              يعرض الخادم دفعاتك غير المسواة الحالية بدون اختيار موظف آخر.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/transactions?settlement_status=unsettled&is_cancelled=false">
              <AppButton variant="secondary">عرض الدفعات غير المسواة</AppButton>
            </Link>
          </div>
        </AppCard>
      ) : null}

      {canSettle ? (
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
            <AppSelect
              disabled={isLoadingFilters || users.length === 0}
              emptyLabel="لا يوجد موظفون متاحون"
              label="الموظف المحصل"
              onChange={setSelectedCollectorId}
              options={users.map((user) => ({
                value: String(user.id),
                label: getUserName(user),
              }))}
              placeholder="لا يوجد موظفون متاحون"
              value={selectedCollectorId}
            />

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

      {isOwnMode ? (
        <>
          {isOwnPreviewLoading ? (
            <AppCard>
              <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                جاري تحميل المبلغ الحالي غير المسوى...
              </p>
            </AppCard>
          ) : null}

          {!isOwnPreviewLoading && ownPreviewError ? (
            <AppCard>
              <p className="text-sm font-bold text-[var(--sloty-danger)]">
                {ownPreviewError}
              </p>
            </AppCard>
          ) : null}

          {!isOwnPreviewLoading && !ownPreviewError && ownPreview ? (
            <SettlementPreviewContent preview={ownPreview} />
          ) : null}
        </>
      ) : null}

      {canSettle || isOwnMode ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
              سجل التسويات
            </h2>
            {canSettle ? (
              <AppButton onClick={() => setIsFilterSheetOpen(true)} type="button">
                فلترة
              </AppButton>
            ) : null}
          </div>

          {canSettle ? (
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
          ) : null}

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

      {(canSettle || isOwnMode) && isLoading ? (
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

      {(canSettle || isOwnMode) &&
      !isLoading &&
      !error &&
      !message &&
      settlements.length === 0 ? (
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

      {(canSettle || isOwnMode) &&
      !isLoading &&
      !error &&
      settlements.length > 0 ? (
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
