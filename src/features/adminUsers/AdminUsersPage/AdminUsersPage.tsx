import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { useAppViewMode } from '../../../layout/AppShell/AppShell.viewMode'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { AppSelect } from '../../../shared/components/AppSelect/AppSelect'
import { FilterSheet } from '../../../shared/components/FilterSheet/FilterSheet'
import { PageActions } from '../../../shared/components/PageActions/PageActions'
import { appRoutes } from '../../../shared/navigation/appRoutes'
import { buildPathWithQuery } from '../../../shared/utils/buildPathWithQuery'
import { extractResults } from '../../../shared/api/pagination.helpers'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { listClubs } from '../../clubs/clubsApi'
import type { Club } from '../../clubs/clubs.types'
import {
  getPlatformUserDisplayName,
  getPlatformUserRoleLabel,
  getPlatformUserStatusLabel,
  normalizePlatformUsersResponse,
} from '../adminUsers.display'
import type { PlatformUser } from '../adminUsers.types'
import { listPlatformUsers } from '../adminUsersApi'

interface AdminUsersFilters {
  search: string
  club: string
  role: string
  is_active: string
}

const emptyFilters: AdminUsersFilters = {
  search: '',
  club: '',
  role: '',
  is_active: '',
}

const roleFilterOptions = [
  { value: '', label: 'كل الأدوار' },
  { value: 'ADMIN', label: 'مسؤول منصة' },
  { value: 'OWNER', label: 'مالك' },
  { value: 'STAFF', label: 'موظف' },
]

const accountStatusFilterOptions = [
  { value: '', label: 'كل الحالات' },
  { value: 'true', label: 'نشط' },
  { value: 'false', label: 'غير نشط' },
]

function getFilters(search: string): AdminUsersFilters {
  const query = toQueryObject(search)
  return {
    ...emptyFilters,
    search: query.search ?? '',
    club: query.club ?? '',
    role: query.role ?? '',
    is_active: query.is_active ?? '',
  }
}

function AdminUsersFilterForm({
  clubs,
  filters,
  onSubmit,
}: {
  clubs: Club[]
  filters: AdminUsersFilters
  onSubmit: (filters: AdminUsersFilters) => void
}) {
  const [values, setValues] = useState(filters)

  function updateValue(field: keyof AdminUsersFilters, value: string): void {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form className="grid gap-3 md:grid-cols-4" onSubmit={handleSubmit}>
      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>البحث</span>
        <input
          className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateValue('search', event.target.value)}
          placeholder="الاسم، اسم المستخدم، البريد، أو الهاتف"
          value={values.search}
        />
      </label>

      <AppSelect
        label="النادي"
        onChange={(value) => updateValue('club', value)}
        options={[
          { value: '', label: 'كل الأندية' },
          ...clubs.map((club) => ({
            value: String(club.id),
            label: club.name,
          })),
        ]}
        value={values.club}
      />

      <AppSelect
        label="الدور"
        onChange={(value) => updateValue('role', value)}
        options={roleFilterOptions}
        value={values.role}
      />

      <AppSelect
        label="حالة الحساب"
        onChange={(value) => updateValue('is_active', value)}
        options={accountStatusFilterOptions}
        value={values.is_active}
      />

      <div className="flex items-end md:col-span-4 md:justify-end">
        <AppButton type="submit">
          تطبيق الفلاتر
        </AppButton>
      </div>
    </form>
  )
}

export function AdminUsersPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const viewMode = useAppViewMode()
  const filters = useMemo(() => getFilters(location.search), [location.search])
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [error, setError] = useState<string | null>(null)
  const [clubsWarning, setClubsWarning] = useState<string | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    async function loadUsers(): Promise<void> {
      setIsLoading(true)
      setError(null)

      try {
        const [usersResponse, clubsResponse] = await Promise.all([
          listPlatformUsers({
            search: filters.search || undefined,
            club: filters.club || undefined,
            role: filters.role || undefined,
            is_active: filters.is_active || undefined,
          }),
          listClubs().catch(() => null),
        ])

        if (!isActive) {
          return
        }

        setUsers(normalizePlatformUsersResponse(usersResponse))
        if (clubsResponse) {
          setClubs(clubsResponse.results)
          setClubs(extractResults(clubsResponse))
          setClubsWarning(null)
        } else {
          setClubs([])
          setClubsWarning('تعذر تحميل أسماء الأندية للفلاتر.')
        }
      } catch (err) {
        if (isActive) {
          setError(getApiErrorMessage(err, 'تعذر تحميل المستخدمين'))
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
  }, [filters])

  function handleFilterSubmit(nextFilters: AdminUsersFilters): void {
    navigate(
      buildPathWithQuery(appRoutes.adminUsers, {
        search: nextFilters.search || undefined,
        club: nextFilters.club || undefined,
        role: nextFilters.role || undefined,
        is_active: nextFilters.is_active || undefined,
      }),
    )
    setIsFilterOpen(false)
  }

  const hasActiveFilters = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-5">
      <PageActions>
        <Link to={appRoutes.adminUserNew}>
          <AppButton>إضافة مستخدم</AppButton>
        </Link>
      </PageActions>

      {viewMode === 'desktop' ? (
        <AppCard>
          <AdminUsersFilterForm
            key={location.search || 'desktop-empty'}
            clubs={clubs}
            filters={filters}
            onSubmit={handleFilterSubmit}
          />
        </AppCard>
      ) : null}

      {viewMode === 'mobile' ? (
        <>
          <AppButton
            fullWidth
            onClick={() => setIsFilterOpen(true)}
            type="button"
            variant="secondary"
          >
            فلترة
          </AppButton>
          <FilterSheet
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            title="فلترة المستخدمين"
          >
            <AdminUsersFilterForm
              key={location.search || 'mobile-empty'}
              clubs={clubs}
              filters={filters}
              onSubmit={handleFilterSubmit}
            />
          </FilterSheet>
        </>
      ) : null}

      {clubsWarning ? (
        <AppCard>
          <p className="text-sm font-semibold text-[var(--sloty-danger)]">
            {clubsWarning}
          </p>
        </AppCard>
      ) : null}

      {isLoading ? (
        <AppCard>
          <p className="text-sm text-[var(--sloty-text-muted)]">
            جاري تحميل المستخدمين...
          </p>
        </AppCard>
      ) : null}

      {error ? (
        <AppCard>
          <p className="text-sm font-semibold text-[var(--sloty-danger)]">
            {error}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && users.length === 0 ? (
        <AppCard>
          <p className="text-sm text-[var(--sloty-text-muted)]">
            {hasActiveFilters
              ? 'لا يوجد مستخدمون مطابقون للفلاتر الحالية.'
              : 'لا يوجد مستخدمون حتى الآن.'}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && users.length > 0 ? (
        viewMode === 'desktop' ? (
          <AppCard className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-right text-sm">
              <thead>
                <tr className="border-b border-[var(--sloty-border)] text-xs font-black text-[var(--sloty-text-muted)]">
                  <th className="py-3">المستخدم</th>
                  <th className="py-3">الدور</th>
                  <th className="py-3">البريد الإلكتروني</th>
                  <th className="py-3">رقم الهاتف</th>
                  <th className="py-3">الحالة</th>
                  <th className="py-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    className="border-b border-[var(--sloty-border)] last:border-0"
                    key={user.id}
                  >
                    <td className="py-3">
                      <p className="font-black text-[var(--sloty-text-primary)]">
                        {getPlatformUserDisplayName(user)}
                      </p>
                      {user.username ? (
                        <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                          @{user.username}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 font-semibold">
                      {getPlatformUserRoleLabel(user.profile_role)}
                    </td>
                    <td className="py-3 text-[var(--sloty-text-muted)]">
                      {user.email || '—'}
                    </td>
                    <td className="py-3 text-[var(--sloty-text-muted)]" dir="ltr">
                      {user.phone_number || '—'}
                    </td>
                    <td className="py-3">
                      <span className="rounded-full bg-[var(--sloty-soft-mint)] px-2.5 py-0.5 text-xs font-black text-[var(--sloty-primary-dark)]">
                        {getPlatformUserStatusLabel(user.is_active)}
                      </span>
                    </td>
                    <td className="py-3">
                      <Link to={appRoutes.adminUserDetail(user.id)}>
                        <AppButton variant="secondary">التفاصيل</AppButton>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AppCard>
        ) : (
          <div className="grid gap-3">
            {users.map((user) => (
              <AppCard className="space-y-4" key={user.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
                      {getPlatformUserDisplayName(user)}
                    </h2>
                    {user.username ? (
                      <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
                        @{user.username}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]">
                    {getPlatformUserStatusLabel(user.is_active)}
                  </span>
                </div>

                <dl className="grid gap-2 text-sm">
                  <div>
                    <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      الدور
                    </dt>
                    <dd className="font-bold text-[var(--sloty-text-primary)]">
                      {getPlatformUserRoleLabel(user.profile_role)}
                    </dd>
                  </div>
                  {user.email ? (
                    <div>
                      <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                        البريد الإلكتروني
                      </dt>
                      <dd className="font-bold text-[var(--sloty-text-primary)]">
                        {user.email}
                      </dd>
                    </div>
                  ) : null}
                  {user.phone_number ? (
                    <div>
                      <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                        رقم الهاتف
                      </dt>
                      <dd className="font-bold text-[var(--sloty-text-primary)]" dir="ltr">
                        {user.phone_number}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <Link to={appRoutes.adminUserDetail(user.id)}>
                  <AppButton fullWidth variant="secondary">
                    التفاصيل
                  </AppButton>
                </Link>
              </AppCard>
            ))}
          </div>
        )
      ) : null}
    </div>
  )
}
