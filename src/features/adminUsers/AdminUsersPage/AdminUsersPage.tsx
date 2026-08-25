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
import { toQueryObject } from '../../../shared/utils/queryParams'
import { listClubs } from '../../clubs/clubsApi'
import type { Club } from '../../clubs/clubs.types'
import { listPlatformUsers } from '../adminUsersApi'
import {
  getPlatformUserAccountTypeLabel,
  getPlatformUserDisplayName,
  getPlatformUserStatusLabel,
  normalizePlatformUsersResponse,
} from '../adminUsers.display'
import type {
  PlatformUser,
  PlatformUserMembershipSummary,
} from '../adminUsers.types'

interface AdminUsersFilters {
  search: string
  account_type: string
  club: string
  role: string
  is_active: string
}

const emptyFilters: AdminUsersFilters = {
  search: '',
  account_type: '',
  club: '',
  role: '',
  is_active: '',
}

const roleLabels: Record<string, string> = {
  OWNER: 'مالك',
  MANAGER: 'مدير',
  STAFF: 'موظف',
}

const accountTypeFilterOptions = [
  { value: '', label: 'كل الحسابات' },
  { value: 'PLATFORM_ADMIN', label: 'مسؤول منصة' },
  { value: 'CLUB_USER', label: 'مستخدم نادي' },
]

const roleFilterOptions = [
  { value: '', label: 'كل الأدوار' },
  { value: 'OWNER', label: 'مالك' },
  { value: 'MANAGER', label: 'مدير' },
  { value: 'STAFF', label: 'موظف' },
]

const accountStatusFilterOptions = [
  { value: '', label: 'كل الحالات' },
  { value: 'true', label: 'نشط' },
  { value: 'false', label: 'غير نشط' },
]

function getMemberships(
  user: PlatformUser,
): PlatformUserMembershipSummary[] {
  return Array.isArray(user.memberships) ? user.memberships : []
}

function getFilters(search: string): AdminUsersFilters {
  return {
    ...emptyFilters,
    ...toQueryObject(search),
  }
}

function getMembershipCountLabel(count: number): string {
  if (count === 1) {
    return 'عضوية واحدة'
  }

  if (count === 2) {
    return 'عضويتان'
  }

  return `${count} عضويات`
}

function getMembershipSummaryText(
  memberships: PlatformUserMembershipSummary[],
): string {
  if (memberships.length === 0) {
    return 'لا توجد عضويات'
  }

  if (memberships.length > 1) {
    return getMembershipCountLabel(memberships.length)
  }

  const membership = memberships[0]

  return [
    membership.club_name ?? 'نادي غير متاح',
    membership.role ? roleLabels[membership.role] : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function getSingleMembershipValue(
  memberships: PlatformUserMembershipSummary[],
  field: keyof Pick<
    PlatformUserMembershipSummary,
    'club_name' | 'role' | 'court_name'
  >,
): string {
  if (memberships.length === 0) {
    return 'لا توجد عضويات'
  }

  if (memberships.length > 1) {
    return getMembershipCountLabel(memberships.length)
  }

  const value = memberships[0][field]

  if (field === 'role' && typeof value === 'string') {
    return roleLabels[value] ?? value
  }

  return typeof value === 'string' && value ? value : 'غير متاح حاليًا'
}

function MembershipSummary({
  memberships,
}: {
  memberships: PlatformUserMembershipSummary[]
}) {
  if (memberships.length === 0) {
    return (
      <span className="text-sm font-bold text-[var(--sloty-text-muted)]">
        لا توجد عضويات
      </span>
    )
  }

  return (
    <div className="space-y-1">
      {memberships.map((membership, index) => (
        <p
          className="text-sm font-bold text-[var(--sloty-text-primary)]"
          key={`${membership.membership_id ?? index}-${membership.club_slug ?? ''}`}
        >
          {membership.club_name ?? 'نادي غير متاح'} ·{' '}
          {membership.role ? roleLabels[membership.role] : 'دور غير متاح'}
        </p>
      ))}
    </div>
  )
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
    <form className="grid gap-3 md:grid-cols-5" onSubmit={handleSubmit}>
      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)] md:col-span-2">
        <span>البحث</span>
        <input
          className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateValue('search', event.target.value)}
          placeholder="اسم المستخدم أو الهاتف"
          value={values.search}
        />
      </label>

      <AppSelect
        label="نوع الحساب"
        onChange={(value) => updateValue('account_type', value)}
        options={accountTypeFilterOptions}
        value={values.account_type}
      />

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

      <div className="flex items-end">
        <AppButton fullWidth type="submit">
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
            search: filters.search,
            account_type: filters.account_type,
            club: filters.club,
            role: filters.role,
            is_active: filters.is_active,
          }),
          listClubs().catch(() => null),
        ])

        if (!isActive) {
          return
        }

        setUsers(normalizePlatformUsersResponse(usersResponse))
        if (clubsResponse) {
          setClubs(clubsResponse.results)
          setClubsWarning(null)
        } else {
          setClubs([])
          setClubsWarning('تعذر تحميل أسماء الأندية للفلاتر.')
        }
      } catch (error) {
        if (isActive) {
          setError(getApiErrorMessage(error, 'تعذر تحميل المستخدمين'))
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
        search: nextFilters.search,
        account_type: nextFilters.account_type,
        club: nextFilters.club,
        role: nextFilters.role,
        is_active: nextFilters.is_active,
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
            <table className="w-full min-w-[920px] text-right text-sm">
              <thead>
                <tr className="border-b border-[var(--sloty-border)] text-xs font-black text-[var(--sloty-text-muted)]">
                  <th className="py-3">المستخدم</th>
                  <th className="py-3">نوع الحساب</th>
                  <th className="py-3">النادي</th>
                  <th className="py-3">الدور</th>
                  <th className="py-3">الملعب</th>
                  <th className="py-3">الحالة</th>
                  <th className="py-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const memberships = getMemberships(user)

                  return (
                    <tr
                      className="border-b border-[var(--sloty-border)] last:border-0"
                      key={user.id}
                    >
                      <td className="py-3">
                        <p className="font-black text-[var(--sloty-text-primary)]">
                          {getPlatformUserDisplayName(user)}
                        </p>
                        <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                          @{user.username}
                        </p>
                      </td>
                      <td className="py-3">
                        {getPlatformUserAccountTypeLabel(user)}
                      </td>
                      <td className="py-3">
                        {getSingleMembershipValue(memberships, 'club_name')}
                      </td>
                      <td className="py-3">
                        {getSingleMembershipValue(memberships, 'role')}
                      </td>
                      <td className="py-3">
                        {getSingleMembershipValue(memberships, 'court_name')}
                      </td>
                      <td className="py-3">
                        {getPlatformUserStatusLabel(user.is_active)}
                      </td>
                      <td className="py-3">
                        <Link to={appRoutes.adminUserDetail(user.id)}>
                          <AppButton variant="secondary">التفاصيل</AppButton>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
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
                    <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
                      @{user.username}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]">
                    {getPlatformUserStatusLabel(user.is_active)}
                  </span>
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-black text-[var(--sloty-text-muted)]">
                      نوع الحساب
                    </dt>
                    <dd className="mt-1 font-bold text-[var(--sloty-text-primary)]">
                      {getPlatformUserAccountTypeLabel(user)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-black text-[var(--sloty-text-muted)]">
                      العضويات
                    </dt>
                    <dd className="mt-1">
                      <span className="block text-sm font-black text-[var(--sloty-text-primary)]">
                        {getMembershipSummaryText(getMemberships(user))}
                      </span>
                      <MembershipSummary memberships={getMemberships(user)} />
                    </dd>
                  </div>
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
