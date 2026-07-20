import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { canManageSettlements } from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import type { ClubUser } from '../../clubUsers/clubUsers.types'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import type { PaginatedResponse } from '../../../shared/api/api.types'
import { listSettlements } from '../settlementsApi'
import type {
  Settlement,
  SettlementActor,
  SettlementQueryParams,
} from '../settlements.types'

interface HistoryFilterState {
  collected_by: string
  status: string
  court: string
}

const initialFilters: HistoryFilterState = {
  collected_by: '',
  status: '',
  court: '',
}

const statusLabels: Record<string, string> = {
  PENDING: 'قيد المراجعة',
  SETTLED: 'مسواة',
  CANCELLED: 'ملغاة',
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
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')

  return fullName.trim() || user.username
}

function normalizeClubUsers(
  response: ClubUser[] | PaginatedResponse<ClubUser>,
): ClubUser[] {
  return Array.isArray(response) ? response : response.results
}

function buildParams(filters: HistoryFilterState): SettlementQueryParams {
  return {
    ...(filters.collected_by ? { collected_by: filters.collected_by } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.court ? { court: filters.court } : {}),
  }
}

/**
 * Read-only settlement history for the selected club context.
 */
export function SettlementHistoryPage() {
  const { selectedClubSlug, selectedMembership } = useAuth()
  const [filters, setFilters] = useState<HistoryFilterState>(initialFilters)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [users, setUsers] = useState<ClubUser[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingFilters, setIsLoadingFilters] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const canSettle = canManageSettlements(selectedMembership)

  useEffect(() => {
    let isActive = true

    async function loadInitialData(): Promise<void> {
      if (!selectedClubSlug) {
        setSettlements([])
        setError(null)
        setMessage('اختر ناديًا أولًا لعرض التسويات')
        setIsLoading(false)
        return
      }

      if (!canSettle) {
        setSettlements([])
        setError('ليس لديك صلاحية إدارة التسويات')
        setMessage(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setIsLoadingFilters(true)
      setError(null)
      setMessage(null)

      const [settlementsResult, usersResult, courtsResult] =
        await Promise.allSettled([
          listSettlements(selectedClubSlug),
          listClubUsers(selectedClubSlug),
          listCourts(selectedClubSlug),
        ])

      if (!isActive) {
        return
      }

      if (settlementsResult.status === 'fulfilled') {
        setSettlements(settlementsResult.value.results)
      } else {
        setSettlements([])
        setError(
          getApiErrorMessage(
            settlementsResult.reason,
            'تعذر تحميل سجل التسويات',
          ),
        )
      }

      if (usersResult.status === 'fulfilled') {
        setUsers(normalizeClubUsers(usersResult.value))
      } else {
        setUsers([])
      }

      if (courtsResult.status === 'fulfilled') {
        setCourts(courtsResult.value.results)
      } else {
        setCourts([])
      }

      setIsLoading(false)
      setIsLoadingFilters(false)
    }

    void loadInitialData()

    return () => {
      isActive = false
    }
  }, [canSettle, selectedClubSlug])

  function updateFilter(field: keyof HistoryFilterState, value: string): void {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleFilterSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()

    if (!selectedClubSlug || !canSettle) {
      return
    }

    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await listSettlements(
        selectedClubSlug,
        buildParams(filters),
      )

      setSettlements(response.results)
    } catch (error) {
      setSettlements([])
      setError(getApiErrorMessage(error, 'تعذر تحميل سجل التسويات'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <Link to="/settlements">
            <AppButton variant="secondary">تسوية جديدة</AppButton>
          </Link>
        }
        description="التسويات السابقة والمعاملات التي تم قفلها"
        tone="brand"
        title="سجل التسويات"
      />

      {selectedClubSlug && canSettle ? (
        <AppCard>
          <form
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={handleFilterSubmit}
          >
            <label className="space-y-2 text-sm font-semibold">
              <span>المستخدم</span>
              <select
                className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                disabled={isLoadingFilters}
                onChange={(event) =>
                  updateFilter('collected_by', event.target.value)
                }
                value={filters.collected_by}
              >
                <option value="">كل المستخدمين</option>
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
                value={filters.status}
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
                value={filters.court}
              >
                <option value="">كل الملاعب</option>
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <AppButton disabled={isLoading} fullWidth type="submit">
                {isLoading ? 'جاري التحميل...' : 'تحديث السجل'}
              </AppButton>
            </div>
          </form>
        </AppCard>
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
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            لا توجد تسويات مسجلة حتى الآن
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && settlements.length > 0 ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {settlements.map((settlement) => {
            const periodStart = formatDate(settlement.period_start)
            const periodEnd = formatDate(settlement.period_end)
            const createdDate = formatDate(settlement.created)
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
                      المستخدم
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
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                    <dt className="font-bold text-[var(--sloty-text-muted)]">
                      تم التسوية بواسطة
                    </dt>
                    <dd className="font-black text-[var(--sloty-text-primary)]">
                      {formatActor(settlement.settled_by)}
                    </dd>
                  </div>
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
