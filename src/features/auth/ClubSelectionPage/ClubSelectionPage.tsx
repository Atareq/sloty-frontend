import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '../../../core/auth/useAuth'
import type { Club } from '../../clubs/clubs.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'

function formatOptionalValue(value: string | undefined): string {
  return value?.trim() || 'غير محدد'
}

/**
 * Lets authenticated users choose which accessible club they want to work in.
 */
export function ClubSelectionPage() {
  const navigate = useNavigate()
  const { accessibleClubs, currentUser, role, selectClub } = useAuth()

  useEffect(() => {
    if (!currentUser || role === 'ADMIN') {
      return
    }

    if (accessibleClubs.length === 1) {
      selectClub(accessibleClubs[0].slug)
      navigate('/schedule', { replace: true })
    }
  }, [accessibleClubs, currentUser, navigate, role, selectClub])

  if (!currentUser) {
    return <p className="p-4 text-sm font-semibold">جاري تحميل الجلسة...</p>
  }

  if (role === 'ADMIN') {
    return <Navigate replace to="/admin/clubs" />
  }

  if (accessibleClubs.length === 0) {
    return <Navigate replace to="/no-club-access" />
  }

  function handleSelectClub(club: Club): void {
    selectClub(club.slug)
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
          {accessibleClubs.map((club) => (
            <AppCard className="flex flex-col gap-4" key={club.id}>
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-bold text-[var(--sloty-text-primary)]">
                    {club.name}
                  </h2>
                  <p className="text-sm text-[var(--sloty-text-muted)]">
                    {club.slug}
                  </p>
                </div>

                <dl className="grid gap-3 text-sm text-[var(--sloty-text-muted)] sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-[var(--sloty-text-primary)]">
                      المحافظة
                    </dt>
                    <dd>{formatOptionalValue(club.governorate)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--sloty-text-primary)]">
                      المدينة
                    </dt>
                    <dd>{formatOptionalValue(club.city)}</dd>
                  </div>
                  {club.address ? (
                    <div className="sm:col-span-2">
                      <dt className="font-semibold text-[var(--sloty-text-primary)]">
                        العنوان
                      </dt>
                      <dd>{formatOptionalValue(club.address)}</dd>
                    </div>
                  ) : null}
                  {club.phone_number ? (
                    <div>
                      <dt className="font-semibold text-[var(--sloty-text-primary)]">
                        رقم الهاتف
                      </dt>
                      <dd dir="ltr" className="text-right">
                        {formatOptionalValue(club.phone_number)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <AppButton
                className="mt-auto"
                fullWidth
                onClick={() => handleSelectClub(club)}
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
