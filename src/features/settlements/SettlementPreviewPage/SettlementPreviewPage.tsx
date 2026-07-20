import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  getApiErrorCode,
  getApiErrorMessage,
  getApiFieldErrors,
  getFirstFieldErrorMessage,
} from '../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../core/api/apiClient'
import { canManageSettlements } from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import type {
  ClubUser,
  ClubUserRole,
  ClubUsersQueryParams,
} from '../../clubUsers/clubUsers.types'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import type { PaginatedResponse } from '../../../shared/api/api.types'
import { SettlementTotalsCard } from '../components/SettlementTotalsCard/SettlementTotalsCard'
import { SettlementTransactionsList } from '../components/SettlementTransactionsList/SettlementTransactionsList'
import {
  confirmUserSettlement,
  reviewUserSettlement,
} from '../settlementsApi'
import type { SettlementPreview } from '../settlements.types'

interface UserFilterState {
  search: string
  role: ClubUserRole | ''
  court: string
  is_active: '' | 'true' | 'false'
}

const initialFilters: UserFilterState = {
  search: '',
  role: '',
  court: '',
  is_active: '',
}

const roleLabels: Record<ClubUserRole, string> = {
  OWNER: 'مالك',
  MANAGER: 'مدير',
  STAFF: 'موظف',
}

const reviewReloadErrorCodes = new Set([
  'SETTLEMENT_ALREADY_DONE',
  'TRANSACTION_SETTLED_LOCKED',
])

function isPaginatedClubUsers(
  response: ClubUser[] | PaginatedResponse<ClubUser>,
): response is PaginatedResponse<ClubUser> {
  return !Array.isArray(response) && Array.isArray(response.results)
}

function normalizeClubUsers(
  response: ClubUser[] | PaginatedResponse<ClubUser>,
): ClubUser[] {
  return isPaginatedClubUsers(response) ? response.results : response
}

function buildUserParams(filters: UserFilterState): ClubUsersQueryParams {
  return {
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.court ? { court: filters.court } : {}),
    ...(filters.is_active ? { is_active: filters.is_active } : {}),
  }
}

function getUserName(user: ClubUser): string {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')

  return fullName.trim() || user.username
}

function isActiveMembership(user: ClubUser): boolean {
  return user.membership_is_active ?? user.is_user_active ?? true
}

function getConfirmErrorMessage(): string {
  return 'تعذر تأكيد التسوية. تأكد من اختيار المستخدم ووجود معاملات غير مسواة.'
}

/**
 * User-based settlement preview and confirmation flow for the selected club.
 */
export function SettlementPreviewPage() {
  const { selectedClubSlug, selectedMembership } = useAuth()
  const navigate = useNavigate()
  const [filters, setFilters] = useState<UserFilterState>(initialFilters)
  const [users, setUsers] = useState<ClubUser[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedUser, setSelectedUser] = useState<ClubUser | null>(null)
  const [preview, setPreview] = useState<SettlementPreview | null>(null)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isLoadingCourts, setIsLoadingCourts] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [notes, setNotes] = useState('')
  const selectedClubName = selectedMembership?.club.name ?? null
  const canSettle = canManageSettlements(selectedMembership)
  const hasTransactions = Boolean(preview && preview.transaction_count > 0)
  const collectedByFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'collected_by',
  )

  useEffect(() => {
    if (!selectedClubSlug || !canSettle) {
      return
    }

    let isActive = true
    const clubSlug = selectedClubSlug

    async function loadInitialData(): Promise<void> {
      setIsLoadingUsers(true)
      setIsLoadingCourts(true)
      setError(null)
      setFieldErrors(null)

      try {
        const [usersResponse, courtsResponse] = await Promise.all([
          listClubUsers(clubSlug),
          listCourts(clubSlug),
        ])

        if (isActive) {
          setUsers(normalizeClubUsers(usersResponse))
          setCourts(courtsResponse.results)
        }
      } catch (error) {
        if (isActive) {
          setUsers([])
          setCourts([])
          setError(
            getApiErrorMessage(error, 'تعذر تحميل مستخدمي النادي'),
          )
        }
      } finally {
        if (isActive) {
          setIsLoadingUsers(false)
          setIsLoadingCourts(false)
        }
      }
    }

    void loadInitialData()

    return () => {
      isActive = false
    }
  }, [canSettle, selectedClubSlug])

  function updateFilter(field: keyof UserFilterState, value: string): void {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
    setSuccessMessage(null)
    setFieldErrors(null)
  }

  async function handleUsersSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()

    if (!selectedClubSlug || !canSettle) {
      return
    }

    setIsLoadingUsers(true)
    setError(null)
    setFieldErrors(null)
    setSuccessMessage(null)

    try {
      const response = await listClubUsers(
        selectedClubSlug,
        buildUserParams(filters),
      )

      setUsers(normalizeClubUsers(response))
    } catch (error) {
      setUsers([])
      setError(getApiErrorMessage(error, 'تعذر تحديث قائمة المستخدمين'))
    } finally {
      setIsLoadingUsers(false)
    }
  }

  function handleSelectUser(user: ClubUser): void {
    setSelectedUser(user)
    setPreview(null)
    setNotes('')
    setIsConfirming(false)
    setError(null)
    setFieldErrors(null)
    setSuccessMessage(null)
  }

  async function handleReviewSettlement(): Promise<void> {
    if (!selectedClubSlug || !selectedUser) {
      setError('من فضلك اختر المستخدم المراد تسويته.')
      return
    }

    setPreview(null)
    setNotes('')
    setIsConfirming(false)
    setIsLoadingPreview(true)
    setError(null)
    setFieldErrors(null)
    setSuccessMessage(null)

    try {
      const nextPreview = await reviewUserSettlement(selectedClubSlug, {
        collected_by: selectedUser.id,
        dry_run: true,
      })

      setPreview(nextPreview)

      if (nextPreview.transaction_count <= 0) {
        setError('لا توجد معاملات غير مسواة لهذا المستخدم.')
      }
    } catch (error) {
      const fallback =
        getApiErrorCode(error) === 'NO_UNSETTLED_TRANSACTIONS'
          ? 'لا توجد معاملات غير مسواة لهذا المستخدم.'
          : 'تعذر مراجعة تسوية هذا المستخدم.'

      setPreview(null)
      setError(getApiErrorMessage(error, fallback))
      setFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsLoadingPreview(false)
    }
  }

  async function handleConfirmSettlement(): Promise<void> {
    if (!selectedClubSlug || !selectedUser) {
      setError('من فضلك اختر المستخدم المراد تسويته.')
      return
    }

    if (!preview || !hasTransactions) {
      return
    }

    setIsSubmitting(true)
    setError(null)
    setFieldErrors(null)
    setSuccessMessage(null)

    try {
      const settlement = await confirmUserSettlement(selectedClubSlug, {
        collected_by: selectedUser.id,
        dry_run: false,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      })

      setSuccessMessage('تم تأكيد التسوية بنجاح.')
      setIsConfirming(false)
      navigate(`/settlements/${settlement.id}`, {
        state: { flashMessage: 'تم تأكيد التسوية بنجاح.' },
      })
    } catch (error) {
      const errorCode = getApiErrorCode(error)

      setError(getApiErrorMessage(error, getConfirmErrorMessage()))
      setFieldErrors(getApiFieldErrors(error))

      if (
        errorCode &&
        reviewReloadErrorCodes.has(errorCode) &&
        selectedClubSlug &&
        selectedUser
      ) {
        try {
          setPreview(
            await reviewUserSettlement(selectedClubSlug, {
              collected_by: selectedUser.id,
              dry_run: true,
            }),
          )
        } catch {
          setPreview(null)
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <Link to="/settlements/history">
            <AppButton variant="secondary">سجل التسويات</AppButton>
          </Link>
        }
        description={
          selectedClubName
            ? `اختر مستخدمًا لمراجعة كل معاملاته غير المسواة داخل ${selectedClubName}`
            : 'اختر مستخدمًا لمراجعة كل معاملاته غير المسواة داخل النادي'
        }
        tone="brand"
        title="مراجعة تسوية"
      />

      {!selectedClubSlug ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            اختر ناديًا أولًا لعرض التسويات
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug && !canSettle ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-danger)]">
            ليس لديك صلاحية إدارة التسويات
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug && canSettle ? (
        <>
          <AppCard>
            <form
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
              onSubmit={handleUsersSubmit}
            >
              <label className="space-y-2 text-sm font-semibold md:col-span-2 xl:col-span-1">
                <span>بحث عن مستخدم</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) => updateFilter('search', event.target.value)}
                  value={filters.search}
                />
              </label>

              <label className="space-y-2 text-sm font-semibold">
                <span>الدور</span>
                <select
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) => updateFilter('role', event.target.value)}
                  value={filters.role}
                >
                  <option value="">كل الأدوار</option>
                  <option value="OWNER">مالك</option>
                  <option value="MANAGER">مدير</option>
                  <option value="STAFF">موظف</option>
                </select>
              </label>

              <label className="space-y-2 text-sm font-semibold">
                <span>الملعب</span>
                <select
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  disabled={isLoadingCourts}
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

              <label className="space-y-2 text-sm font-semibold">
                <span>حالة العضوية</span>
                <select
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) =>
                    updateFilter('is_active', event.target.value)
                  }
                  value={filters.is_active}
                >
                  <option value="">الكل</option>
                  <option value="true">نشط</option>
                  <option value="false">غير نشط</option>
                </select>
              </label>

              <div className="flex items-end">
                <AppButton disabled={isLoadingUsers} fullWidth type="submit">
                  {isLoadingUsers ? 'جاري التحديث...' : 'تحديث المستخدمين'}
                </AppButton>
              </div>
            </form>
          </AppCard>

          {error ? (
            <AppCard>
              <p className="text-sm font-bold text-[var(--sloty-danger)]">
                {error}
              </p>
            </AppCard>
          ) : null}

          {successMessage ? (
            <AppCard>
              <p className="text-sm font-bold text-[var(--sloty-primary-dark)]">
                {successMessage}
              </p>
            </AppCard>
          ) : null}

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
            <div className="space-y-3">
              {isLoadingUsers ? (
                <AppCard>
                  <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                    جاري تحميل المستخدمين...
                  </p>
                </AppCard>
              ) : null}

              {!isLoadingUsers && users.length === 0 ? (
                <AppCard>
                  <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                    لا توجد نتائج مستخدمين لهذه الفلاتر
                  </p>
                </AppCard>
              ) : null}

              {!isLoadingUsers && users.length > 0
                ? users.map((user) => {
                    const isSelected = selectedUser?.id === user.id
                    const active = isActiveMembership(user)

                    return (
                      <AppCard
                        className={[
                          'space-y-3',
                          isSelected
                            ? 'border-[var(--sloty-primary)] bg-[var(--sloty-soft-mint)]/45'
                            : '',
                        ].join(' ')}
                        key={user.membership_id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-black text-[var(--sloty-text-primary)]">
                              {getUserName(user)}
                            </p>
                            <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
                              @{user.username}
                            </p>
                          </div>
                          <span
                            className={[
                              'rounded-full px-3 py-1 text-xs font-black',
                              active
                                ? 'bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]'
                                : 'bg-[var(--sloty-danger-soft)] text-[var(--sloty-danger)]',
                            ].join(' ')}
                          >
                            {active ? 'نشط' : 'غير نشط'}
                          </span>
                        </div>

                        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                          <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                            <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                              الدور
                            </dt>
                            <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                              {roleLabels[user.role]}
                            </dd>
                          </div>
                          {user.court_name ? (
                            <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                              <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                                الملعب
                              </dt>
                              <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                                {user.court_name}
                              </dd>
                            </div>
                          ) : null}
                          {user.phone_number ? (
                            <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 sm:col-span-2">
                              <dt className="text-xs font-bold text-[var(--sloty-text-muted)]">
                                الهاتف
                              </dt>
                              <dd
                                className="mt-1 font-black text-[var(--sloty-text-primary)]"
                                dir="ltr"
                              >
                                {user.phone_number}
                              </dd>
                            </div>
                          ) : null}
                        </dl>

                        <AppButton
                          fullWidth
                          onClick={() => handleSelectUser(user)}
                          variant={isSelected ? 'secondary' : 'primary'}
                        >
                          {isSelected ? 'تم الاختيار' : 'اختيار للتسوية'}
                        </AppButton>
                        {isSelected && collectedByFieldError ? (
                          <p className="text-xs font-bold text-[var(--sloty-danger)]">
                            {collectedByFieldError}
                          </p>
                        ) : null}
                      </AppCard>
                    )
                  })
                : null}
            </div>

            <div className="space-y-3">
              {!selectedUser ? (
                <AppCard>
                  <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                    اختر مستخدمًا ثم راجع معاملاته غير المسواة.
                  </p>
                </AppCard>
              ) : null}

              {selectedUser && !isLoadingPreview && !preview ? (
                <AppCard className="space-y-3">
                  <div>
                    <p className="text-sm font-black text-[var(--sloty-text-primary)]">
                      المستخدم المختار: {getUserName(selectedUser)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
                      راجع المعاملات غير المسواة قبل تأكيد التسوية.
                    </p>
                  </div>
                  <AppButton
                    disabled={isLoadingPreview}
                    onClick={handleReviewSettlement}
                  >
                    مراجعة التسوية
                  </AppButton>
                </AppCard>
              ) : null}

              {selectedUser && isLoadingPreview ? (
                <AppCard>
                  <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                    جاري مراجعة التسوية...
                  </p>
                </AppCard>
              ) : null}

              {selectedUser && !isLoadingPreview && preview ? (
                <>
                  <SettlementTotalsCard
                    totalAmount={preview.total_amount}
                    totalsByPaymentMethod={preview.totals_by_payment_method}
                    transactionCount={preview.transaction_count}
                  />

                  <SettlementTransactionsList
                    transactions={preview.transactions}
                  />

                  {hasTransactions ? (
                    <AppCard className="space-y-4">
                      {!isConfirming ? (
                        <AppButton
                          onClick={() => setIsConfirming(true)}
                        >
                          تأكيد التسوية
                        </AppButton>
                      ) : (
                        <div className="space-y-4">
                          <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-3 text-sm font-bold leading-6 text-[var(--sloty-text-primary)]">
                            <p>
                              أنت على وشك تسوية كل المعاملات غير المسواة الخاصة
                              بـ {preview.collected_by_name}.
                            </p>
                            <p>الإجمالي: {preview.total_amount} جنيه</p>
                            <p>عدد المعاملات: {preview.transaction_count}</p>
                            <p>
                              سيتم ربط هذه المعاملات بهذه التسوية ولن تدخل في
                              تسوية أخرى.
                            </p>
                          </div>
                          <label className="block space-y-2 text-sm font-semibold">
                            <span>ملاحظات</span>
                            <textarea
                              className="min-h-24 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-2 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                              onChange={(event) => setNotes(event.target.value)}
                              value={notes}
                            />
                          </label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <AppButton
                              disabled={isSubmitting}
                              onClick={handleConfirmSettlement}
                            >
                              {isSubmitting
                                ? 'جاري تأكيد التسوية...'
                                : 'تأكيد التسوية'}
                            </AppButton>
                            <AppButton
                              disabled={isSubmitting}
                              onClick={() => setIsConfirming(false)}
                              variant="secondary"
                            >
                              رجوع
                            </AppButton>
                          </div>
                        </div>
                      )}
                    </AppCard>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
