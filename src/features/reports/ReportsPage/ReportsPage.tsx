import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { paymentMethodLabels, type PaymentMethod } from '../../transactions/transactions.types'
import { ReportsBreakdownList } from '../components/ReportsBreakdownList/ReportsBreakdownList'
import { ReportsTotalsCard } from '../components/ReportsTotalsCard/ReportsTotalsCard'
import { getReports } from '../reportsApi'
import type { ReportsQueryParams, ReportsResponse } from '../reports.types'

interface FilterState {
  date_from: string
  date_to: string
  court: string
  staff: string
  status: string
  payment_method: PaymentMethod | ''
}

const initialFilters: FilterState = {
  date_from: '',
  date_to: '',
  court: '',
  staff: '',
  status: '',
  payment_method: '',
}

const statusOptions = [
  { value: '', label: 'كل الحالات' },
  { value: 'CONFIRMED', label: 'مؤكد' },
  { value: 'COMPLETED', label: 'مكتمل' },
  { value: 'CANCELLED', label: 'ملغي' },
  { value: 'NO_SHOW', label: 'عدم حضور' },
]

const paymentMethodOptions: Array<{ value: PaymentMethod | ''; label: string }> = [
  { value: '', label: 'كل طرق الدفع' },
  { value: 'CASH', label: paymentMethodLabels.CASH },
  { value: 'DIGITAL_WALLET', label: paymentMethodLabels.DIGITAL_WALLET },
  { value: 'BANK_TRANSFER', label: paymentMethodLabels.BANK_TRANSFER },
  { value: 'OTHER', label: paymentMethodLabels.OTHER },
]

function buildParams(filters: FilterState): ReportsQueryParams {
  return {
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(filters.court.trim() ? { court: filters.court.trim() } : {}),
    ...(filters.staff.trim() ? { staff: filters.staff.trim() } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.payment_method
      ? { payment_method: filters.payment_method }
      : {}),
  }
}

/**
 * Read-only backend-calculated reports for owners.
 */
export function ReportsPage() {
  const { role, selectedClubSlug } = useAuth()
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [report, setReport] = useState<ReportsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canViewReports = role === 'OWNER'

  async function loadReport(params: ReportsQueryParams = {}): Promise<void> {
    if (!selectedClubSlug || !canViewReports) {
      setReport(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setReport(await getReports(selectedClubSlug, params))
    } catch {
      setReport(null)
      setError('تعذر تحميل التقرير')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedClubSlug || !canViewReports) {
      return
    }

    let isActive = true
    const clubSlug = selectedClubSlug

    async function loadInitialReport(): Promise<void> {
      try {
        const response = await getReports(clubSlug, {})

        if (isActive) {
          setReport(response)
        }
      } catch {
        if (isActive) {
          setReport(null)
          setError('تعذر تحميل التقرير')
        }
      }
    }

    void loadInitialReport()

    return () => {
      isActive = false
    }
  }, [canViewReports, selectedClubSlug])

  function updateFilter<K extends keyof FilterState>(
    field: K,
    value: FilterState[K],
  ): void {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void loadReport(buildParams(filters))
  }

  return (
    <div className="space-y-5">
      <PageHeader
        description="تقارير الحجوزات والمدفوعات حسب الفترة والملعب والموظف"
        tone="brand"
        title="التقارير"
      />

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
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSubmit}>
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
              <label className="space-y-2 text-sm font-semibold">
                <span>رقم الملعب</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  inputMode="numeric"
                  onChange={(event) => updateFilter('court', event.target.value)}
                  value={filters.court}
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>رقم الموظف</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  inputMode="numeric"
                  onChange={(event) => updateFilter('staff', event.target.value)}
                  value={filters.staff}
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>حالة الحجز</span>
                <select
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) => updateFilter('status', event.target.value)}
                  value={filters.status}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>طريقة الدفع</span>
                <select
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) =>
                    updateFilter(
                      'payment_method',
                      event.target.value as PaymentMethod | '',
                    )
                  }
                  value={filters.payment_method}
                >
                  {paymentMethodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end md:col-span-2">
                <AppButton disabled={isLoading} fullWidth type="submit">
                  عرض التقرير
                </AppButton>
              </div>
            </form>
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
              <ReportsTotalsCard totals={report.totals} />

              <section className="space-y-3">
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  حسب طريقة الدفع
                </h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <AppCard>
                    <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      نقدي
                    </p>
                    <p className="mt-2 text-xl font-black text-[var(--sloty-primary-dark)]" dir="ltr">
                      {report.by_payment_method?.cash ?? '-'}
                    </p>
                  </AppCard>
                  <AppCard>
                    <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      محفظة رقمية
                    </p>
                    <p className="mt-2 text-xl font-black text-[var(--sloty-primary-dark)]" dir="ltr">
                      {report.by_payment_method?.digital_wallet ?? '-'}
                    </p>
                  </AppCard>
                  <AppCard>
                    <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      تحويل بنكي
                    </p>
                    <p className="mt-2 text-xl font-black text-[var(--sloty-primary-dark)]" dir="ltr">
                      {report.by_payment_method?.bank_transfer ?? '-'}
                    </p>
                  </AppCard>
                  <AppCard>
                    <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      أخرى
                    </p>
                    <p className="mt-2 text-xl font-black text-[var(--sloty-primary-dark)]" dir="ltr">
                      {report.by_payment_method?.other ?? '-'}
                    </p>
                  </AppCard>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  حسب الملعب
                </h2>
                <ReportsBreakdownList
                  emptyMessage="لا توجد بيانات ملاعب في التقرير"
                  items={(report.by_court ?? []).map((court) => ({
                    id: court.court,
                    title: court.court_name,
                    primaryLabel: 'الحجوزات',
                    primaryValue: court.bookings_count,
                    secondaryLabel: 'المدفوع',
                    secondaryValue: court.paid_amount,
                  }))}
                />
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  حسب الموظف
                </h2>
                <ReportsBreakdownList
                  emptyMessage="لا توجد بيانات موظفين في التقرير"
                  items={(report.by_staff ?? []).map((staff) => ({
                    id: staff.staff,
                    title: staff.staff_name,
                    primaryLabel: 'المعاملات',
                    primaryValue: staff.transactions_count,
                    secondaryLabel: 'المدفوع',
                    secondaryValue: staff.paid_amount,
                  }))}
                />
              </section>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
