import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import {
  canChooseOperationalCourt,
  getAssignedOperationalCourtId,
} from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { AppSelect } from '../../../shared/components/AppSelect/AppSelect'
import { buildPathWithQuery } from '../../../shared/utils/buildPathWithQuery'
import {
  addDays,
  formatDateInputValue,
} from '../../../shared/utils/date'
import { getCourtDisplayName } from '../../../shared/utils/displayNames'
import { formatMoneyAmount } from '../../../shared/utils/money'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
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

const dateShortcuts: DateShortcut[] = ['today', 'yesterday', 'week']

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

function getShortcutFromSearch(search: string): DateShortcut {
  const shortcut = toQueryObject(search).shortcut

  return dateShortcuts.includes(shortcut as DateShortcut)
    ? (shortcut as DateShortcut)
    : 'today'
}

function getCourtFromSearch(search: string): string {
  return toQueryObject(search).court ?? ''
}

function getCourtQueryValue(court: string): number | undefined {
  if (!court) {
    return undefined
  }

  const numericCourt = Number(court)

  return Number.isFinite(numericCourt) ? numericCourt : undefined
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
  const { role, selectedClubSlug, selectedMembership } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [isCourtsLoading, setIsCourtsLoading] = useState(false)
  const [courtOptionsError, setCourtOptionsError] = useState<string | null>(null)
  const assignedCourtId = getAssignedOperationalCourtId(
    role,
    selectedMembership,
  )
  const canChooseCourt = canChooseOperationalCourt(role, selectedMembership)
  const activeShortcut = useMemo(
    () => getShortcutFromSearch(location.search),
    [location.search],
  )
  const selectedCourtFromSearch = useMemo(
    () => getCourtFromSearch(location.search),
    [location.search],
  )
  const selectedCourt = canChooseCourt
    ? selectedCourtFromSearch
    : assignedCourtId
      ? String(assignedCourtId)
      : ''
  const activeQuery = useMemo(
    () => ({
      ...createShortcutQuery(activeShortcut),
      ...(selectedCourt ? { court: selectedCourt } : {}),
    }),
    [activeShortcut, selectedCourt],
  )
  const selectedCourtOption = courts.find(
    (court) => String(court.id) === selectedCourt,
  )
  const selectedCourtLabel = selectedCourt
    ? !canChooseCourt && selectedMembership?.court?.name
      ? selectedMembership.court.name
      : selectedCourtOption
      ? getCourtDisplayName(selectedCourtOption)
      : `ملعب #${selectedCourt}`
    : 'كل الملاعب'
  const linkContext = summary
    ? {
        ...summary.context,
        court: getCourtQueryValue(selectedCourt) ?? summary.context.court,
      }
    : null
  const scopedSummary = summary && linkContext
    ? {
        ...summary,
        context: linkContext,
      }
    : summary

  function updateDashboardQuery(nextValues: {
    shortcut?: DateShortcut
    court?: string
  }): void {
    const query = toQueryObject(location.search)
    const nextShortcut = nextValues.shortcut ?? activeShortcut
    const nextCourt =
      nextValues.court !== undefined ? nextValues.court : selectedCourt

    navigate(
      buildPathWithQuery('/dashboard', {
        ...query,
        shortcut: nextShortcut === 'today' ? undefined : nextShortcut,
        court: canChooseCourt && nextCourt ? nextCourt : undefined,
      }),
    )
  }

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
          setError(getApiErrorMessage(error, 'تعذر تحميل ملخص النادي'))
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

  useEffect(() => {
    let isActive = true

    async function loadCourts(): Promise<void> {
      if (!selectedClubSlug || !canChooseCourt) {
        setCourts([])
        setCourtOptionsError(null)
        setIsCourtsLoading(false)
        return
      }

      setIsCourtsLoading(true)
      setCourtOptionsError(null)

      try {
        const response = await listCourts(selectedClubSlug)

        if (isActive) {
          setCourts(response.results.filter((court) => court.is_active))
        }
      } catch {
        if (isActive) {
          setCourts([])
          setCourtOptionsError('تعذر تحميل خيارات الملاعب')
        }
      } finally {
        if (isActive) {
          setIsCourtsLoading(false)
        }
      }
    }

    void loadCourts()

    return () => {
      isActive = false
    }
  }, [canChooseCourt, selectedClubSlug])

  return (
    <div className="space-y-5">
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
                {dateShortcuts.map((shortcut) => (
                  <AppButton
                    key={shortcut}
                    onClick={() => updateDashboardQuery({ shortcut })}
                    variant={
                      activeShortcut === shortcut ? 'primary' : 'secondary'
                    }
                  >
                    {dateShortcutLabels[shortcut]}
                  </AppButton>
                ))}
              </div>
            </div>
          </AppCard>

          <AppCard>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-[var(--sloty-text-primary)]">
                  نطاق الملعب
                </p>
                <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
                  {isCourtsLoading ? 'جاري تحميل الملاعب...' : selectedCourtLabel}
                </p>
                {courtOptionsError ? (
                  <p className="mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                    {courtOptionsError}
                  </p>
                ) : null}
              </div>

              {!canChooseCourt ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-black text-[var(--sloty-text-primary)]">
                  {selectedCourtLabel}
                </div>
              ) : courts.length === 1 && !selectedCourt ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-black text-[var(--sloty-text-primary)]">
                  كل الملاعب
                </div>
              ) : courts.length <= 4 ? (
                <div className="flex flex-wrap gap-2">
                  <AppButton
                    onClick={() => updateDashboardQuery({ court: '' })}
                    type="button"
                    variant={!selectedCourt ? 'primary' : 'secondary'}
                  >
                    كل الملاعب
                  </AppButton>
                  {courts.map((court) => (
                    <AppButton
                      key={court.id}
                      onClick={() =>
                        updateDashboardQuery({ court: String(court.id) })
                      }
                      type="button"
                      variant={
                        selectedCourt === String(court.id)
                          ? 'primary'
                          : 'secondary'
                      }
                    >
                      {getCourtDisplayName(court)}
                    </AppButton>
                  ))}
                  {selectedCourt && !selectedCourtOption ? (
                    <AppButton type="button" variant="primary">
                      {selectedCourtLabel}
                    </AppButton>
                  ) : null}
                </div>
              ) : (
                <div className="min-w-56">
                  <AppSelect
                    label="نطاق الملعب"
                    onChange={(value) =>
                      updateDashboardQuery({ court: value })
                    }
                    options={[
                      { value: '', label: 'كل الملاعب' },
                      ...courts.map((court) => ({
                        value: String(court.id),
                        label: getCourtDisplayName(court),
                      })),
                      ...(selectedCourt && !selectedCourtOption ? [
                        {
                          value: selectedCourt,
                          label: selectedCourtLabel,
                        },
                      ] : []),
                    ]}
                    value={selectedCourt}
                  />
                </div>
              )}
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
                  to={
                    linkContext
                      ? buildSummaryLink('/bookings', linkContext)
                      : undefined
                  }
                  value={summary.summary.total_bookings}
                />

                <SummaryActionCard
                  helper="حجوزات تحتاج متابعة"
                  label="تحتاج إجراء"
                  to={
                    linkContext
                      ? buildSummaryLink('/bookings', linkContext, {
                          needs_action: true,
                        })
                      : undefined
                  }
                  tone="amber"
                  value={summary.summary.needs_action_count}
                />

                <SummaryActionCard
                  helper="دفعات تم تحصيلها خلال الفترة"
                  label="تحصيل اليوم"
                  to={
                    linkContext
                      ? buildSummaryLink('/transactions', linkContext, {
                          is_cancelled: false,
                        })
                      : undefined
                  }
                  tone="green"
                  value={formatMoneyAmount(summary.summary.transaction_total)}
                />

                <SummaryActionCard
                  helper={`${formatCount(
                    summary.summary.unsettled_transaction_count,
                  )} معاملات · ${
                    summary.summary.staff_with_unsettled_transactions_count
                  } موظفين`}
                  label="مبالغ غير مسواة حالياً"
                  to={buildPathWithQuery('/transactions', {
                    settlement_status: 'unsettled',
                    is_cancelled: false,
                    court: linkContext?.court ?? undefined,
                  })}
                  tone="purple"
                  value={formatMoneyAmount(
                    summary.summary.unsettled_transaction_total_amount,
                  )}
                />
              </section>

              <NeedsActionSection summary={scopedSummary ?? summary} />
              <BookingStatusBreakdown summary={scopedSummary ?? summary} />
              <MoneySummarySection summary={scopedSummary ?? summary} />
              <StaffUnsettledMoneySection summary={scopedSummary ?? summary} />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
