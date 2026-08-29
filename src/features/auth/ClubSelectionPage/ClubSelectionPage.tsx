import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router'
import type { CurrentUserMembership } from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'

const roleLabels: Record<CurrentUserMembership['role'], string> = {
  OWNER: 'مالك',
  MANAGER: 'مدير',
  STAFF: 'موظف ملعب',
}

function formatOptionalValue(value: string | undefined): string {
  return value?.trim() || 'غير محدد'
}

/**
 * Lets authenticated users choose which membership club they want to work in.
 */
export function ClubSelectionPage() {
  const navigate = useNavigate()
  const { currentUser, selectClub } = useAuth()

  useEffect(() => {
    if (!currentUser || currentUser.is_platform_admin) {
      return
    }

    if (currentUser.memberships.length === 1) {
      selectClub(currentUser.memberships[0].club.slug)
      navigate('/schedule', { replace: true })
    }
  }, [currentUser, navigate, selectClub])

  if (!currentUser) {
    return <p className="p-4 text-sm font-semibold">جاري تحميل الجلسة...</p>
  }

  if (currentUser.is_platform_admin) {
    return <Navigate replace to="/admin/clubs" />
  }

  if (currentUser.memberships.length === 0) {
    return <Navigate replace to="/no-club-access" />
  }

  function handleSelectClub(membership: CurrentUserMembership): void {
    selectClub(membership.club.slug)
    navigate('/schedule', { replace: true })
  }

  return (
    <main className="min-h-screen bg-[var(--sloty-bg)] px-4 py-6 text-right sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader
          showMenuButton={false}
          subtitle="اختر النادي الذي تريد العمل عليه"
          title="اختيار النادي"
        />

        <div className="grid gap-4 md:grid-cols-2">
          {currentUser.memberships.map((membership) => (
            <AppCard className="flex flex-col gap-4" key={membership.id}>
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-bold text-[var(--sloty-text-primary)]">
                    {membership.club.name}
                  </h2>
                  <p className="text-sm text-[var(--sloty-text-muted)]">
                    {membership.club.slug}
                  </p>
                </div>

                <dl className="grid gap-3 text-sm text-[var(--sloty-text-muted)] sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-[var(--sloty-text-primary)]">
                      المحافظة
                    </dt>
                    <dd>{formatOptionalValue(membership.club.governorate)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--sloty-text-primary)]">
                      المدينة
                    </dt>
                    <dd>{formatOptionalValue(membership.club.city)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-[var(--sloty-text-primary)]">
                      العنوان
                    </dt>
                    <dd>{formatOptionalValue(membership.club.address)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--sloty-text-primary)]">
                      الدور
                    </dt>
                    <dd>{roleLabels[membership.role]}</dd>
                  </div>
                  {membership.role === 'STAFF' && membership.court ? (
                    <div>
                      <dt className="font-semibold text-[var(--sloty-text-primary)]">
                        الملعب المسؤول عنه
                      </dt>
                      <dd>{membership.court.name}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <AppButton
                className="mt-auto"
                fullWidth
                onClick={() => handleSelectClub(membership)}
              >
                الدخول إلى النادي
              </AppButton>
            </AppCard>
          ))}
        </div>
      </div>
    </main>
  )
}
