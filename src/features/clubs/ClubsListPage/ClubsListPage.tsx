import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageActions } from '../../../shared/components/PageActions/PageActions'
import { appRoutes } from '../../../shared/navigation/appRoutes'
import { buildPathWithQuery } from '../../../shared/utils/buildPathWithQuery'
import { fetchEgyptLocations } from '../../locations/egyptLocationsApi'
import {
  getCityLabel,
  getGovernorateLabel,
} from '../../locations/egyptLocations.helpers'
import type { EgyptLocationsResponse } from '../../locations/egyptLocations.types'
import { listClubs } from '../clubsApi'
import type { Club } from '../clubs.types'

/**
 * Platform-admin club setup entry point.
 *
 * This screen lists the current clubs only; ownership, memberships, and booking
 * workflows intentionally stay outside Sprint 2A.
 */
export function ClubsListPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [locations, setLocations] = useState<EgyptLocationsResponse | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    async function loadClubs(): Promise<void> {
      setIsLoading(true)
      setError(null)

      try {
        const [clubsResponse, locationsResponse] = await Promise.all([
          listClubs(),
          fetchEgyptLocations().catch(() => null),
        ])

        if (isActive) {
          setClubs(clubsResponse.results)
          setLocations(locationsResponse)
        }
      } catch (error) {
        if (isActive) {
          setError(getApiErrorMessage(error, 'تعذر تحميل قائمة الأندية'))
          setLocations(null)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadClubs()

    return () => {
      isActive = false
    }
  }, [])

  return (
    <div className="space-y-5">
      <PageActions>
        <Link to="/admin/clubs/new">
          <AppButton>إضافة نادي</AppButton>
        </Link>
      </PageActions>

      {isLoading ? (
        <AppCard>
          <p className="text-sm text-[var(--sloty-text-muted)]">
            جاري تحميل الأندية...
          </p>
        </AppCard>
      ) : null}

      {error ? (
        <AppCard>
          <p className="text-sm font-semibold text-[var(--sloty-danger)]">
            {error}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && clubs.length === 0 ? (
        <AppCard>
          <p className="text-sm text-[var(--sloty-text-muted)]">
            لا توجد أندية حتى الآن.
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && clubs.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {clubs.map((club) => (
            <AppCard className="space-y-4" key={club.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
                    {club.name}
                  </h2>
                  <p className="text-xs font-semibold text-[var(--sloty-text-muted)]">
                    {club.slug}
                  </p>
                  <p className="text-sm text-[var(--sloty-text-muted)]">
                    {[
                      club.governorate
                        ? getGovernorateLabel(locations, club.governorate)
                        : '',
                      club.governorate
                        ? getCityLabel(locations, club.governorate, club.city)
                        : club.city,
                    ]
                      .filter(Boolean)
                      .join(' - ')}
                  </p>
                </div>
                <span
                  className={[
                    'w-fit rounded-full px-3 py-1 text-xs font-bold',
                    club.is_active
                      ? 'bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]'
                      : 'bg-slate-100 text-slate-600',
                  ].join(' ')}
                >
                  {club.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link className="sm:w-auto" to={`/admin/clubs/${club.id}`}>
                  <AppButton fullWidth variant="secondary">
                    تعديل النادي
                  </AppButton>
                </Link>
                <Link to={`/admin/clubs/${club.slug}/courts`}>
                  <AppButton fullWidth variant="secondary">
                    الملاعب
                  </AppButton>
                </Link>
                <Link
                  to={buildPathWithQuery(appRoutes.adminUsers, {
                    club: club.id,
                  })}
                >
                  <AppButton fullWidth variant="secondary">
                    المستخدمون
                  </AppButton>
                </Link>
              </div>
            </AppCard>
          ))}
        </div>
      ) : null}
    </div>
  )
}
