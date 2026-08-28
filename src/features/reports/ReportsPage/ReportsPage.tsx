import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { AppSelect } from '../../../shared/components/AppSelect/AppSelect'
import { buildPathWithQuery } from '../../../shared/utils/buildPathWithQuery'
import type { QueryParamValue } from '../../../shared/utils/buildPathWithQuery'
import {
  getClubUserDisplayName,
  getCourtDisplayName,
} from '../../../shared/utils/displayNames'
import { bookingStatusCopy } from '../../../shared/copy/appCopy'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { formatMoneyAmount } from '../../../shared/utils/money'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import type { ClubUser } from '../../clubUsers/clubUsers.types'
import { listCourts } from '../../courts/courtsApi'
import { getCourtUsageReport } from '../reportsApi'
import type {
  CourtUsageReport,
  CourtUsageReportPeriod,
  CourtUsageReportQueryParams,
  CourtUsageReportStatus,
  DemandHour,
  FinancialTotals,
  UsageMetrics,
} from '../reports.types'

interface FilterState {
  date_from: string
  date_to: string
  court: string
  period: CourtUsageReportPeriod
  hour_from: string
  hour_to: string
  staff: string
  status: CourtUsageReportStatus | ''
}

interface FilterOption {
  value: string
  label: string
}

const defaultFilters: FilterState = {
  date_from: '',
  date_to: '',
  court: '',
  period: 'all_day',
  hour_from: '',
  hour_to: '',
  staff: '',
  status: '',
}

const periodOptions: Array<{ value: CourtUsageReportPeriod; label: string }> = [
  { value: 'all_day', label: 'كل اليوم' },
  { value: 'daytime', label: 'صباحي / نهاري' },
  { value: 'evening', label: 'مسائي' },
  { value: 'custom', label: 'فترة مخصصة' },
]

const reportStatusOptions: Array<{
  value: CourtUsageReportStatus | ''
  label: string
}> = [
  { value: '', label: 'الحالة الافتراضية' },
  { value: 'HOLD', label: 'بانتظار العربون' },
  { value: 'CONFIRMED', label: bookingStatusCopy.CONFIRMED },
  { value: 'COMPLETED', label: bookingStatusCopy.COMPLETED },
  { value: 'NO_SHOW', label: 'عدم حضور' },
]

const reportStatusLabels: Record<CourtUsageReportStatus, string> = {
  HOLD: bookingStatusCopy.HOLD,
  CONFIRMED: bookingStatusCopy.CONFIRMED,
  COMPLETED: bookingStatusCopy.COMPLETED,
  NO_SHOW: bookingStatusCopy.NO_SHOW,
}

function getPeriodLabel(period: CourtUsageReportPeriod): string {
  return (
    periodOptions.find((option) => option.value === period)?.label ?? period
  )
}

function getStatusLabel(status: string): string {
  return reportStatusLabels[status as CourtUsageReportStatus] ?? status
}

function getFiltersFromSearch(search: string): FilterState {
  const query = toQueryObject(search)
  const period = periodOptions.some((option) => option.value === query.period)
    ? (query.period as CourtUsageReportPeriod)
    : 'all_day'
  const status = reportStatusOptions.some(
    (option) => option.value === query.status,
  )
    ? (query.status as CourtUsageReportStatus | '')
    : ''

  return {
    ...defaultFilters,
    date_from: query.date_from ?? '',
    date_to: query.date_to ?? '',
    court: query.court ?? '',
    period,
    hour_from: period === 'custom' ? (query.hour_from ?? '') : '',
    hour_to: period === 'custom' ? (query.hour_to ?? '') : '',
    staff: query.staff ?? '',
    status,
  }
}

function buildReportParams(
  filters: FilterState,
): CourtUsageReportQueryParams {
  return {
    date_from: filters.date_from,
    date_to: filters.date_to,
    ...(filters.court ? { court: filters.court } : {}),
    period: filters.period,
    ...(filters.period === 'custom' && filters.hour_from
      ? { hour_from: filters.hour_from }
      : {}),
    ...(filters.period === 'custom' && filters.hour_to
      ? { hour_to: filters.hour_to }
      : {}),
    ...(filters.staff ? { staff: filters.staff } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  }
}

function buildReportsSearch(filters: FilterState): string {
  const query: Record<string, QueryParamValue> = {
    date_from: filters.date_from,
    date_to: filters.date_to,
    court: filters.court,
    period: filters.period,
    hour_from: filters.period === 'custom' ? filters.hour_from : '',
    hour_to: filters.period === 'custom' ? filters.hour_to : '',
    staff: filters.staff,
    status: filters.status,
  }

  return buildPathWithQuery('', query)
}

function normalizeClubUsersResponse(
  response: ClubUser[] | { results: ClubUser[] },
): ClubUser[] {
  return Array.isArray(response) ? response : response.results
}

function hasRequiredReportDates(filters: FilterState): boolean {
  return Boolean(filters.date_from && filters.date_to)
}

function validateFilters(filters: FilterState): string | null {
  if (!filters.date_from) {
    return 'من تاريخ مطلوب'
  }

  if (!filters.date_to) {
    return 'إلى تاريخ مطلوب'
  }

  if (
    filters.period === 'custom' &&
    (!filters.hour_from || !filters.hour_to)
  ) {
    return 'يجب تحديد بداية ونهاية الفترة المخصصة'
  }

  return null
}

function KpiCard({
  dir = 'rtl',
  label,
  value,
}: {
  dir?: 'ltr' | 'rtl'
  label: string
  value: number | string
}) {
  return (
    <AppCard className="space-y-2">
      <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
        {label}
      </p>
      <p
        className="text-xl font-black text-[var(--sloty-primary-dark)]"
        dir={dir}
      >
        {value}
      </p>
    </AppCard>
  )
}

function FinancialRows({ financial }: { financial: FinancialTotals }) {
  return (
    <>
      <MetricRow
        label="إجمالي قيمة الحجوزات"
        value={formatMoneyAmount(financial.total_booking_value)}
      />
      <MetricRow
        label="إجمالي المدفوع"
        value={formatMoneyAmount(financial.total_paid_amount)}
      />
      <MetricRow
        label="إجمالي المتبقي"
        value={formatMoneyAmount(financial.total_remaining_amount)}
      />
    </>
  )
}

function MetricRow({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm">
      <dt className="font-bold text-[var(--sloty-text-muted)]">{label}</dt>
      <dd className="font-black text-[var(--sloty-text-primary)]" dir="ltr">
        {value}
      </dd>
    </div>
  )
}

function UsageRows({ usage }: { usage: UsageMetrics }) {
  return (
    <>
      <MetricRow label="عدد الحجوزات" value={usage.booking_count} />
      <MetricRow label="دقائق مشغولة" value={usage.occupied_minutes} />
      <MetricRow label="دقائق متاحة" value={usage.available_minutes} />
      <MetricRow label="نسبة الإشغال" value={usage.utilization_percentage} />
    </>
  )
}

function StatusCounts({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts)

  if (entries.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([status, count]) => (
        <span
          className="rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]"
          key={status}
        >
          {getStatusLabel(status)}: {count}
        </span>
      ))}
    </div>
  )
}

function DemandHoursSection({
  emptyMessage,
  hours,
  title,
}: {
  emptyMessage: string
  hours: DemandHour[]
  title: string
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
        {title}
      </h2>
      {hours.length === 0 ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            {emptyMessage}
          </p>
        </AppCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {hours.map((hour) => (
            <AppCard className="space-y-3" key={`${hour.hour_from}-${hour.hour_to}`}>
              <p className="text-sm font-black text-[var(--sloty-text-primary)]" dir="ltr">
                {hour.hour_from} - {hour.hour_to}
              </p>
              <dl className="space-y-2">
                <MetricRow label="عدد الحجوزات" value={hour.booking_count} />
                <MetricRow
                  label="نسبة الإشغال"
                  value={hour.utilization_percentage}
                />
              </dl>
            </AppCard>
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * Court Usage Report page backed by the dedicated backend analytics endpoint.
 */
export function ReportsPage() {
  const { role, selectedClubSlug } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const filtersFromSearch = useMemo(
    () => getFiltersFromSearch(location.search),
    [location.search],
  )
  const [filters, setFilters] = useState<FilterState>(filtersFromSearch)
  const [courtOptions, setCourtOptions] = useState<FilterOption[]>([])
  const [staffOptions, setStaffOptions] = useState<FilterOption[]>([])
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(
    null,
  )
  const [report, setReport] = useState<CourtUsageReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const canViewReports =
    role === 'PLATFORM_ADMIN' || role === 'OWNER' || role === 'MANAGER'

  useEffect(() => {
    if (!selectedClubSlug || !canViewReports) {
      return
    }

    let isActive = true
    const clubSlug = selectedClubSlug

    void Promise.resolve().then(async () => {
      setFilterOptionsError(null)

      const [courtsResult, usersResult] = await Promise.allSettled([
          listCourts(clubSlug),
          listClubUsers(clubSlug, { is_active: true }),
      ])

      if (!isActive) {
        return
      }

      if (courtsResult.status === 'fulfilled') {
        setCourtOptions(
          courtsResult.value.results
            .filter((court) => court.is_active)
            .map((court) => ({
              value: String(court.id),
              label: getCourtDisplayName(court),
            })),
        )
      } else {
        setCourtOptions([])
        setFilterOptionsError('تعذر تحميل خيارات الفلاتر')
      }

      if (usersResult.status === 'fulfilled') {
        setStaffOptions(
          normalizeClubUsersResponse(usersResult.value).map((clubUser) => ({
            value: String(clubUser.id),
            label: getClubUserDisplayName(clubUser),
          })),
        )
      } else {
        setStaffOptions([])
        setFilterOptionsError('تعذر تحميل خيارات الموظفين')
      }
    })

    return () => {
      isActive = false
    }
  }, [canViewReports, selectedClubSlug])

  useEffect(() => {
    if (
      !selectedClubSlug ||
      !canViewReports ||
      !hasRequiredReportDates(filtersFromSearch)
    ) {
      return
    }

    let isActive = true
    const clubSlug = selectedClubSlug
    const params = buildReportParams(filtersFromSearch)

    void Promise.resolve().then(async () => {
      setIsLoading(true)
      setError(null)
      setValidationError(null)

      try {
        const response = await getCourtUsageReport(clubSlug, params)

        if (isActive) {
          setReport(response)
        }
      } catch (error) {
        if (isActive) {
          setReport(null)
          setError(getApiErrorMessage(error, 'تعذر تحميل التقرير'))
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    })

    return () => {
      isActive = false
    }
  }, [canViewReports, filtersFromSearch, selectedClubSlug])

  function updateFilter<K extends keyof FilterState>(
    field: K,
    value: FilterState[K],
  ): void {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === 'period' && value !== 'custom'
        ? { hour_from: '', hour_to: '' }
        : {}),
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const nextValidationError = validateFilters(filters)

    if (nextValidationError) {
      setValidationError(nextValidationError)
      return
    }

    setValidationError(null)
    navigate({
      pathname: location.pathname,
      search: buildReportsSearch(filters),
    })
  }

  const shouldShowCourtFallbackOption =
    Boolean(filters.court) &&
    !courtOptions.some((option) => option.value === filters.court)
  const shouldShowStaffFallbackOption =
    Boolean(filters.staff) &&
    !staffOptions.some((option) => option.value === filters.staff)

  return (
    <div className="space-y-5">
      {!selectedClubSlug ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            اختر ناديًا أولًا لعرض التقارير
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug && !canViewReports ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-danger)]">
            ليس لديك صلاحية عرض التقارير
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug && canViewReports ? (
        <>
          <AppCard>
            {filterOptionsError ? (
              <p className="mb-3 text-xs font-bold text-[var(--sloty-danger)]">
                {filterOptionsError}
              </p>
            ) : null}
            <form
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
              onSubmit={handleSubmit}
            >
              <label className="space-y-2 text-sm font-semibold">
                <span>من تاريخ</span>
                <input
                  className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
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
                  className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) =>
                    updateFilter('date_to', event.target.value)
                  }
                  type="date"
                  value={filters.date_to}
                />
              </label>
              <AppSelect
                label="الملعب"
                onChange={(value) => updateFilter('court', value)}
                options={[
                  { value: '', label: 'كل الملاعب' },
                  ...(shouldShowCourtFallbackOption
                    ? [{ value: filters.court, label: `ملعب #${filters.court}` }]
                    : []),
                  ...courtOptions,
                ]}
                value={filters.court}
              />
              <AppSelect
                label="الفترة"
                onChange={(value) =>
                  updateFilter('period', value as CourtUsageReportPeriod)
                }
                options={periodOptions}
                value={filters.period}
              />
              {filters.period === 'custom' ? (
                <>
                  <label className="space-y-2 text-sm font-semibold">
                    <span>من الساعة</span>
                    <input
                      className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                      onChange={(event) =>
                        updateFilter('hour_from', event.target.value)
                      }
                      type="time"
                      value={filters.hour_from}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    <span>إلى الساعة</span>
                    <input
                      className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                      onChange={(event) =>
                        updateFilter('hour_to', event.target.value)
                      }
                      type="time"
                      value={filters.hour_to}
                    />
                  </label>
                </>
              ) : null}
              <AppSelect
                label="الموظف"
                onChange={(value) => updateFilter('staff', value)}
                options={[
                  { value: '', label: 'كل الموظفين' },
                  ...(shouldShowStaffFallbackOption
                    ? [{ value: filters.staff, label: `مستخدم #${filters.staff}` }]
                    : []),
                  ...staffOptions,
                ]}
                value={filters.staff}
              />
              <AppSelect
                label="حالة الحجز"
                onChange={(value) =>
                  updateFilter('status', value as CourtUsageReportStatus | '')
                }
                options={reportStatusOptions}
                value={filters.status}
              />
              <div className="flex items-end">
                <AppButton disabled={isLoading} fullWidth type="submit">
                  عرض التقرير
                </AppButton>
              </div>
            </form>
            {validationError ? (
              <p className="mt-3 text-sm font-bold text-[var(--sloty-danger)]">
                {validationError}
              </p>
            ) : null}
          </AppCard>

          {isLoading ? (
            <AppCard>
              <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                جاري تحميل التقرير...
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

          {report && !isLoading ? (
            <>
              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard label="عدد الحجوزات" value={report.summary.booking_count} />
                <KpiCard label="دقائق مشغولة" value={report.summary.occupied_minutes} />
                <KpiCard label="دقائق متاحة" value={report.summary.available_minutes} />
                <KpiCard
                  label="نسبة الإشغال"
                  value={report.summary.utilization_percentage}
                />
                <KpiCard
                  dir="ltr"
                  label="إجمالي قيمة الحجوزات"
                  value={formatMoneyAmount(
                    report.summary.financial.total_booking_value,
                  )}
                />
                <KpiCard
                  dir="ltr"
                  label="إجمالي المدفوع"
                  value={formatMoneyAmount(
                    report.summary.financial.total_paid_amount,
                  )}
                />
                <KpiCard
                  dir="ltr"
                  label="إجمالي المتبقي"
                  value={formatMoneyAmount(
                    report.summary.financial.total_remaining_amount,
                  )}
                />
              </section>

              <AppCard className="space-y-3">
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  سياق التقرير
                </h2>
                <dl className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <MetricRow label="النادي" value={report.context.club_name} />
                  <MetricRow
                    label="الفترة"
                    value={`${report.context.date_from} - ${report.context.date_to}`}
                  />
                  <MetricRow
                    label="الملعب"
                    value={report.context.court_name ?? 'كل الملاعب'}
                  />
                  <MetricRow
                    label="الموظف"
                    value={report.context.staff_name ?? 'كل الموظفين'}
                  />
                  <MetricRow
                    label="الفترة الزمنية"
                    value={
                      report.context.period === 'custom'
                        ? `${report.context.hour_from ?? '-'} - ${
                            report.context.hour_to ?? '-'
                          }`
                        : getPeriodLabel(report.context.period)
                    }
                  />
                  <MetricRow
                    label="الحالة / الحالات المضمنة"
                    value={
                      report.context.status
                        ? getStatusLabel(report.context.status)
                        : report.context.included_statuses
                            .map(getStatusLabel)
                            .join('، ')
                    }
                  />
                </dl>
              </AppCard>

              <section className="space-y-3">
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  حسب الملعب
                </h2>
                {report.usage_by_court.length === 0 ? (
                  <AppCard>
                    <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                      لا توجد بيانات ملاعب في التقرير
                    </p>
                  </AppCard>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {report.usage_by_court.map((court) => (
                      <AppCard className="space-y-3" key={court.court}>
                        <h3 className="text-sm font-black text-[var(--sloty-text-primary)]">
                          {court.court_name}
                        </h3>
                        <dl className="space-y-2">
                          <UsageRows usage={court} />
                          <FinancialRows financial={court.financial} />
                        </dl>
                        <StatusCounts counts={court.status_counts} />
                      </AppCard>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  حسب اليوم
                </h2>
                {report.usage_by_day.length === 0 ? (
                  <AppCard>
                    <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                      لا توجد بيانات يومية في التقرير
                    </p>
                  </AppCard>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {report.usage_by_day.map((day) => (
                      <AppCard className="space-y-3" key={day.date}>
                        <h3 className="text-sm font-black text-[var(--sloty-text-primary)]">
                          {day.date}
                        </h3>
                        <dl className="space-y-2">
                          <UsageRows usage={day} />
                          <FinancialRows financial={day.financial} />
                        </dl>
                      </AppCard>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  حسب الفترة
                </h2>
                {report.usage_by_period.length === 0 ? (
                  <AppCard>
                    <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                      لا توجد بيانات فترات في التقرير
                    </p>
                  </AppCard>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {report.usage_by_period.map((period) => (
                      <AppCard className="space-y-3" key={period.period}>
                        <h3 className="text-sm font-black text-[var(--sloty-text-primary)]">
                          {getPeriodLabel(period.period)}
                        </h3>
                        <dl className="space-y-2">
                          <UsageRows usage={period} />
                          <MetricRow
                            label="من الساعة"
                            value={period.hour_from ?? '-'}
                          />
                          <MetricRow
                            label="إلى الساعة"
                            value={period.hour_to ?? '-'}
                          />
                        </dl>
                      </AppCard>
                    ))}
                  </div>
                )}
              </section>

              <DemandHoursSection
                emptyMessage="لا توجد ساعات طلب مرتفعة في الفترة المحددة"
                hours={report.peak_hours}
                title="أعلى ساعات الطلب"
              />
              <DemandHoursSection
                emptyMessage="لا توجد ساعات منخفضة الطلب في الفترة المحددة"
                hours={report.low_demand_hours}
                title="أقل ساعات الطلب"
              />

              <section className="space-y-3">
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  نشاط الموظفين
                </h2>
                {report.staff_booking_activity.length === 0 ? (
                  <AppCard>
                    <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                      لا توجد بيانات موظفين في التقرير
                    </p>
                  </AppCard>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {report.staff_booking_activity.map((staff) => (
                      <AppCard className="space-y-3" key={staff.staff}>
                        <h3 className="text-sm font-black text-[var(--sloty-text-primary)]">
                          {staff.staff_name}
                        </h3>
                        <dl className="space-y-2">
                          <MetricRow
                            label="عدد الحجوزات"
                            value={staff.booking_count}
                          />
                          <MetricRow
                            label="دقائق مشغولة"
                            value={staff.occupied_minutes}
                          />
                          <FinancialRows financial={staff.financial} />
                        </dl>
                        <StatusCounts counts={staff.status_counts} />
                      </AppCard>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
