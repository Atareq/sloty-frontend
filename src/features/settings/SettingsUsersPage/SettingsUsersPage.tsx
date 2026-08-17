import { useEffect, useMemo, useState, type FormEvent } from 'react'
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
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { FilterSheet } from '../../../shared/components/FilterSheet/FilterSheet'
import { SlotyPhoneNumberInput } from '../../../shared/components/PhoneNumberInput/PhoneNumberInput'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../../shared/utils/buildPathWithQuery'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { isValidSlotyPhoneNumber } from '../../../shared/validation/phone'
import {
  createClubMembership,
  listClubUsers,
  updateMembershipActivity,
  updateManagerPermissions,
} from '../../clubUsers/clubUsersApi'
import {
  getClubUserDisplayName,
  getManagerIdentity,
  getUserCourtName,
} from '../../clubUsers/clubUsers.display'
import { EditManagerPermissionsDialog } from '../../clubUsers/components/EditManagerPermissionsDialog/EditManagerPermissionsDialog'
import { ManagerPermissionFields } from '../../clubUsers/components/ManagerPermissionFields/ManagerPermissionFields'
import { UserPermissions } from '../../clubUsers/components/UserPermissions/UserPermissions'
import type {
  ClubUser,
  ClubUserRole,
  ClubUsersQueryParams,
  CreateMembershipPayload,
  CreateMembershipRole,
  UpdateManagerPermissionsPayload,
} from '../../clubUsers/clubUsers.types'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import { listPlatformUsers } from '../../adminUsers/adminUsersApi'
import {
  getPlatformUserDisplayName,
  normalizePlatformUsersResponse,
} from '../../adminUsers/adminUsers.display'
import type { PlatformUser } from '../../adminUsers/adminUsers.types'

interface UsersFilterState {
  role: ClubUserRole | ''
  court: string
  is_active: string
  search: string
}

type AddUserMode = 'new' | 'existing'

interface AddUserFormState {
  mode: AddUserMode
  role: CreateMembershipRole | ''
  first_name: string
  last_name: string
  phone_number: Value | undefined
  email: string
  username: string
  password: string
  existingUserId: string
  court: string
  manager_can_settle_transactions: boolean
  manager_can_change_pricing: boolean
}

type AddUserFieldName =
  | 'mode'
  | 'role'
  | 'first_name'
  | 'last_name'
  | 'phone_number'
  | 'email'
  | 'username'
  | 'password'
  | 'user_id'
  | 'court'
  | 'manager_can_settle_transactions'
  | 'manager_can_change_pricing'

type AddUserFieldErrors = Partial<Record<AddUserFieldName, string>>

const usersFilterKeys = ['role', 'court', 'is_active', 'search'] as const

const roleLabels: Record<ClubUserRole, string> = {
  OWNER: 'مالك',
  MANAGER: 'مدير',
  STAFF: 'موظف',
}

const emptyAddUserForm: AddUserFormState = {
  mode: 'new',
  role: '',
  first_name: '',
  last_name: '',
  phone_number: undefined,
  email: '',
  username: '',
  password: '',
  existingUserId: '',
  court: '',
  manager_can_settle_transactions: false,
  manager_can_change_pricing: false,
}

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

function getInitialManagerPermissionValues(
  user: ClubUser,
): Required<UpdateManagerPermissionsPayload> {
  return {
    manager_can_settle_transactions:
      user.manager_can_settle_transactions ?? Boolean(user.can_manage_settlements),
    manager_can_change_pricing:
      user.manager_can_change_pricing ??
      Boolean(user.can_change_pricing || user.can_manage_working_hours),
  }
}

function getTrimmedOptional(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : undefined
}

function validateAddUserForm(values: AddUserFormState): AddUserFieldErrors {
  const errors: AddUserFieldErrors = {}

  if (!values.mode) {
    errors.mode = 'اختر نوع المستخدم'
  }

  if (!values.role) {
    errors.role = 'اختر الدور'
  }

  if (values.mode === 'new') {
    if (!values.first_name.trim()) {
      errors.first_name = 'الاسم الأول مطلوب'
    }

    if (!values.username.trim()) {
      errors.username = 'اسم المستخدم مطلوب'
    }

    if (!values.password) {
      errors.password = 'كلمة المرور مطلوبة'
    }

    if (values.phone_number && !isValidSlotyPhoneNumber(values.phone_number)) {
      errors.phone_number = 'أدخل رقم هاتف صحيح'
    }
  } else if (!values.existingUserId) {
    errors.user_id = 'اختر المستخدم'
  }

  if (values.role === 'STAFF' && !values.court) {
    errors.court = 'اختر ملعبًا للموظف'
  }

  return errors
}

function buildCreateMembershipPayload(
  values: AddUserFormState,
): CreateMembershipPayload {
  const basePayload =
    values.mode === 'new'
      ? {
          user: {
            username: values.username.trim(),
            email: getTrimmedOptional(values.email),
            password: values.password,
            first_name: values.first_name.trim(),
            last_name: values.last_name.trim(),
            phone_number: getTrimmedOptional(values.phone_number),
          },
        }
      : {
          user_id: Number(values.existingUserId),
        }

  if (values.role === 'STAFF') {
    return {
      ...basePayload,
      role: 'STAFF',
      court: Number(values.court),
    }
  }

  return {
    ...basePayload,
    role: 'MANAGER',
    court: null,
    manager_can_settle_transactions:
      values.manager_can_settle_transactions,
    manager_can_change_pricing: values.manager_can_change_pricing,
  }
}

interface AddUserSheetProps {
  courts: Court[]
  fieldErrors: AddUserFieldErrors
  generalError: string | null
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (values: AddUserFormState) => Promise<void>
}

function AddUserSheet({
  courts,
  fieldErrors,
  generalError,
  isSubmitting,
  onClose,
  onSubmit,
}: AddUserSheetProps) {
  const [values, setValues] = useState<AddUserFormState>(emptyAddUserForm)
  const [existingUserSearch, setExistingUserSearch] = useState('')
  const [existingUsers, setExistingUsers] = useState<PlatformUser[]>([])
  const [existingUsersError, setExistingUsersError] = useState<string | null>(
    null,
  )
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)

  function updateValue<Field extends keyof AddUserFormState>(
    field: Field,
    value: AddUserFormState[Field],
  ): void {
    setValues((current) => {
      const nextValues = {
        ...current,
        [field]: value,
      }

      if (field === 'role' && value === 'STAFF') {
        return {
          ...nextValues,
          manager_can_settle_transactions: false,
          manager_can_change_pricing: false,
        }
      }

      if (field === 'mode') {
        return {
          ...nextValues,
          existingUserId: '',
        }
      }

      return nextValues
    })
  }

  async function handleSearchExistingUsers(): Promise<void> {
    const search = existingUserSearch.trim()

    if (!search) {
      setExistingUsers([])
      setExistingUsersError('اكتب اسمًا أو رقم هاتف للبحث عن المستخدم.')
      return
    }

    setIsSearchingUsers(true)
    setExistingUsersError(null)

    try {
      const response = await listPlatformUsers({ search })

      setExistingUsers(normalizePlatformUsersResponse(response))
    } catch (error) {
      setExistingUsers([])
      setExistingUsersError(
        getApiErrorMessage(error, 'تعذر البحث عن المستخدمين'),
      )
    } finally {
      setIsSearchingUsers(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    await onSubmit(values)
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center"
      role="dialog"
    >
      <form
        className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-[var(--sloty-surface)] p-4 shadow-xl"
        onSubmit={handleSubmit}
      >
        <div className="space-y-1">
          <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
            إضافة مستخدم
          </h2>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            إنشاء عضوية مدير أو موظف داخل النادي
          </p>
        </div>

        {generalError ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {generalError}
          </p>
        ) : null}

        <fieldset className="space-y-2">
          <legend className="text-sm font-black text-[var(--sloty-text-primary)]">
            نوع المستخدم
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold">
              <input
                checked={values.mode === 'new'}
                className="accent-[var(--sloty-primary)]"
                disabled={isSubmitting}
                name="add-user-mode"
                onChange={() => updateValue('mode', 'new')}
                type="radio"
              />
              مستخدم جديد
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold">
              <input
                checked={values.mode === 'existing'}
                className="accent-[var(--sloty-primary)]"
                disabled={isSubmitting}
                name="add-user-mode"
                onChange={() => updateValue('mode', 'existing')}
                type="radio"
              />
              مستخدم موجود
            </label>
          </div>
          {fieldErrors.mode || fieldErrors.user_id ? (
            <p className="text-xs font-bold text-[var(--sloty-danger)]">
              {fieldErrors.mode ?? fieldErrors.user_id}
            </p>
          ) : null}
        </fieldset>

        {values.mode === 'existing' ? (
          <section className="space-y-3 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-4">
            <h3 className="text-sm font-black text-[var(--sloty-text-primary)]">
              اختيار مستخدم موجود
            </h3>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
                <span>البحث عن المستخدم</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  disabled={isSubmitting || isSearchingUsers}
                  onChange={(event) => setExistingUserSearch(event.target.value)}
                  placeholder="الاسم أو اسم المستخدم أو الهاتف أو البريد"
                  value={existingUserSearch}
                />
              </label>
              <div className="flex items-end">
                <AppButton
                  disabled={isSubmitting || isSearchingUsers}
                  fullWidth
                  onClick={() => void handleSearchExistingUsers()}
                  type="button"
                  variant="secondary"
                >
                  {isSearchingUsers ? 'جاري البحث...' : 'بحث'}
                </AppButton>
              </div>
            </div>

            {existingUsersError ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
                {existingUsersError}
              </p>
            ) : null}

            {existingUsers.length > 0 ? (
              <div className="grid gap-2">
                {existingUsers.map((user) => (
                  <label
                    className="flex items-start gap-3 rounded-xl border border-[var(--sloty-border)] bg-white p-3 text-sm"
                    key={user.id}
                  >
                    <input
                      checked={values.existingUserId === String(user.id)}
                      disabled={isSubmitting}
                      name="existingUser"
                      onChange={() =>
                        updateValue('existingUserId', String(user.id))
                      }
                      type="radio"
                    />
                    <span>
                      <span className="block font-black text-[var(--sloty-text-primary)]">
                        {getPlatformUserDisplayName(user)}
                      </span>
                      <span className="mt-1 block font-bold text-[var(--sloty-text-muted)]">
                        @{user.username}
                        {user.phone_number ? ` · ${user.phone_number}` : ''}
                        {user.email ? ` · ${user.email}` : ''}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                ابحث لاختيار مستخدم موجود بالاسم بدل إدخال رقم معرف يدوي.
              </p>
            )}
          </section>
        ) : null}

        <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
          <span>الدور</span>
          <select
            className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
            disabled={isSubmitting}
            onChange={(event) =>
              updateValue('role', event.target.value as CreateMembershipRole | '')
            }
            value={values.role}
          >
            <option value="">اختر الدور</option>
            <option value="MANAGER">مدير</option>
            <option value="STAFF">موظف</option>
          </select>
          {fieldErrors.role ? (
            <span className="block text-xs font-bold text-[var(--sloty-danger)]">
              {fieldErrors.role}
            </span>
          ) : null}
        </label>

        {values.mode === 'new' ? (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>الاسم الأول</span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              onChange={(event) => updateValue('first_name', event.target.value)}
              value={values.first_name}
            />
            {fieldErrors.first_name ? (
              <span className="block text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.first_name}
              </span>
            ) : null}
          </label>

          <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>اسم العائلة</span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              onChange={(event) => updateValue('last_name', event.target.value)}
              value={values.last_name}
            />
          </label>

          <div className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>رقم الهاتف</span>

            <SlotyPhoneNumberInput
              disabled={isSubmitting}
              error={Boolean(fieldErrors.phone_number)}
              onChange={(value) => updateValue('phone_number', value)}
              value={values.phone_number}
            />
            {fieldErrors.phone_number ? (
              <span className="block text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.phone_number}
              </span>
            ) : null}
          </div>

          <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>البريد الإلكتروني</span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              dir="ltr"
              onChange={(event) => updateValue('email', event.target.value)}
              type="email"
              value={values.email}
            />
            {fieldErrors.email ? (
              <span className="block text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.email}
              </span>
            ) : null}
          </label>

          <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>اسم المستخدم</span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              dir="ltr"
              onChange={(event) => updateValue('username', event.target.value)}
              value={values.username}
            />
            {fieldErrors.username ? (
              <span className="block text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.username}
              </span>
            ) : null}
          </label>

          <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>كلمة المرور</span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              onChange={(event) => updateValue('password', event.target.value)}
              type="password"
              value={values.password}
            />
            {fieldErrors.password ? (
              <span className="block text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.password}
              </span>
            ) : null}
          </label>
        </section>
        ) : null}

        {values.role === 'STAFF' ? (
          <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>الملعب المسؤول عنه</span>
            <select
              className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              onChange={(event) => updateValue('court', event.target.value)}
              value={values.court}
            >
              <option value="">اختر ملعبًا للموظف</option>
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name || `ملعب #${court.id}`}
                </option>
              ))}
            </select>
            {fieldErrors.court ? (
              <span className="block text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.court}
              </span>
            ) : null}
          </label>
        ) : null}

        {values.role === 'MANAGER' ? (
          <section className="space-y-3 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-3">
            <h3 className="text-sm font-black text-[var(--sloty-text-primary)]">
              صلاحيات المدير
            </h3>
            <ManagerPermissionFields
              fieldErrors={fieldErrors}
              isSubmitting={isSubmitting}
              onChange={updateValue}
              values={values}
            />
          </section>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <AppButton disabled={isSubmitting} fullWidth type="submit">
            حفظ المستخدم
          </AppButton>
          <AppButton
            disabled={isSubmitting}
            fullWidth
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            إلغاء
          </AppButton>
        </div>
      </form>
    </div>
  )
}

function UserCard({
  canEditPermissions,
  courts,
  onEditPermissions,
  onUpdateMembershipActivity,
  updatingMembershipId,
  user,
}: {
  canEditPermissions: boolean
  courts: Court[]
  onEditPermissions: (user: ClubUser) => void
  onUpdateMembershipActivity: (user: ClubUser, isActive: boolean) => void
  updatingMembershipId: number | null
  user: ClubUser
}) {
  const courtName = getUserCourtName(user, courts)
  const canToggleMembership = user.role !== 'OWNER'

  return (
    <AppCard className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
            {getClubUserDisplayName(user)}
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

      {canEditPermissions && user.role === 'MANAGER' ? (
        <AppButton
          fullWidth
          onClick={() => onEditPermissions(user)}
          type="button"
          variant="secondary"
        >
          تعديل الصلاحيات
        </AppButton>
      ) : null}

      {canEditPermissions && canToggleMembership ? (
        <AppButton
          disabled={updatingMembershipId === user.membership_id}
          fullWidth
          onClick={() =>
            onUpdateMembershipActivity(
              user,
              user.membership_is_active === false,
            )
          }
          type="button"
          variant={user.membership_is_active === false ? 'primary' : 'secondary'}
        >
          {updatingMembershipId === user.membership_id
            ? 'جاري تحديث العضوية...'
            : user.membership_is_active === false
              ? 'تفعيل العضوية'
              : 'تعطيل العضوية'}
        </AppButton>
      ) : null}
    </AppCard>
  )
}

/**
 * Read-only owner view for club users and manager permission flags.
 */
export function SettingsUsersPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { refreshCurrentUser, selectedClubSlug, selectedMembership } = useAuth()
  const [users, setUsers] = useState<ClubUser[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [usersReloadKey, setUsersReloadKey] = useState(0)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [isAddUserSheetOpen, setIsAddUserSheetOpen] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [addUserError, setAddUserError] = useState<string | null>(null)
  const [addUserFieldErrors, setAddUserFieldErrors] =
    useState<AddUserFieldErrors>({})
  const [editingManager, setEditingManager] = useState<ClubUser | null>(null)
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)
  const [updatingMembershipId, setUpdatingMembershipId] = useState<
    number | null
  >(null)
  const [permissionsError, setPermissionsError] = useState<string | null>(null)
  const [permissionsFieldErrors, setPermissionsFieldErrors] = useState<
    Partial<Record<keyof UpdateManagerPermissionsPayload, string>>
  >({})
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
  }, [isOwner, queryParams, selectedClubSlug, usersReloadKey])

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

  async function handleUpdateManagerPermissions(
    payload: UpdateManagerPermissionsPayload,
  ): Promise<void> {
    if (!selectedClubSlug || !editingManager) {
      return
    }

    setIsSavingPermissions(true)
    setPermissionsError(null)
    setPermissionsFieldErrors({})

    try {
      await updateManagerPermissions(
        selectedClubSlug,
        editingManager.membership_id,
        {
          manager_can_settle_transactions:
            payload.manager_can_settle_transactions,
          manager_can_change_pricing: payload.manager_can_change_pricing,
        },
      )
      setEditingManager(null)
      setUsersReloadKey((current) => current + 1)

      if (selectedMembership?.id === editingManager.membership_id) {
        await refreshCurrentUser()
      }
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error)
      const nextFieldErrors: Partial<
        Record<keyof UpdateManagerPermissionsPayload, string>
      > = {
        manager_can_settle_transactions: getFirstFieldErrorMessage(
          fieldErrors,
          'manager_can_settle_transactions',
        ) ?? undefined,
        manager_can_change_pricing: getFirstFieldErrorMessage(
          fieldErrors,
          'manager_can_change_pricing',
        ) ?? undefined,
      }

      setPermissionsFieldErrors(nextFieldErrors)
      setPermissionsError(
        getApiErrorMessage(
          error,
          'تعذر تحديث صلاحيات المدير. حاول مرة أخرى',
        ),
      )

      if (isApiClientError(error) && error.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setIsSavingPermissions(false)
    }
  }

  async function handleUpdateMembershipActivity(
    user: ClubUser,
    isActive: boolean,
  ): Promise<void> {
    if (!selectedClubSlug) {
      return
    }

    setUpdatingMembershipId(user.membership_id)
    setError(null)

    try {
      await updateMembershipActivity(selectedClubSlug, user.membership_id, {
        is_active: isActive,
      })
      setUsersReloadKey((current) => current + 1)
      setMessage(isActive ? 'تم تفعيل العضوية' : 'تم تعطيل العضوية')

      if (selectedMembership?.id === user.membership_id) {
        await refreshCurrentUser()
      }
    } catch (error) {
      setError(
        getApiErrorMessage(error, 'تعذر تحديث حالة العضوية. حاول مرة أخرى'),
      )

      if (isApiClientError(error) && error.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setUpdatingMembershipId(null)
    }
  }

  async function handleCreateMembership(values: AddUserFormState): Promise<void> {
    const localErrors = validateAddUserForm(values)

    if (Object.keys(localErrors).length > 0) {
      setAddUserFieldErrors(localErrors)
      setAddUserError(null)
      return
    }

    if (!selectedClubSlug) {
      return
    }

    setIsCreatingUser(true)
    setAddUserError(null)
    setAddUserFieldErrors({})

    try {
      await createClubMembership(selectedClubSlug, buildCreateMembershipPayload(values))
      setIsAddUserSheetOpen(false)
      setUsersReloadKey((current) => current + 1)
      setMessage('تم إضافة المستخدم بنجاح')
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error)

      setAddUserFieldErrors({
        username: getFirstFieldErrorMessage(fieldErrors, 'username') ?? undefined,
        email: getFirstFieldErrorMessage(fieldErrors, 'email') ?? undefined,
        password: getFirstFieldErrorMessage(fieldErrors, 'password') ?? undefined,
        phone_number:
          getFirstFieldErrorMessage(fieldErrors, 'phone_number') ?? undefined,
        user_id: getFirstFieldErrorMessage(fieldErrors, 'user_id') ?? undefined,
        role: getFirstFieldErrorMessage(fieldErrors, 'role') ?? undefined,
        court: getFirstFieldErrorMessage(fieldErrors, 'court') ?? undefined,
        manager_can_settle_transactions:
          getFirstFieldErrorMessage(
            fieldErrors,
            'manager_can_settle_transactions',
          ) ?? undefined,
        manager_can_change_pricing:
          getFirstFieldErrorMessage(fieldErrors, 'manager_can_change_pricing') ??
          undefined,
      })
      setAddUserError(
        getApiErrorMessage(error, 'تعذر إضافة المستخدم. حاول مرة أخرى'),
      )

      if (isApiClientError(error) && error.status === 403) {
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
            <AppButton
              onClick={() => {
                setAddUserError(null)
                setAddUserFieldErrors({})
                setIsAddUserSheetOpen(true)
              }}
              type="button"
            >
              إضافة مستخدم
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
            <UserCard
              canEditPermissions={isOwner}
              courts={courts}
              key={user.membership_id}
              onEditPermissions={(user) => {
                setPermissionsError(null)
                setPermissionsFieldErrors({})
                setEditingManager(user)
              }}
              onUpdateMembershipActivity={handleUpdateMembershipActivity}
              updatingMembershipId={updatingMembershipId}
              user={user}
            />
          ))}
        </section>
      ) : null}

      {editingManager ? (
        <EditManagerPermissionsDialog
          fieldErrors={permissionsFieldErrors}
          generalError={permissionsError}
          identity={getManagerIdentity(editingManager)}
          initialValues={getInitialManagerPermissionValues(editingManager)}
          isSubmitting={isSavingPermissions}
          onClose={() => {
            if (!isSavingPermissions) {
              setEditingManager(null)
            }
          }}
          onSubmit={handleUpdateManagerPermissions}
        />
      ) : null}

      {isAddUserSheetOpen ? (
        <AddUserSheet
          courts={courts}
          fieldErrors={addUserFieldErrors}
          generalError={addUserError}
          isSubmitting={isCreatingUser}
          onClose={() => {
            if (!isCreatingUser) {
              setIsAddUserSheetOpen(false)
            }
          }}
          onSubmit={handleCreateMembership}
        />
      ) : null}
    </div>
  )
}
