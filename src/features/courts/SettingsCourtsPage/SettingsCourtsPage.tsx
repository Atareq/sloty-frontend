import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import { canManagePricing, canManageWorkingHours } from '../../../core/auth/auth.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { listCourts } from '../courtsApi'
import type { Court } from '../courts.types'

export function SettingsCourtsPage() {
  const { role, selectedClubSlug, selectedMembership } = useAuth()
  const [courts, setCourts] = useState<Court[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canOpenSettings =
    canManagePricing(selectedMembership, role) ||
    canManageWorkingHours(selectedMembership, role)

  useEffect(() => {
    let isActive = true

    async function loadCourts(): Promise<void> {
      if (!selectedClubSlug || !canOpenSettings) {
        setCourts([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await listCourts(selectedClubSlug)

        if (isActive) {
          setCourts(response.results)
        }
      } catch (error) {
        if (isActive) {
          setError(getApiErrorMessage(error, 'تعذر تحميل الملاعب'))
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
  }, [canOpenSettings, selectedClubSlug])

  return (
    <div className="space-y-5">
      <PageHeader
        description="إدارة أسعار ومواعيد عمل ملاعب النادي المحدد"
        tone="brand"
        title="إعدادات الملاعب"
      />

      {!selectedClubSlug ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            اختر ناديًا أولًا لعرض إعدادات الملاعب
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug && !canOpenSettings ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-danger)]">
            ليس لديك صلاحية تعديل مواعيد العمل.
          </p>
        </AppCard>
      ) : null}

      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل الملاعب...
          </p>
        </AppCard>
      ) : null}

      {error ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-danger)]">
            {error}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && courts.length > 0 ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {courts.map((court) => (
            <AppCard className="space-y-3" key={court.id}>
              <div>
                <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
                  {court.name}
                </h2>
                <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                  {court.default_price} جنيه
                </p>
                <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                  الحد الأدنى للعربون: {court.minimum_deposit} جنيه
                </p>
                <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                  مهلة الاسترداد:{' '}
                  {court.cancellation_refund_notice_days === null
                    ? 'بدون مهلة'
                    : `${court.cancellation_refund_notice_days} يوم`}
                </p>
              </div>
              <Link to={`/settings/courts/${court.id}`}>
                <AppButton fullWidth variant="secondary">
                  إدارة الإعدادات
                </AppButton>
              </Link>
            </AppCard>
          ))}
        </section>
      ) : null}
    </div>
  )
}
