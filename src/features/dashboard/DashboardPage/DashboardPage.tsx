import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  getApiErrorCode,
  getApiErrorMessage,
} from '../../../core/api/apiError.helpers'
import {
  canChooseOperationalCourt,
  canManageSettlements,
  getAssignedOperationalCourtId,
} from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { offlineRepositories } from '../../../offline/repositories/offlineRepositories'
import type { OfflineScope } from '../../../offline/offline.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { AppSelect } from '../../../shared/components/AppSelect/AppSelect'
import { buildPathWithQuery } from '../../../shared/utils/buildPathWithQuery'
import {
  addDays,
  formatArabicDateTime,
  formatArabicDateWithWeekday,
  formatDateInputValue,
} from '../../../shared/utils/date'
import {
  getAuthenticatedUserDisplayName,
  getCourtDisplayName,
} from '../../../shared/utils/displayNames'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import {
  getCurrentCustodySummary,
  getSettlementPreview,
} from '../../settlements/settlementsApi'
import { subscribeCurrentFinancialStateChanged } from '../../settlements/currentFinancialStateInvalidation'
import type { CurrentCustodyRecord } from '../../settlements/settlements.types'
import { BookingStatusBreakdown } from '../components/BookingStatusBreakdown/BookingStatusBreakdown'
import { MoneySummarySection } from '../components/MoneySummarySection/MoneySummarySection'
import { NeedsActionSection } from '../components/NeedsActionSection/NeedsActionSection'
import { CurrentCustodySection } from '../../settlements/components/CurrentCustodySection/CurrentCustodySection'
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
  week: 'آخر 7 أيام',
  yesterday: 'أمس',
}

const dateShortcuts: DateShortcut[] = ['today', 'yesterday', 'week']

function createShortcutQuery(shortcut: DateShortcut): DashboardSummaryQuery {
  const today = new Date()

  if (shortcut === 'yesterday') {
    return { date: formatDateInputValue(addDays(today, -1)) }
  }

  if (shortcut === 'week') {
    return {
      date_from: formatDateInputValue(addDays(today, -6)),
      date_to: formatDateInputValue(today),
    }
  }

  return { date: formatDateInputValue(today) }
}

function getContextLabel(summary: DashboardSummaryResponse): string {
  const { date_from, date_to } = summary.context

  if (date_from === date_to) {
    return formatArabicDateWithWeekday(date_from)
  }

  return `${formatArabicDateWithWeekday(date_from)} إلى ${formatArabicDateWithWeekday(date_to)}`
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

function getGreeting(displayName: string, now = new Date()): string {
  const greeting = now.getHours() < 12 ? 'صباح الخير' : 'مساء الخير'

  if (displayName === 'مستخدم سلوتي') {
    return greeting
  }

  return `${greeting} يا ${displayName.split(/\s+/)[0]}`
}

function getBookingCountCopy(count: number, isToday: boolean): string {
  if (count === 0) {
    return isToday
      ? 'مفيش حجوزات مسجلة النهاردة.'
      : 'مفيش حجوزات مسجلة في الفترة دي.'
  }

  if (count === 1) {
    return isToday ? 'حجز واحد مسجل النهاردة' : 'حجز واحد خلال الفترة'
  }

  return isToday
    ? `${count} حجوزات مسجلة النهاردة`
    : `${count} حجوزات خلال الفترة`
}

function renderLoadingSkeletons() {
  return (
    <section className="space-y-3" aria-label="جاري تحميل ملخص التشغيل">
      <AppCard className="space-y-3">
        <div className="h-5 w-28 rounded-full bg-[var(--sloty-bg)]" />
        <div className="h-9 w-44 rounded-full bg-[var(--sloty-bg)]" />
        <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
          جاري تحميل ملخص التشغيل...
        </p>
      </AppCard>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SummaryActionCard isLoading label="" value={null} />
        <SummaryActionCard isLoading label="" value={null} />
      </div>
    </section>
  )
}

/**
 * Operational Home backed by the existing aggregate dashboard endpoint.
 * Unsupported booking-level Home blocks stay absent until the backend returns
 * authoritative booking summaries rather than frontend-derived guesses.
 */
export function DashboardPage() {
  const {
    claims,
    currentUser,
    role,
    selectedClubSlug,
    selectedMembership,
  } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [isCourtsLoading, setIsCourtsLoading] = useState(false)
  const [courtOptionsError, setCourtOptionsError] = useState<string | null>(null)
  const [custodyRecords, setCustodyRecords] = useState<CurrentCustodyRecord[]>(
    [],
  )
  const [isCustodyLoading, setIsCustodyLoading] = useState(false)
  const [custodyError, setCustodyError] = useState<string | null>(null)
  const [custodySnapshotSyncedAt, setCustodySnapshotSyncedAt] = useState<
    string | null
  >(null)
  const [currentFinancialRefreshToken, setCurrentFinancialRefreshToken] =
    useState(0)
  const isStaff = role === 'STAFF' || selectedMembership?.role === 'STAFF'
  const assignedCourtId = getAssignedOperationalCourtId(
    role,
    selectedMembership,
  )
  const canChooseCourt = canChooseOperationalCourt(role, selectedMembership)
  const requestedShortcut = useMemo(
    () => getShortcutFromSearch(location.search),
    [location.search],
  )
  const activeShortcut: DateShortcut = isStaff ? 'today' : requestedShortcut
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
    ? { ...summary, context: linkContext }
    : summary
  const displayName = getAuthenticatedUserDisplayName(
    currentUser,
    claims?.name,
  )
  const canManageStaffMoney = canManageSettlements(selectedMembership, role)
  const isTodaySummary = activeShortcut === 'today'
  const offlineScope: OfflineScope | null = useMemo(
    () =>
      currentUser?.id && selectedClubSlug
        ? { userId: currentUser.id, clubSlug: selectedClubSlug }
        : null,
    [currentUser, selectedClubSlug],
  )
  const custodySnapshotLabel = custodySnapshotSyncedAt
    ? `بيانات محفوظة من آخر تحديث ناجح: ${
        formatArabicDateTime(custodySnapshotSyncedAt) ?? custodySnapshotSyncedAt
      }`
    : null

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
          setError(
            getApiErrorMessage(
              error,
              'تعذر تحميل ملخص التشغيل. حاول مرة أخرى.',
            ),
          )
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

    async function loadCurrentCustody(): Promise<void> {
      if (
        !selectedClubSlug ||
        (!isStaff && !canManageStaffMoney)
      ) {
        setCustodyRecords([])
        setCustodyError(null)
        setIsCustodyLoading(false)
        return
      }

      setIsCustodyLoading(true)
      setCustodyError(null)
      setCustodySnapshotSyncedAt(null)

      try {
        const court = getCourtQueryValue(selectedCourt)

        if (isStaff) {
          const staffPreview = await getSettlementPreview(selectedClubSlug, {
            ...(court !== undefined ? { court } : {}),
          })
          const records = [staffPreview]

          if (isActive) {
            setCustodyRecords(records)
          }

          if (offlineScope) {
            const syncedAt = new Date().toISOString()

            try {
              await offlineRepositories.replaceCurrentCustodySnapshot(
                offlineScope,
                {
                  kind: 'preview',
                  collectorId: null,
                  courtId: court ?? null,
                  payload: staffPreview,
                },
                syncedAt,
              )
            } catch {
              // Non-fatal: the live Backend response is already rendered.
            }
          }
        } else {
          const summary = await getCurrentCustodySummary(selectedClubSlug, {
            ...(court !== undefined ? { court } : {}),
          })
          const records = summary.results

          if (isActive) {
            setCustodyRecords(records)
          }

          if (offlineScope) {
            const syncedAt = new Date().toISOString()

            try {
              await offlineRepositories.replaceCurrentCustodySnapshot(
                offlineScope,
                {
                  kind: 'grouped_summary',
                  collectorId: null,
                  courtId: court ?? null,
                  payload: summary,
                },
                syncedAt,
              )
            } catch {
              // Non-fatal: the live Backend response is already rendered.
            }
          }
        }
      } catch (error) {
        if (!isActive) {
          return
        }

        if (getApiErrorCode(error) === 'NO_UNSETTLED_TRANSACTIONS') {
          if (offlineScope) {
            try {
              await offlineRepositories.deleteCurrentCustodySnapshot(
                offlineScope,
                isStaff ? 'preview' : 'grouped_summary',
                null,
                getCourtQueryValue(selectedCourt) ?? null,
              )
            } catch {
              // Non-fatal: stale local cleanup must not block the empty state.
            }
          }
          setCustodyRecords([])
        } else {
          const court = getCourtQueryValue(selectedCourt)
          const snapshot = offlineScope
            ? await offlineRepositories
                .readCurrentCustodySnapshot(
                  offlineScope,
                  isStaff ? 'preview' : 'grouped_summary',
                  null,
                  court ?? null,
                )
                .catch(() => undefined)
            : undefined

          if (!isActive) {
            return
          }

          if (snapshot) {
            setCustodyRecords(
              snapshot.snapshot_kind === 'grouped_summary' &&
                'results' in snapshot.payload
                ? snapshot.payload.results
                : 'results' in snapshot.payload
                  ? []
                  : [snapshot.payload],
            )
            setCustodySnapshotSyncedAt(snapshot.synced_at)
          } else {
            setCustodyRecords([])
            setCustodyError(
              getApiErrorMessage(error, 'تعذر تحميل العهدة الحالية.'),
            )
          }
        }
      } finally {
        if (isActive) {
          setIsCustodyLoading(false)
        }
      }
    }

    void loadCurrentCustody()

    return () => {
      isActive = false
    }
  }, [
    canManageStaffMoney,
    currentFinancialRefreshToken,
    currentUser?.id,
    isStaff,
    offlineScope,
    selectedClubSlug,
    selectedCourt,
  ])

  useEffect(() => {
    if (!selectedClubSlug) {
      return undefined
    }

    return subscribeCurrentFinancialStateChanged((event) => {
      if (event.clubSlug && event.clubSlug !== selectedClubSlug) {
        return
      }

      setCurrentFinancialRefreshToken((current) => current + 1)
    })
  }, [selectedClubSlug])

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

  if (!selectedClubSlug) {
    return (
      <AppCard>
        <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
          اختر ناديًا أولًا لعرض ملخص التشغيل.
        </p>
      </AppCard>
    )
  }

  return (
    <div className="space-y-6">
      <section className="space-y-1" aria-label="سياق التشغيل اليومي">
        <h2 className="text-xl font-extrabold text-[var(--sloty-text-primary)] sm:text-2xl">
          {getGreeting(displayName)}
        </h2>
        <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
          {selectedCourtLabel} ·{' '}
          {formatArabicDateWithWeekday(formatDateInputValue(new Date()))}
        </p>
      </section>

      {canChooseCourt ? (
        <AppCard className="space-y-3">
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

          {courts.length === 1 && !selectedCourt ? (
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
                    selectedCourt === String(court.id) ? 'primary' : 'secondary'
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
            <div className="max-w-sm">
              <AppSelect
                label="نطاق الملعب"
                onChange={(value) => updateDashboardQuery({ court: value })}
                options={[
                  { value: '', label: 'كل الملاعب' },
                  ...courts.map((court) => ({
                    value: String(court.id),
                    label: getCourtDisplayName(court),
                  })),
                  ...(selectedCourt && !selectedCourtOption
                    ? [{ value: selectedCourt, label: selectedCourtLabel }]
                    : []),
                ]}
                value={selectedCourt}
              />
            </div>
          )}
        </AppCard>
      ) : null}

      {isLoading ? renderLoadingSkeletons() : null}

      {!isLoading && error ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-danger)]">
            {error}
          </p>
        </AppCard>
      ) : null}

      {isStaff || canManageStaffMoney ? (
        <CurrentCustodySection
          court={getCourtQueryValue(selectedCourt)}
          error={custodyError}
          isLoading={isCustodyLoading}
          mode={isStaff ? 'staff' : 'management'}
          records={custodyRecords}
          snapshotLabel={custodySnapshotLabel}
        />
      ) : null}

      {!isLoading && scopedSummary ? (
        <>
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
                {isTodaySummary ? 'النهاردة' : 'ملخص الفترة'}
              </h2>
              <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
                {isTodaySummary
                  ? formatArabicDateWithWeekday(scopedSummary.context.date_from)
                  : getContextLabel(scopedSummary)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <AppCard className="space-y-2">
                <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                  الحجوزات
                </p>
                <p className="text-2xl font-black text-[var(--sloty-primary-dark)]">
                  {getBookingCountCopy(
                    scopedSummary.summary.total_bookings,
                    isTodaySummary,
                  )}
                </p>
              </AppCard>

              {scopedSummary.summary.hold_bookings > 0 ? (
                <Link
                  className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-400"
                  to={buildSummaryLink('/bookings', scopedSummary.context, {
                    status: 'HOLD',
                  })}
                >
                  <p className="text-sm font-bold text-amber-800">
                    محتاجة متابعة
                  </p>
                  <p className="mt-2 text-2xl font-black text-amber-900">
                    {scopedSummary.summary.hold_bookings} بانتظار العربون
                  </p>
                  <p className="mt-2 text-xs font-bold text-amber-800">
                    افتح الحجوزات وأضف العربون
                  </p>
                </Link>
              ) : (
                <AppCard>
                  <p className="text-sm font-black text-[var(--sloty-text-primary)]">
                    مفيش حجوزات بانتظار العربون.
                  </p>
                </AppCard>
              )}
            </div>
          </section>

          <NeedsActionSection summary={scopedSummary} />

          <section className="space-y-5 border-t border-[var(--sloty-border)] pt-5">
            <div>
              <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
                متابعة وأرقام
              </h2>
              <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
                تفاصيل ثانوية بعد مهام التشغيل اليومية.
              </p>
            </div>

            {!isStaff ? (
              <AppCard className="space-y-3">
                <div>
                  <p className="text-sm font-black text-[var(--sloty-text-primary)]">
                    فترة المتابعة
                  </p>
                  <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
                    {getContextLabel(scopedSummary)}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:max-w-md">
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
              </AppCard>
            ) : null}

            <BookingStatusBreakdown summary={scopedSummary} />
            <MoneySummarySection summary={scopedSummary} />
          </section>
        </>
      ) : null}
    </div>
  )
}
