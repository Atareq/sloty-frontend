import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import type { PaginatedResponse } from '../../../shared/api/api.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { FilterSheet } from '../../../shared/components/FilterSheet/FilterSheet'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../../shared/utils/buildPathWithQuery'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import type {
  ClubUser,
  ClubUserRole,
  ClubUsersQueryParams,
} from '../../clubUsers/clubUsers.types'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'

interface UsersFilterState {
  role: ClubUserRole | ''
  court: string
  is_active: string
  search: string
}

const usersFilterKeys = ['role', 'court', 'is_active', 'search'] as const

const roleLabels: Record<ClubUserRole, string> = {
  OWNER: 'مالك',
  MANAGER: 'مدير',
  STAFF: 'موظف',
}

const permissionLabels = [
  {
    key: 'can_change_pricing',
    label: 'تعديل أسعار الملاعب',
  },
  {
    key: 'can_manage_working_hours',
    label: 'إدارة مواعيد العمل',
  },
  {
    key: 'can_manage_settlements',
    label: 'إدارة التسويات المالية والجرد',
  },
] as const

function isClubUserRole(value: string): value is ClubUserRole {
  return value === 'OWNER' || value === 'MANAGER' || value === 'STAFF'
}

function parseUsersQuery(search: string): ClubUsersQueryParams {
  const queryObject = toQueryObject(search)
  const params: ClubUsersQueryParams = {}

  usersFilterKeys.forEach((key) => {
    const value = queryObject[key]

    if (!value) {
      return
    }

    if (key === 'role') {
      params.role = isClubUserRole(value) ? value : ''
      return
    }

    params[key] = value
  })

  return params
}

function filterStateFromParams(params: ClubUsersQueryParams): UsersFilterState {
  return {
    role: params.role ?? '',
    court: params.court === undefined ? '' : String(params.court),
    is_active: params.is_active === undefined ? '' : String(params.is_active),
    search: params.search ?? '',
  }
}

function paramsFromFilters(filters: UsersFilterState): ClubUsersQueryParams {
  return {
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.court ? { court: filters.court } : {}),
    ...(filters.is_active ? { is_active: filters.is_active } : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
  }
}

function getUsersSearch(params: ClubUsersQueryParams): string {
  return buildPathWithQuery('', params as Record<string, QueryParamValue>)
}

function normalizeClubUsersResponse(
  response: ClubUser[] | PaginatedResponse<ClubUser>,
): ClubUser[] {
  return Array.isArray(response) ? response : response.results
}

function getUserDisplayName(user: ClubUser): string {
  const fullName = [user.first_name, user.last_name]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')

  return fullName || user.username
}

function getUserCourtName(user: ClubUser, courts: Court[]): string | null {
  if (user.court_name) {
    return user.court_name
  }

  if (!user.court) {
    return null
  }

  return courts.find((court) => court.id === user.court)?.name ?? `ملعب #${user.court}`
}

interface UsersFilterFormProps {
  courts: Court[]
  filters: UsersFilterState
  isLoading: boolean
  onApply: (filters: UsersFilterState) => void
  onClose?: () => void
  onReset: () => void
}

function UsersFilterForm({
  courts,
  filters,
  isLoading,
  onApply,
  onClose,
  onReset,
}: UsersFilterFormProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  function updateFilter(field: keyof UsersFilterState, value: string): void {
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
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
      onSubmit={handleSubmit}
    >
      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>الدور</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('role', event.target.value)}
          value={localFilters.role}
        >
          <option value="">الكل</option>
          <option value="OWNER">مالك</option>
          <option value="MANAGER">مدير</option>
          <option value="STAFF">موظف</option>
        </select>
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>الحالة</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('is_active', event.target.value)}
          value={localFilters.is_active}
        >
          <option value="">الكل</option>
          <option value="true">نشط</option>
          <option value="false">غير نشط</option>
        </select>
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>الملعب</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
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
        <AppButton disabled={isLoading} fullWidth type="submit">
          تطبيق الفلاتر
        </AppButton>
        <AppButton
          disabled={isLoading}
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

function ActiveBadge({ isActive }: { isActive: boolean | undefined }) {
  if (isActive === undefined) {
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
        الحالة غير محددة
      </span>
    )
  }

  return (
    <span
      className={[
        'rounded-full px-3 py-1 text-xs font-black',
        isActive
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-slate-100 text-slate-700',
      ].join(' ')}
    >
      {isActive ? 'نشط' : 'غير نشط'}
    </span>
  )
}

function PermissionBadge({
  enabled,
  label,
}: {
  enabled: boolean
  label: string
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black',
        enabled
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-slate-100 text-slate-700',
      ].join(' ')}
    >
      <span aria-hidden="true">{enabled ? '✓' : '×'}</span>
      {label}
      <span>{enabled ? 'مفعل' : 'غير مفعل'}</span>
    </span>
  )
}

function UserPermissions({ user }: { user: ClubUser }) {
  if (user.role === 'OWNER') {
    return (
      <p className="rounded-xl bg-[var(--sloty-soft-mint)] px-3 py-2 text-sm font-black text-[var(--sloty-primary-dark)]">
        صلاحيات كاملة كمالك
      </p>
    )
  }

  if (user.role === 'STAFF') {
    return (
      <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
        موظف تشغيل
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-black text-[var(--sloty-text-primary)]">
        الصلاحيات
      </p>
      <div className="flex flex-wrap gap-2">
        {permissionLabels.map((permission) => (
          <PermissionBadge
            enabled={Boolean(user[permission.key])}
            key={permission.key}
            label={permission.label}
          />
        ))}
      </div>
      <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
        تعديل الصلاحيات سيتم في خطوة لاحقة بعد تأكيد Endpoint التحديث.
      </p>
    </div>
  )
}

function UserCard({ courts, user }: { courts: Court[]; user: ClubUser }) {
  const courtName = getUserCourtName(user, courts)

  return (
    <AppCard className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
            {getUserDisplayName(user)}
          </h2>
          <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
            {roleLabels[user.role]} · @{user.username}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]">
            {roleLabels[user.role]}
          </span>
          <ActiveBadge isActive={user.membership_is_active} />
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-2 text-sm">
        {user.phone_number ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
            <dt className="font-bold text-[var(--sloty-text-muted)]">الهاتف</dt>
            <dd className="font-black text-[var(--sloty-text-primary)]" dir="ltr">
              {user.phone_number}
            </dd>
          </div>
        ) : null}
        {courtName ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
            <dt className="font-bold text-[var(--sloty-text-muted)]">الملعب</dt>
            <dd className="font-black text-[var(--sloty-text-primary)]">
              {courtName}
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
          <dt className="font-bold text-[var(--sloty-text-muted)]">رقم العضوية</dt>
          <dd className="font-black text-[var(--sloty-text-primary)]" dir="ltr">
            #{user.membership_id}
          </dd>
        </div>
      </dl>

      <UserPermissions user={user} />
    </AppCard>
  )
}

/**
 * Read-only owner view for club users and manager permission flags.
 */
export function SettingsUsersPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedClubSlug, selectedMembership } = useAuth()
  const [users, setUsers] = useState<ClubUser[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null)
  const queryParams = useMemo(
    () => parseUsersQuery(location.search),
    [location.search],
  )
  const filters = useMemo(
    () => filterStateFromParams(queryParams),
    [queryParams],
  )
  const isOwner = selectedMembership?.role === 'OWNER'

  useEffect(() => {
    let isActive = true

    async function loadFilterOptions(): Promise<void> {
      if (!selectedClubSlug || !isOwner) {
        setCourts([])
        setFilterOptionsError(null)
        return
      }

      setFilterOptionsError(null)

      try {
        const courtsResponse = await listCourts(selectedClubSlug)

        if (isActive) {
          setCourts(courtsResponse.results.filter((court) => court.is_active))
        }
      } catch {
        if (isActive) {
          setCourts([])
          setFilterOptionsError('تعذر تحميل خيارات الفلاتر')
        }
      }
    }

    void loadFilterOptions()

    return () => {
      isActive = false
    }
  }, [isOwner, selectedClubSlug])

  useEffect(() => {
    let isActive = true

    async function loadUsers(): Promise<void> {
      if (!selectedClubSlug) {
        setUsers([])
        setError(null)
        setMessage('اختر ناديًا أولًا لعرض المستخدمين والصلاحيات')
        setIsLoading(false)
        return
      }

      if (!isOwner) {
        setUsers([])
        setError('ليس لديك صلاحية إدارة المستخدمين والصلاحيات')
        setMessage(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      setMessage(null)

      try {
        const usersResponse = await listClubUsers(selectedClubSlug, queryParams)

        if (isActive) {
          setUsers(normalizeClubUsersResponse(usersResponse))
        }
      } catch (error) {
        if (isActive) {
          setUsers([])
          setError(
            getApiErrorMessage(
              error,
              'تعذر تحميل المستخدمين والصلاحيات',
            ),
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadUsers()

    return () => {
      isActive = false
    }
  }, [isOwner, queryParams, selectedClubSlug])

  function applyFilters(nextFilters: UsersFilterState): void {
    navigate(
      {
        pathname: location.pathname,
        search: getUsersSearch(paramsFromFilters(nextFilters)),
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

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    applyFilters(filters)
  }

  function updateSearch(value: string): void {
    navigate(
      {
        pathname: location.pathname,
        search: getUsersSearch(
          paramsFromFilters({
            ...filters,
            search: value,
          }),
        ),
      },
      { replace: true },
    )
  }

  return (
    <div className="space-y-5">
      {selectedClubSlug && isOwner ? (
        <>
          <form className="flex gap-2" onSubmit={handleSearchSubmit}>
            <input
              aria-label="بحث المستخدمين"
              className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="بحث بالاسم أو الهاتف أو اسم المستخدم"
              value={filters.search}
            />
            <AppButton onClick={() => setIsFilterSheetOpen(true)} type="button">
              فلترة
            </AppButton>
          </form>

          {filterOptionsError ? (
            <p className="text-xs font-bold text-[var(--sloty-danger)]">
              {filterOptionsError}
            </p>
          ) : null}

          <AppCard className="hidden md:block">
            <UsersFilterForm
              courts={courts}
              filters={filters}
              isLoading={isLoading}
              key={`desktop-${getUsersSearch(queryParams) || 'empty'}`}
              onApply={applyFilters}
              onReset={resetFilters}
            />
          </AppCard>

          <FilterSheet
            isOpen={isFilterSheetOpen}
            onClose={() => setIsFilterSheetOpen(false)}
            title="فلترة المستخدمين"
          >
            <UsersFilterForm
              courts={courts}
              filters={filters}
              isLoading={isLoading}
              key={`mobile-${getUsersSearch(queryParams) || 'empty'}`}
              onApply={applyFilters}
              onClose={() => setIsFilterSheetOpen(false)}
              onReset={resetFilters}
            />
          </FilterSheet>
        </>
      ) : null}

      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل المستخدمين والصلاحيات...
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

      {!isLoading && !error && !message && users.length === 0 ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            لا يوجد مستخدمون مطابقون للفلاتر الحالية
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && users.length > 0 ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <UserCard courts={courts} key={user.membership_id} user={user} />
          ))}
        </section>
      ) : null}
    </div>
  )
}
