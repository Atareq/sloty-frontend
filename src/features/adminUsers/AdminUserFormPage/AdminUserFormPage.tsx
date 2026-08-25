import { useEffect, useState, type FormEvent } from 'react'
import type { Value } from 'react-phone-number-input'
import { useNavigate } from 'react-router'
import { isApiClientError } from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { AppSelect } from '../../../shared/components/AppSelect/AppSelect'
import { SlotyPhoneNumberInput } from '../../../shared/components/PhoneNumberInput/PhoneNumberInput'
import { appRoutes } from '../../../shared/navigation/appRoutes'
import { isValidSlotyPhoneNumber } from '../../../shared/validation/phone'
import { createClubMembership } from '../../clubUsers/clubUsersApi'
import type { PlatformAdminCreateMembershipRole } from '../../clubUsers/clubUsers.types'
import { ManagerPermissionFields } from '../../clubUsers/components/ManagerPermissionFields/ManagerPermissionFields'
import { listClubs } from '../../clubs/clubsApi'
import type { Club } from '../../clubs/clubs.types'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import {
  createPlatformAdmin,
  listPlatformUsers,
} from '../adminUsersApi'
import {
  getPlatformUserDisplayName,
  normalizePlatformUsersResponse,
} from '../adminUsers.display'
import {
  getAdminUserErrorMessage,
  getAdminUserFieldErrors,
} from '../adminUsers.errors'
import type { PlatformUser } from '../adminUsers.types'

type UserKind = 'PLATFORM_ADMIN' | 'CLUB_USER'
type ClubUserMode = 'new' | 'existing'

interface FormValues {
  userKind: UserKind
  clubUserMode: ClubUserMode
  first_name: string
  last_name: string
  username: string
  phone_number: Value | undefined
  email: string
  password: string
  club_slug: string
  role: PlatformAdminCreateMembershipRole | ''
  court: string
  manager_can_settle_transactions: boolean
  manager_can_change_pricing: boolean
  existingUserId: string
}

type FormField = keyof FormValues | 'user_id'
type FormErrors = Partial<Record<FormField, string>>

const initialValues: FormValues = {
  userKind: 'PLATFORM_ADMIN',
  clubUserMode: 'new',
  first_name: '',
  last_name: '',
  username: '',
  phone_number: undefined,
  email: '',
  password: '',
  club_slug: '',
  role: '',
  court: '',
  manager_can_settle_transactions: false,
  manager_can_change_pricing: false,
  existingUserId: '',
}

const userKindOptions = [
  { value: 'PLATFORM_ADMIN', label: 'مسؤول منصة' },
  { value: 'CLUB_USER', label: 'مستخدم نادي' },
]

const platformMembershipRoleOptions = [
  { value: '', label: 'اختر الدور' },
  { value: 'OWNER', label: 'مالك' },
  { value: 'MANAGER', label: 'مدير' },
  { value: 'STAFF', label: 'موظف' },
]

function trimOptional(value: string): string | undefined {
  const trimmedValue = value.trim()

  return trimmedValue ? trimmedValue : undefined
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.userKind) {
    errors.userKind = 'نوع المستخدم مطلوب'
  }

  if (values.userKind === 'CLUB_USER') {
    if (!values.club_slug) {
      errors.club_slug = 'النادي مطلوب'
    }

    if (!values.role) {
      errors.role = 'الدور مطلوب'
    }

    if (values.role === 'STAFF' && !values.court) {
      errors.court = 'اختر ملعبًا للموظف'
    }
  }

  if (values.clubUserMode === 'existing') {
    if (!values.existingUserId) {
      errors.user_id = 'اختر المستخدم'
    }
    return errors
  }

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

  return errors
}

export function AdminUserFormPage() {
  const navigate = useNavigate()
  const { refreshCurrentUser } = useAuth()
  const [values, setValues] = useState<FormValues>(initialValues)
  const [clubs, setClubs] = useState<Club[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [existingUserSearch, setExistingUserSearch] = useState('')
  const [existingUsers, setExistingUsers] = useState<PlatformUser[]>([])
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [existingUsersError, setExistingUsersError] = useState<string | null>(
    null,
  )
  const [isLoadingClubs, setIsLoadingClubs] = useState(true)
  const [isLoadingCourts, setIsLoadingCourts] = useState(false)
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isActive = true

    async function loadClubs(): Promise<void> {
      setIsLoadingClubs(true)

      try {
        const response = await listClubs()

        if (isActive) {
          setClubs(response.results)
        }
      } catch (error) {
        if (isActive) {
          setError(getAdminUserErrorMessage(error, 'تعذر تحميل الأندية'))
        }
      } finally {
        if (isActive) {
          setIsLoadingClubs(false)
        }
      }
    }

    void loadClubs()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (values.userKind !== 'CLUB_USER' || !values.club_slug) {
      return
    }

    let isActive = true

    async function loadCourts(): Promise<void> {
      setIsLoadingCourts(true)

      try {
        const response = await listCourts(values.club_slug)

        if (isActive) {
          setCourts(response.results)
        }
      } catch (error) {
        if (isActive) {
          setError(getAdminUserErrorMessage(error, 'تعذر تحميل ملاعب النادي'))
          setCourts([])
        }
      } finally {
        if (isActive) {
          setIsLoadingCourts(false)
        }
      }
    }

    void loadCourts()

    return () => {
      isActive = false
    }
  }, [values.club_slug, values.userKind])

  function updateValue<Key extends keyof FormValues>(
    field: Key,
    value: FormValues[Key],
  ): void {
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === 'userKind'
        ? { role: '', club_slug: '', court: '' }
        : {}),
      ...(field === 'club_slug' ? { court: '' } : {}),
      ...(field === 'role'
        ? {
            court: '',
            manager_can_settle_transactions: false,
            manager_can_change_pricing: false,
          }
        : {}),
    }))
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }))
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
        getAdminUserErrorMessage(error, 'تعذر البحث عن المستخدمين'),
      )
    } finally {
      setIsSearchingUsers(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const nextFieldErrors = validate(values)
    setFieldErrors(nextFieldErrors)

    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      if (values.userKind === 'PLATFORM_ADMIN') {
        const createdUser = await createPlatformAdmin({
          username: values.username,
          password: values.password,
          first_name: values.first_name,
          last_name: trimOptional(values.last_name),
          email: trimOptional(values.email),
          phone_number: values.phone_number,
        })

        navigate(appRoutes.adminUserDetail(createdUser.id), {
          state: { flashMessage: 'تم إنشاء المستخدم بنجاح.' },
        })
        return
      } else if (values.role) {
        const userPayload =
          values.clubUserMode === 'existing'
            ? { user_id: Number(values.existingUserId) }
            : {
                user: {
                  username: values.username,
                  password: values.password,
                  first_name: values.first_name,
                  last_name: values.last_name,
                  email: trimOptional(values.email),
                  phone_number: values.phone_number,
                },
              }
        const createdMembership = await createClubMembership(values.club_slug, {
          ...userPayload,
          role: values.role,
          ...(values.role === 'STAFF'
            ? { court: Number(values.court) }
            : {}),
          ...(values.role === 'MANAGER'
            ? {
                court: null,
                manager_can_settle_transactions:
                  values.manager_can_settle_transactions,
                manager_can_change_pricing:
                  values.manager_can_change_pricing,
              }
            : {}),
        })

        navigate(appRoutes.adminUserDetail(createdMembership.user_summary.id), {
          state: { flashMessage: 'تم إنشاء العضوية بنجاح.' },
        })
        return
      }
    } catch (error) {
      setFieldErrors(getAdminUserFieldErrors<FormField>(error))
      setError(getAdminUserErrorMessage(error, 'تعذر إنشاء المستخدم'))

      if (isApiClientError(error) && error.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const isClubUser = values.userKind === 'CLUB_USER'
  const isNewClubUser = !isClubUser || values.clubUserMode === 'new'
  const isExistingClubUser = isClubUser && values.clubUserMode === 'existing'
  const isManager = isClubUser && values.role === 'MANAGER'
  const isStaff = isClubUser && values.role === 'STAFF'

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error ? (
        <AppCard>
          <p className="text-sm font-semibold text-[var(--sloty-danger)]">
            {error}
          </p>
        </AppCard>
      ) : null}

      <AppCard className="space-y-4">
        <label className="block space-y-2">
          <AppSelect
            disabled={isSubmitting}
            label="نوع المستخدم"
            onChange={(value) => updateValue('userKind', value as UserKind)}
            options={userKindOptions}
            value={values.userKind}
          />
          {fieldErrors.userKind ? (
            <span className="text-xs font-bold text-[var(--sloty-danger)]">
              {fieldErrors.userKind}
            </span>
          ) : null}
        </label>
      </AppCard>

      {isClubUser ? (
        <AppCard className="space-y-4">
          <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
            نوع الربط
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-3 text-sm font-bold">
              <input
                checked={values.clubUserMode === 'new'}
                disabled={isSubmitting}
                name="clubUserMode"
                onChange={() => updateValue('clubUserMode', 'new')}
                type="radio"
              />
              إنشاء حساب جديد
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-3 text-sm font-bold">
              <input
                checked={values.clubUserMode === 'existing'}
                disabled={isSubmitting}
                name="clubUserMode"
                onChange={() => updateValue('clubUserMode', 'existing')}
                type="radio"
              />
              ربط مستخدم موجود
            </label>
          </div>
        </AppCard>
      ) : null}

      {isNewClubUser ? (
      <AppCard className="space-y-4">
        <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
          بيانات الحساب
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>الاسم الأول</span>
            <input
              className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              onChange={(event) => updateValue('first_name', event.target.value)}
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
              value={values.last_name}
            />
          </label>

          <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>اسم المستخدم</span>
            <input
              className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              onChange={(event) => updateValue('username', event.target.value)}
              value={values.username}
            />
            {fieldErrors.username ? (
              <span className="text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.username}
              </span>
            ) : null}
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
              type="email"
              value={values.email}
            />
          </label>

          <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>كلمة المرور</span>
            <input
              className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              onChange={(event) => updateValue('password', event.target.value)}
              type="password"
              value={values.password}
            />
            {fieldErrors.password ? (
              <span className="text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.password}
              </span>
            ) : null}
          </label>
        </div>
      </AppCard>
      ) : null}

      {isExistingClubUser ? (
        <AppCard className="space-y-4">
          <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
            المستخدم الموجود
          </h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>البحث عن المستخدم</span>
              <input
                className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
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

          {fieldErrors.user_id ? (
            <p className="text-xs font-bold text-[var(--sloty-danger)]">
              {fieldErrors.user_id}
            </p>
          ) : null}

          {existingUsers.length > 0 ? (
            <div className="grid gap-2">
              {existingUsers.map((user) => (
                <label
                  className="flex items-start gap-3 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-3 text-sm"
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
        </AppCard>
      ) : null}

      {isClubUser ? (
        <AppCard className="space-y-4">
          <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
            بيانات العضوية
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-2">
              <AppSelect
                disabled={isSubmitting || isLoadingClubs}
                label="النادي"
                loading={isLoadingClubs}
                onChange={(value) => updateValue('club_slug', value)}
                options={[
                  { value: '', label: 'اختر النادي' },
                  ...clubs.map((club) => ({
                    value: club.slug,
                    label: club.name,
                  })),
                ]}
                value={values.club_slug}
              />
              {fieldErrors.club_slug ? (
                <span className="text-xs font-bold text-[var(--sloty-danger)]">
                  {fieldErrors.club_slug}
                </span>
              ) : null}
            </label>

            <label className="block space-y-2">
              <AppSelect
                disabled={isSubmitting}
                label="الدور"
                onChange={(value) =>
                  updateValue(
                    'role',
                    value as PlatformAdminCreateMembershipRole | '',
                  )
                }
                options={platformMembershipRoleOptions}
                value={values.role}
              />
              {fieldErrors.role ? (
                <span className="text-xs font-bold text-[var(--sloty-danger)]">
                  {fieldErrors.role}
                </span>
              ) : null}
            </label>

            {isStaff ? (
              <label className="block space-y-2">
                <AppSelect
                  disabled={isSubmitting || !values.club_slug}
                  label="الملعب"
                  loading={isLoadingCourts}
                  onChange={(value) => updateValue('court', value)}
                  options={[
                    { value: '', label: 'اختر الملعب' },
                    ...courts.map((court) => ({
                      value: String(court.id),
                      label: court.name,
                    })),
                  ]}
                  value={values.court}
                />
                {fieldErrors.court ? (
                  <span className="text-xs font-bold text-[var(--sloty-danger)]">
                    {fieldErrors.court}
                  </span>
                ) : null}
              </label>
            ) : null}
          </div>

          {isManager ? (
            <section className="space-y-3 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-4">
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
        </AppCard>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <AppButton disabled={isSubmitting} type="submit">
          {isSubmitting ? 'جاري الحفظ...' : 'حفظ المستخدم'}
        </AppButton>
        <AppButton
          disabled={isSubmitting}
          onClick={() => navigate(appRoutes.adminUsers)}
          type="button"
          variant="secondary"
        >
          إلغاء
        </AppButton>
      </div>
    </form>
  )
}
