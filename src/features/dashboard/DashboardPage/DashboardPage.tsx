import { useEffect, useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { DashboardMetricCard } from '../components/DashboardMetricCard/DashboardMetricCard'
import { DashboardRecentActivity } from '../components/DashboardRecentActivity/DashboardRecentActivity'
import { getDashboardSummary } from '../dashboardApi'
import type { DashboardQueryParams, DashboardSummary } from '../dashboard.types'

interface FilterState {
  date_from: string
  date_to: string
}

const initialFilters: FilterState = {
  date_from: '',
  date_to: '',
}

function buildParams(filters: FilterState): DashboardQueryParams {
  return {
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
  }
}

/**
 * Backend-calculated operational dashboard for the selected club.
 */
export function DashboardPage() {
  const { role, selectedClubSlug, selectedMembership } = useAuth()
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedClubName = selectedMembership?.club.name ?? null
  const canViewFinancialSummary = role === 'OWNER' || role === 'MANAGER'

  async function loadSummary(params: DashboardQueryParams = {}): Promise<void> {
    if (!selectedClubSlug || !canViewFinancialSummary) {
      setSummary(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setSummary(await getDashboardSummary(selectedClubSlug, params))
    } catch (error) {
      setSummary(null)
      setError(getApiErrorMessage(error, 'تعذر تحميل ملخص لوحة التحكم'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedClubSlug || !canViewFinancialSummary) {
      return
    }

    let isActive = true
    const clubSlug = selectedClubSlug

    async function loadInitialSummary(): Promise<void> {
      try {
        const response = await getDashboardSummary(clubSlug, {})

        if (isActive) {
          setSummary(response)
        }
      } catch (error) {
        if (isActive) {
          setSummary(null)
          setError(getApiErrorMessage(error, 'تعذر تحميل ملخص لوحة التحكم'))
        }
      }
    }

    void loadInitialSummary()

    return () => {
      isActive = false
    }
  }, [canViewFinancialSummary, selectedClubSlug])

  function updateFilter(field: keyof FilterState, value: string): void {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void loadSummary(buildParams(filters))
  }

  return (
    <div className="space-y-5">
      <PageHeader
        description={
          selectedClubName
            ? `ملخص الحجوزات والمدفوعات داخل ${selectedClubName}`
            : 'ملخص الحجوزات والمدفوعات داخل النادي المحدد'
        }
        tone="brand"
        title="لوحة التحكم"
      />

      {!selectedClubSlug ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            اختر ناديًا أولًا لعرض لوحة التحكم
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug ? (
        !canViewFinancialSummary ? (
          <AppCard>
            <p className="text-sm font-bold text-[var(--sloty-danger)]">
              ليس لديك صلاحية عرض لوحة التحكم
            </p>
          </AppCard>
        ) : (
        <>
          <AppCard>
            <form className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
              <label className="space-y-2 text-sm font-semibold">
                <span>من تاريخ</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) =>
                    updateFilter('date_from', event.target.value)
                  }
                  type="date"
                  value={filters.date_from}
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>إلى تاريخ</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) =>
                    updateFilter('date_to', event.target.value)
                  }
                  type="date"
                  value={filters.date_to}
                />
              </label>
              <div className="flex items-end">
                <AppButton disabled={isLoading} fullWidth type="submit">
                  تحديث الملخص
                </AppButton>
              </div>
            </form>
          </AppCard>

          {isLoading ? (
            <AppCard>
              <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                جاري تحميل الملخص...
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

          {summary && !isLoading ? (
            <>
              <section className="space-y-3">
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  الحجوزات
                </h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                  <DashboardMetricCard
                    label="حجوزات اليوم"
                    value={summary.bookings?.today}
                  />
                  <DashboardMetricCard
                    label="حجوزات الأسبوع"
                    value={summary.bookings?.week}
                  />
                  <DashboardMetricCard
                    label="مؤكدة"
                    value={summary.bookings?.confirmed}
                  />
                  <DashboardMetricCard
                    label="مكتملة"
                    value={summary.bookings?.completed}
                  />
                  <DashboardMetricCard
                    label="ملغية"
                    value={summary.bookings?.cancelled}
                  />
                  <DashboardMetricCard
                    label="عدم حضور"
                    value={summary.bookings?.no_show}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  المدفوعات والتسويات
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <DashboardMetricCard
                    label="المدفوع"
                    suffix="جنيه"
                    value={summary.payments?.paid_amount}
                  />
                  <DashboardMetricCard
                    label="المتبقي"
                    suffix="جنيه"
                    value={summary.payments?.remaining_amount}
                  />
                  <DashboardMetricCard
                    label="المدفوعات الملغية"
                    suffix="جنيه"
                    value={summary.payments?.cancelled_amount}
                  />
                  <DashboardMetricCard
                    label="غير مسوى"
                    suffix="جنيه"
                    value={summary.settlements?.unsettled_amount}
                  />
                  <DashboardMetricCard
                    label="تمت تسويته"
                    suffix="جنيه"
                    value={summary.settlements?.settled_amount}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  الملاعب
                </h2>
                {summary.courts && summary.courts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {summary.courts.map((court) => (
                      <AppCard className="space-y-2" key={court.id}>
                        <p className="text-sm font-black text-[var(--sloty-text-primary)]">
                          {court.name}
                        </p>
                        <dl className="grid grid-cols-1 gap-2 text-sm">
                          <div className="flex items-center justify-between rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                            <dt className="font-bold text-[var(--sloty-text-muted)]">
                              الحجوزات
                            </dt>
                            <dd className="font-black">
                              {court.bookings_count ?? '-'}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                            <dt className="font-bold text-[var(--sloty-text-muted)]">
                              الإيراد
                            </dt>
                            <dd className="font-black" dir="ltr">
                              {court.revenue ?? court.paid_amount ?? '-'}
                            </dd>
                          </div>
                        </dl>
                      </AppCard>
                    ))}
                  </div>
                ) : (
                  <AppCard>
                    <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                      لا توجد بيانات ملاعب في الملخص
                    </p>
                  </AppCard>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  النشاط الأخير
                </h2>
                <DashboardRecentActivity
                  activities={summary.recent_activity ?? []}
                />
              </section>
            </>
          ) : null}
        </>
        )
      ) : null}
    </div>
  )
}
