import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'

/**
 * Blocks authenticated users who do not currently belong to any active club.
 */
export function NoClubAccessPage() {
  const { logout } = useAuth()

  return (
    <main className="min-h-screen bg-[var(--sloty-bg)] px-4 py-6 text-right sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <PageHeader
          showMenuButton={false}
          subtitle="لا يوجد لديك صلاحية للوصول إلى أي نادي حتى الآن."
          title="لا توجد صلاحية نادي"
        />

        <AppCard className="space-y-5">
          <p className="text-sm leading-7 text-[var(--sloty-text-muted)]">
            لا يوجد لديك صلاحية للوصول إلى أي نادي حتى الآن.
          </p>

          <AppButton onClick={logout} variant="secondary">
            تسجيل الخروج
          </AppButton>
        </AppCard>
      </div>
    </main>
  )
}
