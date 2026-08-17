import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { isApiClientError } from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { appRoutes } from '../../../shared/navigation/appRoutes'
import {
  updateMembershipActivity,
  updateManagerPermissions,
} from '../../clubUsers/clubUsersApi'
import type {
  ClubUser,
  UpdateManagerPermissionsPayload,
} from '../../clubUsers/clubUsers.types'
import { EditManagerPermissionsDialog } from '../../clubUsers/components/EditManagerPermissionsDialog/EditManagerPermissionsDialog'
import { UserPermissions } from '../../clubUsers/components/UserPermissions/UserPermissions'
import {
  getPlatformUser,
  updatePlatformUser,
} from '../adminUsersApi'
import {
  getPlatformUserAccountTypeLabel,
  getPlatformUserDisplayName,
  getPlatformUserStatusLabel,
} from '../adminUsers.display'
import {
  getAdminUserErrorMessage,
  getAdminUserFieldErrors,
} from '../adminUsers.errors'
import type {
  PlatformUser,
  PlatformUserMembershipSummary,
} from '../adminUsers.types'

const roleLabels: Record<string, string> = {
  OWNER: 'مالك',
  MANAGER: 'مدير',
  STAFF: 'موظف',
}

function getInitialManagerPermissionValues(
  membership: PlatformUserMembershipSummary,
): Required<UpdateManagerPermissionsPayload> {
  return {
    manager_can_settle_transactions: Boolean(
      membership.manager_can_settle_transactions ??
        membership.can_manage_settlements,
    ),
    manager_can_change_pricing: Boolean(
      membership.manager_can_change_pricing ?? membership.can_change_pricing,
    ),
  }
}

function toClubUserShape(
  membership: PlatformUserMembershipSummary,
  user: PlatformUser,
): ClubUser {
  return {
    id: user.id,
    membership_id: Number(membership.membership_id ?? 0),
    username: user.username,
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    phone_number: user.phone_number,
    is_user_active: user.is_active,
    role: membership.role ?? 'STAFF',
    club:
      typeof membership.club === 'number'
        ? membership.club
        : Number(membership.club_id ?? 0),
    club_slug: membership.club_slug,
    court:
      typeof membership.court === 'number'
        ? membership.court
        : membership.court
          ? Number(membership.court)
          : null,
    court_name: membership.court_name,
    membership_is_active: membership.membership_is_active,
    manager_can_settle_transactions:
      membership.manager_can_settle_transactions,
    manager_can_change_pricing: membership.manager_can_change_pricing,
    can_change_pricing: membership.can_change_pricing,
    can_manage_working_hours: membership.can_manage_working_hours,
    can_manage_settlements: membership.can_manage_settlements,
  }
}

export function AdminUserDetailsPage() {
  const { userId } = useParams()
  const { refreshCurrentUser, selectedMembership } = useAuth()
  const [user, setUser] = useState<PlatformUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [reloadKey, setReloadKey] = useState(0)
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false)
  const [pendingAccountStatus, setPendingAccountStatus] = useState<
    boolean | null
  >(null)
  const [updatingMembershipId, setUpdatingMembershipId] = useState<
    number | string | null
  >(null)
  const [editingMembership, setEditingMembership] =
    useState<PlatformUserMembershipSummary | null>(null)
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)
  const [permissionsError, setPermissionsError] = useState<string | null>(null)
  const [permissionsFieldErrors, setPermissionsFieldErrors] = useState<
    Partial<Record<keyof UpdateManagerPermissionsPayload, string>>
  >({})

  useEffect(() => {
    if (!userId) {
      return
    }

    let isActive = true
    const activeUserId = userId

    async function loadUser(): Promise<void> {
      setIsLoading(true)
      setError(null)

      try {
        const response = await getPlatformUser(activeUserId)

        if (isActive) {
          setUser(response)
        }
      } catch (error) {
        if (isActive) {
          setError(
            getAdminUserErrorMessage(error, 'تعذر تحميل تفاصيل المستخدم'),
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadUser()

    return () => {
      isActive = false
    }
  }, [reloadKey, userId])

  const memberships = Array.isArray(user?.memberships) ? user.memberships : []
  const missingUserError = userId ? null : 'المستخدم غير محدد.'
  const canUpdateAccountStatus = user?.is_active !== undefined

  async function handleUpdateAccountStatus(isActive: boolean): Promise<void> {
    if (!userId) {
      return
    }

    setIsUpdatingAccount(true)
    setError(null)

    try {
      await updatePlatformUser(userId, { is_active: isActive })
      setPendingAccountStatus(null)
      setReloadKey((current) => current + 1)
    } catch (error) {
      setError(
        getAdminUserErrorMessage(error, 'تعذر تحديث حالة الحساب'),
      )

      if (isApiClientError(error) && error.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setIsUpdatingAccount(false)
    }
  }

  async function handleUpdateMembershipActivity(
    membership: PlatformUserMembershipSummary,
    isActive: boolean,
  ): Promise<void> {
    if (!membership.club_slug || !membership.membership_id) {
      return
    }

    setUpdatingMembershipId(membership.membership_id)
    setError(null)

    try {
      await updateMembershipActivity(
        membership.club_slug,
        membership.membership_id,
        { is_active: isActive },
      )
      setReloadKey((current) => current + 1)

      if (
        selectedMembership?.id === membership.membership_id &&
        selectedMembership.club.slug === membership.club_slug
      ) {
        await refreshCurrentUser()
      }
    } catch (error) {
      setError(
        getAdminUserErrorMessage(error, 'تعذر تحديث حالة العضوية'),
      )

      if (isApiClientError(error) && error.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setUpdatingMembershipId(null)
    }
  }

  function openManagerPermissionEditor(
    membership: PlatformUserMembershipSummary,
  ): void {
    setPermissionsError(null)
    setPermissionsFieldErrors({})
    setEditingMembership(membership)
  }

  async function handleUpdateManagerPermissions(
    payload: UpdateManagerPermissionsPayload,
  ): Promise<void> {
    if (!editingMembership?.club_slug || !editingMembership.membership_id) {
      return
    }

    setIsSavingPermissions(true)
    setPermissionsError(null)
    setPermissionsFieldErrors({})

    try {
      await updateManagerPermissions(
        editingMembership.club_slug,
        editingMembership.membership_id,
        payload,
      )
      setEditingMembership(null)
      setReloadKey((current) => current + 1)

      if (
        selectedMembership?.id === editingMembership.membership_id &&
        selectedMembership.club.slug === editingMembership.club_slug
      ) {
        await refreshCurrentUser()
      }
    } catch (error) {
      setPermissionsFieldErrors(
        getAdminUserFieldErrors<keyof UpdateManagerPermissionsPayload>(error),
      )
      setPermissionsError(
        getAdminUserErrorMessage(error, 'تعذر تحديث صلاحيات العضوية'),
      )

      if (isApiClientError(error) && error.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setIsSavingPermissions(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <Link to={appRoutes.adminUsers}>
            <AppButton variant="secondary">رجوع للمستخدمين</AppButton>
          </Link>
        }
        description="تفاصيل الحساب والعضويات كما يرسلها الخادم."
        title="تفاصيل المستخدم"
        tone="brand"
      />

      {isLoading ? (
        <AppCard>
          <p className="text-sm text-[var(--sloty-text-muted)]">
            جاري تحميل تفاصيل المستخدم...
          </p>
        </AppCard>
      ) : null}

      {error || missingUserError ? (
        <AppCard>
          <p className="text-sm font-semibold text-[var(--sloty-danger)]">
            {error ?? missingUserError}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && user ? (
        <>
          <AppCard className="space-y-4">
            <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
              بيانات الحساب
            </h2>
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <dt className="font-black text-[var(--sloty-text-muted)]">
                  الاسم
                </dt>
                <dd className="mt-1 font-bold text-[var(--sloty-text-primary)]">
                  {getPlatformUserDisplayName(user)}
                </dd>
              </div>
              <div>
                <dt className="font-black text-[var(--sloty-text-muted)]">
                  اسم المستخدم
                </dt>
                <dd className="mt-1 font-bold text-[var(--sloty-text-primary)]">
                  @{user.username}
                </dd>
              </div>
              <div>
                <dt className="font-black text-[var(--sloty-text-muted)]">
                  رقم الهاتف
                </dt>
                <dd className="mt-1 font-bold text-[var(--sloty-text-primary)]">
                  {user.phone_number ?? 'غير متاح'}
                </dd>
              </div>
              <div>
                <dt className="font-black text-[var(--sloty-text-muted)]">
                  البريد الإلكتروني
                </dt>
                <dd className="mt-1 font-bold text-[var(--sloty-text-primary)]">
                  {user.email ?? 'غير متاح'}
                </dd>
              </div>
              <div>
                <dt className="font-black text-[var(--sloty-text-muted)]">
                  حالة الحساب
                </dt>
                <dd className="mt-1 font-bold text-[var(--sloty-text-primary)]">
                  {getPlatformUserStatusLabel(user.is_active)}
                </dd>
              </div>
              <div>
                <dt className="font-black text-[var(--sloty-text-muted)]">
                  نوع الحساب
                </dt>
                <dd className="mt-1 font-bold text-[var(--sloty-text-primary)]">
                  {getPlatformUserAccountTypeLabel(user)}
                </dd>
              </div>
            </dl>
            {canUpdateAccountStatus ? (
              <div className="flex flex-col gap-2 border-t border-[var(--sloty-border)] pt-4 sm:flex-row">
                {user.is_active === false ? (
                  <AppButton
                    disabled={isUpdatingAccount}
                    onClick={() => setPendingAccountStatus(true)}
                    type="button"
                  >
                    تفعيل الحساب
                  </AppButton>
                ) : (
                  <AppButton
                    disabled={isUpdatingAccount}
                    onClick={() => setPendingAccountStatus(false)}
                    type="button"
                    variant="danger"
                  >
                    تعطيل الحساب
                  </AppButton>
                )}
              </div>
            ) : null}
          </AppCard>

          <AppCard className="space-y-4">
            <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
              عضويات الأندية
            </h2>
            {memberships.length > 0 ? (
              <div className="grid gap-3">
                {memberships.map((membership, index) => (
                  <div
                    className="rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-4"
                    key={`${membership.membership_id ?? index}-${membership.club_slug ?? ''}`}
                  >
                    <dl className="grid gap-3 text-sm md:grid-cols-2">
                      <div>
                        <dt className="font-black text-[var(--sloty-text-muted)]">
                          اسم النادي
                        </dt>
                        <dd className="mt-1 font-bold text-[var(--sloty-text-primary)]">
                          {membership.club_name ?? 'غير متاح'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-black text-[var(--sloty-text-muted)]">
                          الدور
                        </dt>
                        <dd className="mt-1 font-bold text-[var(--sloty-text-primary)]">
                          {membership.role
                            ? roleLabels[membership.role]
                            : 'غير متاح'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-black text-[var(--sloty-text-muted)]">
                          الملعب
                        </dt>
                        <dd className="mt-1 font-bold text-[var(--sloty-text-primary)]">
                          {membership.court_name ?? 'غير متاح'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-black text-[var(--sloty-text-muted)]">
                          حالة العضوية
                        </dt>
                        <dd className="mt-1 font-bold text-[var(--sloty-text-primary)]">
                          {getPlatformUserStatusLabel(
                            membership.membership_is_active,
                          )}
                        </dd>
                      </div>
                    </dl>
                    {membership.role ? (
                      <div className="mt-4">
                        <UserPermissions
                          user={toClubUserShape(membership, user)}
                        />
                      </div>
                    ) : null}
                    {membership.role === 'MANAGER' &&
                    membership.club_slug &&
                    membership.membership_id ? (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <AppButton
                          onClick={() => openManagerPermissionEditor(membership)}
                          type="button"
                          variant="secondary"
                        >
                          تعديل صلاحيات العضوية
                        </AppButton>
                      </div>
                    ) : null}
                    {membership.club_slug && membership.membership_id ? (
                      <div className="mt-4">
                        <AppButton
                          disabled={
                            updatingMembershipId === membership.membership_id
                          }
                          onClick={() =>
                            void handleUpdateMembershipActivity(
                              membership,
                              membership.membership_is_active === false,
                            )
                          }
                          type="button"
                          variant={
                            membership.membership_is_active === false
                              ? 'primary'
                              : 'secondary'
                          }
                        >
                          {updatingMembershipId === membership.membership_id
                            ? 'جاري تحديث العضوية...'
                            : membership.membership_is_active === false
                              ? 'تفعيل العضوية'
                              : 'تعطيل العضوية'}
                        </AppButton>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
                لا توجد عضويات مرتبطة بهذا الحساب.
              </p>
            )}
          </AppCard>
        </>
      ) : null}

      {editingMembership && user ? (
        <EditManagerPermissionsDialog
          fieldErrors={permissionsFieldErrors}
          generalError={permissionsError}
          identity={`${getPlatformUserDisplayName(user)} · ${editingMembership.club_name ?? 'نادي غير متاح'}`}
          initialValues={getInitialManagerPermissionValues(editingMembership)}
          isSubmitting={isSavingPermissions}
          onClose={() => {
            if (!isSavingPermissions) {
              setEditingMembership(null)
            }
          }}
          onSubmit={handleUpdateManagerPermissions}
        />
      ) : null}

      {pendingAccountStatus !== null ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center">
          <section
            aria-labelledby="account-status-confirm-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] p-4 shadow-[var(--sloty-shadow)]"
            role="dialog"
          >
            <div className="space-y-4">
              <div>
                <h2
                  className="text-lg font-black text-[var(--sloty-text-primary)]"
                  id="account-status-confirm-title"
                >
                  {pendingAccountStatus ? 'تفعيل الحساب؟' : 'تعطيل الحساب؟'}
                </h2>
                <p className="mt-2 text-sm font-bold leading-6 text-[var(--sloty-text-muted)]">
                  {pendingAccountStatus
                    ? 'سيتمكن المستخدم من تسجيل الدخول مرة أخرى بعد التفعيل.'
                    : 'لن يتمكن المستخدم من تسجيل الدخول حتى يتم تفعيل الحساب مرة أخرى.'}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <AppButton
                  disabled={isUpdatingAccount}
                  onClick={() => void handleUpdateAccountStatus(pendingAccountStatus)}
                  type="button"
                  variant={pendingAccountStatus ? 'primary' : 'danger'}
                >
                  {isUpdatingAccount
                    ? 'جاري التحديث...'
                    : pendingAccountStatus
                      ? 'تفعيل الحساب'
                      : 'تعطيل الحساب'}
                </AppButton>
                <AppButton
                  disabled={isUpdatingAccount}
                  onClick={() => setPendingAccountStatus(null)}
                  type="button"
                  variant="secondary"
                >
                  إلغاء
                </AppButton>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
