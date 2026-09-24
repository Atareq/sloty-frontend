import { useState } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { LogoutConfirmationSheet } from '../LogoutConfirmationSheet/LogoutConfirmationSheet'

/**
 * Screen for authenticated accounts that do not have an operational role (e.g. PLAYER, null, or unsupported role).
 */
export function NoOperationalAccessPage() {
  const { isOperational, logout } = useAuth()
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // If an operational user reaches this page, send them back to the app
  if (isOperational) {
    return <Navigate replace to="/" />
  }

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true)
    await logout()
  }

  return (
    <main className="min-h-screen bg-[var(--sloty-bg)] px-4 py-6 text-right sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <PageHeader
          showMenuButton={false}
          title="لوحة الإدارة"
        />

        <AppCard className="space-y-5">
          <p className="text-base font-semibold leading-7 text-[var(--sloty-text-primary)]">
            لا يوجد لديك صلاحية لاستخدام لوحة الإدارة
          </p>

          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            هذا الحساب غير مسجل كمدير أو مالك أو موظف في أي ملعب.
          </p>

          <AppButton
            onClick={() => setIsConfirmationOpen(true)}
            variant="secondary"
          >
            تسجيل الخروج
          </AppButton>
        </AppCard>
      </div>

      <LogoutConfirmationSheet
        isOpen={isConfirmationOpen}
        isSubmitting={isLoggingOut}
        onCancel={() => setIsConfirmationOpen(false)}
        onConfirm={() => {
          void handleLogout()
        }}
      />
    </main>
  )
}
