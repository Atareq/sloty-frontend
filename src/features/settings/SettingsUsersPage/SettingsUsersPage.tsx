import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Value } from 'react-phone-number-input'
import { useLocation, useNavigate } from 'react-router'
import {
  getApiErrorMessage,
  getApiFieldErrors,
  getFirstFieldErrorMessage,
  isApiClientError,
} from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import type { PaginatedResponse } from '../../../shared/api/api.types'
import { extractResults } from '../../../shared/api/pagination.helpers'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { AppSelect } from '../../../shared/components/AppSelect/AppSelect'
import { AppSheet } from '../../../shared/components/AppSheet/AppSheet'
import { UnsavedChangesPrompt } from '../../../shared/components/AppSheet/UnsavedChangesPrompt'
import { FilterSheet } from '../../../shared/components/FilterSheet/FilterSheet'
import { AppSuccessNotice } from '../../../shared/components/AppSuccessNotice/AppSuccessNotice'
import { LiveSearchField } from '../../../shared/components/LiveSearchField/LiveSearchField'
import { PasswordField } from '../../../shared/components/PasswordField/PasswordField'
import { ResultRefreshRegion } from '../../../shared/components/ResultRefreshRegion/ResultRefreshRegion'
import { settingsCopy } from '../../../shared/copy/appCopy'
import { getPhoneValidationMessage } from '../../../shared/copy/phoneValidation'
import { useRequestGeneration } from '../../../shared/hooks/useRequestGeneration'
import { SlotyPhoneNumberInput } from '../../../shared/components/PhoneNumberInput/PhoneNumberInput'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../../shared/utils/buildPathWithQuery'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { validatePhoneNumber } from '../../../shared/validation/phone'
import {
  createClubStaff,
  listClubUsers,
  updateClubUser,
} from '../../clubUsers/clubUsersApi'
import { getClubUserDisplayName } from '../../clubUsers/clubUsers.display'
import type {
  ClubUser,
  ClubUsersQueryParams,
} from '../../clubUsers/clubUsers.types'

interface UsersFilterState {
  is_active: string
  search: string
}

const userStatusFilterOptions = [
  { value: '', label: 'الكل' },
  { value: 'true', label: 'نشط' },
  { value: 'false', label: 'متوقف مؤقتًا' },
]

interface AddStaffFormState {
  first_name: string
  last_name: string
  phone_number: Value | undefined
  email: string
  password: string
  confirm_password: string
}

type AddStaffFieldName = keyof AddStaffFormState
type AddStaffFieldErrors = Partial<Record<AddStaffFieldName, string>>

const emptyAddStaffForm: AddStaffFormState = {
  first_name: '',
  last_name: '',
  phone_number: undefined,
  email: '',
  password: '',
  confirm_password: '',
}

function parseUsersQuery(search: string): ClubUsersQueryParams {
  const queryObject = toQueryObject(search)
  const params: ClubUsersQueryParams = {}

  if (queryObject.is_active) {
    params.is_active = queryObject.is_active
  }

  if (queryObject.search) {
    params.search = queryObject.search
  }

  return params
}

function filterStateFromParams(params: ClubUsersQueryParams): UsersFilterState {
  return {
    is_active: params.is_active === undefined ? '' : String(params.is_active),
    search: params.search ?? '',
  }
}

function paramsFromFilters(filters: UsersFilterState): ClubUsersQueryParams {
  return {
    role: 'STAFF',
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
      {isActive ? 'نشط' : 'متوقف مؤقتًا'}
    </span>
  )
}

function validateAddStaffForm(values: AddStaffFormState): AddStaffFieldErrors {
  const errors: AddStaffFieldErrors = {}

  if (!values.first_name.trim()) {
    errors.first_name = 'الاسم الأول مطلوب'
  }

  if (!values.password) {
    errors.password = 'كلمة المرور مطلوبة'
  }

  if (values.password !== values.confirm_password) {
    errors.confirm_password = settingsCopy.passwordMismatch
  }

  const phoneValidation = validatePhoneNumber(values.phone_number)

  if (!phoneValidation.valid) {
    errors.phone_number = getPhoneValidationMessage(phoneValidation.error)
  }

  return errors
}

interface AddStaffSheetProps {
  fieldErrors: AddStaffFieldErrors
  generalError: string | null
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (values: AddStaffFormState) => Promise<void>
}

function AddStaffSheet({
  fieldErrors,
  generalError,
  isSubmitting,
  onClose,
  onSubmit,
}: AddStaffSheetProps) {
  const [values, setValues] = useState<AddStaffFormState>(emptyAddStaffForm)
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const isDirty = values !== emptyAddStaffForm

  function requestClose(): boolean | void {
    if (isDirty) {
      setIsDiscardPromptOpen(true)
      return false
    }

    onClose()
  }

  function updateValue<Field extends keyof AddStaffFormState>(
    field: Field,
    value: AddStaffFormState[Field],
  ): void {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void onSubmit(values)
  }

  return (
    <>
      <AppSheet
        title="إضافة موظف جديد"
        isOpen
        onRequestClose={requestClose}
      >
        <form className="space-y-4 p-4 text-right" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--sloty-text-muted)]">
              أدخل بيانات الموظف لإنشاء حسابه في النادي
            </p>
          </div>

          {generalError ? (
            <p className="rounded-xl bg-[var(--sloty-danger-soft)] p-3 text-xs font-bold text-[var(--sloty-danger)]">
              {generalError}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>الاسم الأول</span>
              <input
                className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                disabled={isSubmitting}
                onChange={(event) => updateValue('first_name', event.target.value)}
                placeholder="الاسم الأول"
                value={values.first_name}
              />
              {fieldErrors.first_name ? (
                <span className="text-xs font-bold text-[var(--sloty-danger)]">
                  {fieldErrors.first_name}
                </span>
              ) : null}
            </label>

            <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>اسم العائلة</span>
              <input
                className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                disabled={isSubmitting}
                onChange={(event) => updateValue('last_name', event.target.value)}
                placeholder="اسم العائلة"
                value={values.last_name}
              />
            </label>
          </div>

          <div className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>رقم الهاتف</span>
            <SlotyPhoneNumberInput
              disabled={isSubmitting}
              error={Boolean(fieldErrors.phone_number)}
              onChange={(value) => updateValue('phone_number', value)}
              value={values.phone_number}
            />
            {fieldErrors.phone_number ? (
              <span className="text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.phone_number}
              </span>
            ) : null}
          </div>

          <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>البريد الإلكتروني</span>
            <input
              className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              onChange={(event) => updateValue('email', event.target.value)}
              placeholder="name@example.com (اختياري)"
              type="email"
              value={values.email}
            />
          </label>

          <PasswordField
            autoComplete="new-password"
            disabled={isSubmitting}
            error={fieldErrors.password}
            label="كلمة المرور"
            onChange={(value) => updateValue('password', value)}
            value={values.password}
          />

          <PasswordField
            autoComplete="new-password"
            disabled={isSubmitting}
            error={fieldErrors.confirm_password}
            label="تأكيد كلمة المرور"
            onChange={(value) => updateValue('confirm_password', value)}
            value={values.confirm_password}
          />

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <AppButton
              disabled={isSubmitting}
              onClick={requestClose}
              type="button"
              variant="secondary"
            >
              إلغاء
            </AppButton>
            <AppButton disabled={isSubmitting} type="submit">
              {isSubmitting ? 'جاري الحفظ...' : 'إضافة الموظف'}
            </AppButton>
          </div>
        </form>
      </AppSheet>
      <UnsavedChangesPrompt
        isOpen={isDiscardPromptOpen}
        onContinueEditing={() => setIsDiscardPromptOpen(false)}
        onDiscard={() => {
          setIsDiscardPromptOpen(false)
          onClose()
        }}
      />
    </>
  )
}

function UserCard({
  canToggleStatus,
  isUpdating,
  onToggleStatus,
  user,
}: {
  canToggleStatus: boolean
  isUpdating: boolean
  onToggleStatus: (user: ClubUser, nextActive: boolean) => void
  user: ClubUser
}) {
  return (
    <AppCard className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
            {getClubUserDisplayName(user)}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]">
            موظف
          </span>
          <ActiveBadge isActive={user.is_active} />
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
        {user.email ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
            <dt className="font-bold text-[var(--sloty-text-muted)]">البريد</dt>
            <dd className="font-black text-[var(--sloty-text-primary)]">
              {user.email}
            </dd>
          </div>
        ) : null}
      </dl>

      {canToggleStatus ? (
        <AppButton
          disabled={isUpdating}
          fullWidth
          onClick={() => onToggleStatus(user, user.is_active === false)}
          type="button"
          variant={user.is_active === false ? 'primary' : 'secondary'}
        >
          {isUpdating
            ? 'جاري التحديث...'
            : user.is_active === false
              ? 'تفعيل الموظف'
              : 'إيقاف الموظف'}
        </AppButton>
      ) : null}
    </AppCard>
  )
}

/**
 * Club staff management view for club owners.
 */
export function SettingsUsersPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { refreshCurrentUser, role, selectedClubSlug } = useAuth()
  const [users, setUsers] = useState<ClubUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const hasCompletedInitialLoadRef = useRef(false)
  const { nextGeneration, isCurrent } = useRequestGeneration()
  const [usersReloadKey, setUsersReloadKey] = useState(0)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [isAddUserSheetOpen, setIsAddUserSheetOpen] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [addUserError, setAddUserError] = useState<string | null>(null)
  const [addStaffFieldErrors, setAddStaffFieldErrors] =
    useState<AddStaffFieldErrors>({})
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const queryParams = useMemo(
    () => parseUsersQuery(location.search),
    [location.search],
  )
  const filters = useMemo(
    () => filterStateFromParams(queryParams),
    [queryParams],
  )
  const isOwner = role === 'OWNER' || role === 'ADMIN'
  const isSuccessNotice = Boolean(
    message && (message.startsWith('✓ ') || message.includes('بنجاح')),
  )

  useEffect(() => {
    let isActive = true
    const generation = nextGeneration()

    async function loadUsers(): Promise<void> {
      if (!selectedClubSlug) {
        setUsers([])
        setError(null)
        setMessage('اختر ناديًا أولًا لعرض الموظفين')
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      if (!isOwner) {
        setUsers([])
        setError('ليس لديك صلاحية إدارة موظفي النادي')
        setMessage(null)
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      if (hasCompletedInitialLoadRef.current) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)
      setMessage((current) => current?.startsWith('✓ ') ? current : null)

      try {
        const usersResponse = await listClubUsers(
          selectedClubSlug,
          paramsFromFilters(filters),
        )

        if (isActive && isCurrent(generation)) {
          setUsers(normalizeClubUsersResponse(usersResponse))
          setUsers(extractResults(usersResponse))
          hasCompletedInitialLoadRef.current = true
        }
      } catch (caughtError) {
        if (isActive && isCurrent(generation)) {
          setUsers([])
          setError(
            getApiErrorMessage(
              caughtError,
              'تعذر تحميل موظفي النادي',
            ),
          )
        }
      } finally {
        if (isActive && isCurrent(generation)) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    }

    void loadUsers()

    return () => {
      isActive = false
    }
  }, [filters, isCurrent, isOwner, nextGeneration, selectedClubSlug, usersReloadKey])

  function applyFilters(nextFilters: UsersFilterState): void {
    navigate(
      {
        pathname: location.pathname,
        search: getUsersSearch(paramsFromFilters(nextFilters)),
      },
      { replace: true },
    )
    setIsFilterSheetOpen(false)
  }

  function handleResetFilters(): void {
    applyFilters({ is_active: '', search: '' })
  }

  const updateSearch = useCallback((value: string): void => {
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
  }, [filters, location.pathname, navigate])

  async function handleToggleUserStatus(
    user: ClubUser,
    isActive: boolean,
  ): Promise<void> {
    setUpdatingUserId(user.id)
    setError(null)

    try {
      await updateClubUser(user.id, { is_active: isActive })
      setUsersReloadKey((current) => current + 1)
      setMessage(isActive ? '✓ تم تفعيل الموظف' : '✓ تم إيقاف الموظف')
    } catch (caughtError) {
      setError(
        getApiErrorMessage(
          caughtError,
          'تعذر تحديث حالة الموظف. حاول مرة أخرى',
        ),
      )

      if (isApiClientError(caughtError) && caughtError.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setUpdatingUserId(null)
    }
  }

  async function handleCreateStaff(values: AddStaffFormState): Promise<void> {
    const localErrors = validateAddStaffForm(values)

    if (Object.keys(localErrors).length > 0) {
      setAddStaffFieldErrors(localErrors)
      setAddUserError(null)
      return
    }

    if (!selectedClubSlug) {
      return
    }

    setIsCreatingUser(true)
    setAddUserError(null)
    setAddStaffFieldErrors({})

    try {
      await createClubStaff(selectedClubSlug, {
        first_name: values.first_name,
        last_name: values.last_name || undefined,
        phone_number: values.phone_number || undefined,
        email: values.email || undefined,
        password: values.password,
        is_active: true,
      })
      setIsAddUserSheetOpen(false)
      setUsersReloadKey((current) => current + 1)
      setMessage('✓ تم إضافة الموظف بنجاح')
    } catch (caughtError) {
      const fieldErrors = getApiFieldErrors(caughtError)

      setAddStaffFieldErrors({
        email: getFirstFieldErrorMessage(fieldErrors, 'email') ?? undefined,
        password: getFirstFieldErrorMessage(fieldErrors, 'password') ?? undefined,
        phone_number:
          getFirstFieldErrorMessage(fieldErrors, 'phone_number') ?? undefined,
      })
      setAddUserError(
        getApiErrorMessage(caughtError, 'تعذر إضافة الموظف. حاول مرة أخرى'),
      )

      if (isApiClientError(caughtError) && caughtError.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setIsCreatingUser(false)
    }
  }

  return (
    <div className="space-y-5">
      {selectedClubSlug && isOwner ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <LiveSearchField
              aria-label="بحث الموظفين"
              label="بحث الموظفين"
              onSearch={updateSearch}
              placeholder="بحث بالاسم أو الهاتف أو اسم المستخدم"
              value={filters.search}
            />
            <div className="flex gap-2">
              <AppButton onClick={() => setIsFilterSheetOpen(true)} type="button">
                فلترة
              </AppButton>
              <AppButton
                onClick={() => {
                  setAddUserError(null)
                  setAddStaffFieldErrors({})
                  setIsAddUserSheetOpen(true)
                }}
                type="button"
              >
                إضافة موظف
              </AppButton>
            </div>
          </div>

          <FilterSheet
            isOpen={isFilterSheetOpen}
            onClose={() => setIsFilterSheetOpen(false)}
            title="فلترة الموظفين"
          >
            <div className="space-y-4 p-4">
              <AppSelect
                label="الحالة"
                onChange={(val) => applyFilters({ ...filters, is_active: val })}
                options={userStatusFilterOptions}
                value={filters.is_active}
              />
              <div className="flex gap-2">
                <AppButton onClick={handleResetFilters} variant="secondary">
                  إعادة ضبط
                </AppButton>
              </div>
            </div>
          </FilterSheet>
        </>
      ) : null}

      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل موظفي النادي...
          </p>
        </AppCard>
      ) : null}

      {isSuccessNotice && message ? (
        <AppSuccessNotice
          message={message}
          onDismiss={() => setMessage(null)}
        />
      ) : null}

      {!isLoading && (error || (message && !isSuccessNotice)) ? (
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
            لا يوجد موظفون مطابقون للفلاتر الحالية
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && users.length > 0 ? (
        <ResultRefreshRegion isRefreshing={isRefreshing}>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {users.map((user) => (
              <UserCard
                canToggleStatus={isOwner}
                isUpdating={updatingUserId === user.id}
                key={user.id}
                onToggleStatus={handleToggleUserStatus}
                user={user}
              />
            ))}
          </section>
        </ResultRefreshRegion>
      ) : null}

      {isAddUserSheetOpen ? (
        <AddStaffSheet
          fieldErrors={addStaffFieldErrors}
          generalError={addUserError}
          isSubmitting={isCreatingUser}
          onClose={() => {
            if (!isCreatingUser) {
              setIsAddUserSheetOpen(false)
            }
          }}
          onSubmit={handleCreateStaff}
        />
      ) : null}
    </div>
  )
}
