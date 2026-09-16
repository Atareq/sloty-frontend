import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { isApiClientError } from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageActions } from '../../../shared/components/PageActions/PageActions'
import { appRoutes } from '../../../shared/navigation/appRoutes'
import {
  getPlatformUserDisplayName,
  getPlatformUserRoleLabel,
  getPlatformUserStatusLabel,
} from '../adminUsers.display'
import { getAdminUserErrorMessage } from '../adminUsers.errors'
import type { PlatformUser } from '../adminUsers.types'
import { getPlatformUser, updatePlatformUser } from '../adminUsersApi'

export function AdminUserDetailsPage() {
  const { userId } = useParams()
  const { refreshCurrentUser } = useAuth()
  const [user, setUser] = useState<PlatformUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [reloadKey, setReloadKey] = useState(0)
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false)
  const [pendingAccountStatus, setPendingAccountStatus] = useState<
    boolean | null
  >(null)

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
      } catch (caughtError) {
        if (isActive) {
          setError(
            getAdminUserErrorMessage(caughtError, 'تعذر تحميل تفاصيل المستخدم'),
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
    } catch (caughtError) {
      setError(
        getAdminUserErrorMessage(caughtError, 'تعذر تحديث حالة الحساب'),
      )

      if (isApiClientError(caughtError) && caughtError.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setIsUpdatingAccount(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageActions>
        <Link to={appRoutes.adminUsers}>
          <AppButton variant="secondary">رجوع للمستخدمين</AppButton>
        </Link>
      </PageActions>

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
                {user.email || 'غير متاح'}
              </dd>
            </div>
            <div>
              <dt className="font-black text-[var(--sloty-text-muted)]">
                الدور
              </dt>
              <dd className="mt-1 font-bold text-[var(--sloty-text-primary)]">
                {getPlatformUserRoleLabel(user.profile_role)}
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
            {user.created_by ? (
              <div>
                <dt className="font-black text-[var(--sloty-text-muted)]">
                  تم الإنشاء بواسطة
                </dt>
                <dd className="mt-1 font-bold text-[var(--sloty-text-primary)]">
                  #{user.created_by}
                </dd>
              </div>
            ) : null}
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
      ) : null}

      {pendingAccountStatus !== null && user ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
        >
          <AppCard className="w-full max-w-md space-y-4">
            <h3 className="text-lg font-black text-[var(--sloty-text-primary)]">
              {pendingAccountStatus ? 'تأكيد تفعيل الحساب' : 'تأكيد تعطيل الحساب'}
            </h3>
            <p className="text-sm text-[var(--sloty-text-muted)]">
              {pendingAccountStatus
                ? `هل أنت متأكد من رغبتك في تفعيل حساب "${getPlatformUserDisplayName(user)}"`
                : `هل أنت متأكد من رغبتك في تعطيل حساب "${getPlatformUserDisplayName(user)}"`}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AppButton
                disabled={isUpdatingAccount}
                onClick={() => setPendingAccountStatus(null)}
                type="button"
                variant="secondary"
              >
                إلغاء
              </AppButton>
              <AppButton
                disabled={isUpdatingAccount}
                onClick={() => void handleUpdateAccountStatus(pendingAccountStatus)}
                type="button"
                variant={pendingAccountStatus ? 'primary' : 'danger'}
              >
                {isUpdatingAccount
                  ? 'جاري التحديث...'
                  : pendingAccountStatus
                    ? 'تفعيل'
                    : 'تعطيل'}
              </AppButton>
            </div>
          </AppCard>
        </div>
      ) : null}
    </div>
  )
}
