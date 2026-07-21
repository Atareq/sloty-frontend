import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import {
  addDays,
  formatDateInputValue,
} from '../../../shared/utils/date'
import { formatMoneyAmount } from '../../../shared/utils/money'
import { BookingStatusBreakdown } from '../components/BookingStatusBreakdown/BookingStatusBreakdown'
import { MoneySummarySection } from '../components/MoneySummarySection/MoneySummarySection'
import { NeedsActionSection } from '../components/NeedsActionSection/NeedsActionSection'
import { StaffUnsettledMoneySection } from '../components/StaffUnsettledMoneySection/StaffUnsettledMoneySection'
import { SummaryActionCard } from '../components/SummaryActionCard/SummaryActionCard'
import { getDashboardSummary } from '../dashboardApi'
import type {
  DashboardSummaryQuery,
  DashboardSummaryResponse,
} from '../dashboard.types'
import { buildSummaryLink } from '../summaryLinks'

type DateShortcut = 'today' | 'yesterday' | 'week'

const dateShortcutLabels: Record<DateShortcut, string> = {
  today: 'اليوم',
  week: 'هذا الأسبوع',
  yesterday: 'أمس',
}

function createShortcutQuery(shortcut: DateShortcut): DashboardSummaryQuery {
  const today = new Date()

  if (shortcut === 'yesterday') {
    return {
      date: formatDateInputValue(addDays(today, -1)),
    }
  }

  if (shortcut === 'week') {
    return {
      date_from: formatDateInputValue(addDays(today, -6)),
      date_to: formatDateInputValue(today),
    }
  }

  return {
    date: formatDateInputValue(today),
  }
}

function getContextLabel(summary: DashboardSummaryResponse): string {
  const { date_from, date_to } = summary.context

  return date_from === date_to ? date_from : `${date_from} إلى ${date_to}`
}

function formatCount(value: number | null | undefined): string | number {
  return value ?? '-'
}

function renderLoadingSkeletons() {
  return (
    <>
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {['bookings', 'action', 'collection', 'unsettled'].map((key) => (
          <SummaryActionCard isLoading key={key} label="" value={null} />
        ))}
      </section>
      <AppCard>
        <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
          جاري تحميل الملخص...
        </p>
      </AppCard>
    </>
  )
}

/**
 * Summary / Owner Home control center backed by the dashboard summary endpoint.
 */
export function DashboardPage() {
  const { selectedClubSlug, selectedMembership } = useAuth()
  const [activeShortcut, setActiveShortcut] = useState<DateShortcut>('today')
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedClubName = selectedMembership?.club.name ?? null
  const activeQuery = useMemo(
    () => createShortcutQuery(activeShortcut),
    [activeShortcut],
  )

  useEffect(() => {
    let isActive = true

    async function loadSummary(): Promise<void> {
      if (!selectedClubSlug) {
        setSummary(null)
        setError(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await getDashboardSummary(selectedClubSlug, activeQuery)

        if (isActive) {
          setSummary(response)
        }
      } catch (error) {
        if (isActive) {
          setSummary(null)
          setError(getApiErrorMessage(error, 'تعذر تحميل الملخص'))
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadSummary()

    return () => {
      isActive = false
    }
  }, [activeQuery, selectedClubSlug])

  return (
    <div className="space-y-5">
      <PageHeader
        description={
          selectedClubName
            ? `متابعة الحجوزات والتحصيل والمبالغ غير المسواة داخل ${selectedClubName}`
            : 'متابعة الحجوزات والتحصيل والمبالغ غير المسواة'
        }
        tone="brand"
        title="الملخص"
      />

      {!selectedClubSlug ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            اختر ناديًا أولًا لعرض الملخص
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug ? (
        <>
          <AppCard>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-[var(--sloty-text-primary)]">
                  فترة الملخص
                </p>
                <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
                  {summary ? getContextLabel(summary) : 'حسب اختيار الفترة'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['today', 'yesterday', 'week'] as DateShortcut[]).map(
                  (shortcut) => (
                    <AppButton
                      key={shortcut}
                      onClick={() => setActiveShortcut(shortcut)}
                      variant={
                        activeShortcut === shortcut ? 'primary' : 'secondary'
                      }
                    >
                      {dateShortcutLabels[shortcut]}
                    </AppButton>
                  ),
                )}
              </div>
            </div>
          </AppCard>

          {isLoading ? renderLoadingSkeletons() : null}

          {!isLoading && error ? (
            <AppCard>
              <p className="text-sm font-bold text-[var(--sloty-danger)]">
                {error}
              </p>
            </AppCard>
          ) : null}

          {!isLoading && summary ? (
            <>
              <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryActionCard
                  helper="مقرر لعبها خلال الفترة"
                  label="حجوزات اليوم"
                  to={buildSummaryLink('/bookings', summary.context)}
                  value={summary.summary.total_bookings}
                />

                <SummaryActionCard
                  helper="حجوزات تحتاج متابعة"
                  label="تحتاج إجراء"
                  to={buildSummaryLink('/bookings', summary.context, {
                    needs_action: true,
                  })}
                  tone="amber"
                  value={summary.summary.needs_action_count}
                />

                <SummaryActionCard
                  helper="دفعات تم تحصيلها خلال الفترة"
                  label="تحصيل اليوم"
                  to={buildSummaryLink('/transactions', summary.context, {
                    is_cancelled: false,
                  })}
                  tone="green"
                  value={formatMoneyAmount(summary.summary.transaction_total)}
                />

                <SummaryActionCard
                  helper={`${formatCount(
                    summary.summary.unsettled_transaction_count,
                  )} دفعات · ${
                    summary.summary.staff_with_unsettled_transactions_count
                  } موظفين`}
                  label="مبالغ غير مسواة حالياً"
                  to="/transactions?settlement_status=unsettled&is_cancelled=false"
                  tone="purple"
                  value={formatMoneyAmount(
                    summary.summary.unsettled_transaction_amount,
                  )}
                />
              </section>

              <NeedsActionSection summary={summary} />
              <BookingStatusBreakdown summary={summary} />
              <MoneySummarySection summary={summary} />
              <StaffUnsettledMoneySection summary={summary} />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
