import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { listCourts } from '../courtsApi'
import type { Court } from '../courts.types'

/**
 * Court list for a selected club slug.
 *
 * Sprint 2A only lists setup data; schedule, bookings, and working-hours APIs
 * are deliberately not called from this screen.
 */
export function CourtsListPage() {
  const { clubSlug } = useParams()
  const [courts, setCourts] = useState<Court[]>([])
  const [error, setError] = useState<string | null>(
    clubSlug ? null : 'رابط النادي غير صحيح',
  )
  const [isLoading, setIsLoading] = useState(Boolean(clubSlug))

  useEffect(() => {
    if (!clubSlug) {
      return
    }

    let isActive = true
    const currentClubSlug = clubSlug

    async function loadCourts(): Promise<void> {
      setIsLoading(true)
      setError(null)

      try {
        const response = await listCourts(currentClubSlug)

        if (isActive) {
          setCourts(response.results)
        }
      } catch (error) {
        if (isActive) {
          setError(getApiErrorMessage(error, 'تعذر تحميل قائمة الملاعب'))
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadCourts()

    return () => {
      isActive = false
    }
  }, [clubSlug])

  return (
    <div className="space-y-5">
    <PageHeader
      tone="brand"
      actions={
        <div className="grid w-full max-w-sm grid-cols-2 gap-2 sm:flex sm:w-auto sm:max-w-none">
          <Link
            className="min-w-0 sm:w-auto"
            to="/admin/clubs"
          >
            <AppButton fullWidth>
              الأندية
            </AppButton>
          </Link>

          {clubSlug ? (
            <Link
              className="min-w-0 sm:w-auto"
              to={`/admin/clubs/${clubSlug}/courts/new`}
            >
              <AppButton fullWidth variant="secondary">
                إضافة ملعب
              </AppButton>
            </Link>
          ) : null}
        </div>
      }
      description={clubSlug ? `ملاعب النادي: ${clubSlug}` : undefined}
      title="إدارة الملاعب"
    />
      {isLoading ? (
        <AppCard>
          <p className="text-sm text-[var(--sloty-text-muted)]">
            جاري تحميل الملاعب...
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

      {!isLoading && !error && courts.length === 0 ? (
        <AppCard>
          <p className="text-sm text-[var(--sloty-text-muted)]">
            لا توجد ملاعب لهذا النادي حتى الآن.
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && courts.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {courts.map((court) => (
            <AppCard className="space-y-4" key={court.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
                    {court.name}
                  </h2>
                  <p className="text-sm text-[var(--sloty-text-muted)]">
                    {court.sport_type} - {court.slot_duration_minutes} دقيقة
                  </p>
                  <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
                    {court.default_price} جنيه
                  </p>
                </div>
                <span
                  className={[
                    'w-fit rounded-full px-3 py-1 text-xs font-bold',
                    court.is_active
                      ? 'bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]'
                      : 'bg-slate-100 text-slate-600',
                  ].join(' ')}
                >
                  {court.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>

              <p className="text-sm text-[var(--sloty-text-muted)]">
                مرجع الدفع الرقمي:{' '}
                {court.requires_digital_payment_reference ? 'مطلوب' : 'غير مطلوب'}
              </p>

              {clubSlug ? (
                <Link to={`/admin/clubs/${clubSlug}/courts/${court.id}`}>
                  <AppButton fullWidth variant="secondary">
                    تعديل الملعب
                  </AppButton>
                </Link>
              ) : null}
            </AppCard>
          ))}
        </div>
      ) : null}
    </div>
  )
}
