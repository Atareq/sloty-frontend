import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  getApiErrorCode,
  getApiErrorMessage,
} from '../../../core/api/apiError.helpers'
import {
  canManageSettlements,
  canViewOwnSettlements,
  getAssignedOperationalCourtId,
} from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { offlineRepositories } from '../../../offline/repositories/offlineRepositories'
import type { OfflineScope } from '../../../offline/offline.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { AppSelect } from '../../../shared/components/AppSelect/AppSelect'
import { financeCopy, navigationCopy } from '../../../shared/copy/appCopy'
import {
  formatArabicDateTime,
  formatArabicPeriodRange,
} from '../../../shared/utils/date'
import { formatMoneyAmount } from '../../../shared/utils/money'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../../shared/utils/buildPathWithQuery'
import {
  getClubUserDisplayName,
  getCourtDisplayName,
} from '../../../shared/utils/displayNames'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import type { ClubUser } from '../../clubUsers/clubUsers.types'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import {
  getCurrentCustodySummary,
  getSettlementPreview,
  listSettlements,
} from '../settlementsApi'
import { subscribeCurrentFinancialStateChanged } from '../currentFinancialStateInvalidation'
import { getSettlementCollectorName } from '../settlementDisplay.helpers'
import {
  settlementPaymentMethodLabels,
  type CurrentCustodySummaryRow,
  type Settlement,
  type SettlementPreview,
  type SettlementPreviewTransaction,
} from '../settlements.types'
import {
  CurrentCustodyPaymentBreakdown,
  CurrentCustodySection,
  CurrentCustodyValue,
} from '../components/CurrentCustodySection/CurrentCustodySection'

interface HubQueryState {
  collected_by: string
  court: string
  history: boolean
}

function parseHubQuery(search: string): HubQueryState {
  const query = toQueryObject(search)

  return {
    collected_by: query.collected_by ?? '',
    court: query.court ?? '',
    history: query.history === 'true',
  }
}

function getHubSearch(state: HubQueryState): string {
  return buildPathWithQuery('', {
    collected_by: state.collected_by || undefined,
    court: state.court || undefined,
    history: state.history ? 'true' : undefined,
  } as Record<string, QueryParamValue>)
}

function PeriodBlock({
  start,
  end,
}: {
  start?: string | null
  end?: string | null
}) {
  const period = formatArabicPeriodRange(start, end)

  if (!period) {
    return null
  }

  return (
    <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm">
      <p className="font-semibold text-[var(--sloty-text-muted)]">الفترة</p>
      <p className="mt-1 font-semibold text-[var(--sloty-text-primary)]">
        من {period.startLabel}
      </p>
      <p className="font-semibold text-[var(--sloty-text-primary)]">
        إلى {period.endLabel}
      </p>
    </div>
  )
}

function LinkedTransactions({
  count,
  isExpanded,
  onToggle,
  transactions,
}: {
  count: number
  isExpanded: boolean
  onToggle: () => void
  transactions: SettlementPreviewTransaction[]
}) {
  return (
    <div>
      <button
        aria-expanded={isExpanded}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--sloty-primary-dark)]"
        onClick={onToggle}
        type="button"
      >
        {isExpanded ? financeCopy.hideLinkedTransactions : financeCopy.viewLinkedTransactions}{' '}
        ({count})
        {isExpanded ? (
          <ChevronUp aria-hidden="true" className="h-4 w-4" />
        ) : (
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        )}
      </button>
      {isExpanded ? (
        <ul className="mt-3 space-y-2">
          {transactions.map((transaction) => (
            <li
              className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm"
              key={transaction.id}
            >
              <p className="font-semibold text-[var(--sloty-text-primary)]">
                {formatMoneyAmount(transaction.amount)} ·{' '}
                {settlementPaymentMethodLabels[transaction.payment_method]}
              </p>
              {transaction.payment_reference ? (
                <p className="mt-1 text-xs font-medium text-[var(--sloty-text-muted)]">
                  {financeCopy.paymentReference}
                  <span className="ms-1 font-semibold text-[var(--sloty-text-primary)]">
                    {transaction.payment_reference}
                  </span>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Owner/Manager money management and Staff own-custody hub.
 *
 * All-employee current amounts use the grouped Backend custody read model.
 * A selected employee uses settlement preview. Historical rows are SETTLED
 * settlements only. The page does not N+1 preview every employee.
 */
export function SettlementsHubPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, role, selectedClubSlug, selectedMembership } = useAuth()
  const canSettle = canManageSettlements(selectedMembership, role)
  const canViewOwn = canViewOwnSettlements(selectedMembership, role)
  const isOwnMode = canViewOwn && !canSettle
  const assignedCourtId = getAssignedOperationalCourtId(
    role,
    selectedMembership,
  )
  const query = useMemo(
    () => parseHubQuery(location.search),
    [location.search],
  )
  const [users, setUsers] = useState<ClubUser[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [isLoadingFilters, setIsLoadingFilters] = useState(false)
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(
    null,
  )
  const [currentPreview, setCurrentPreview] = useState<SettlementPreview | null>(
    null,
  )
  const [currentEmployees, setCurrentEmployees] = useState<
    CurrentCustodySummaryRow[]
  >([])
  const [historicalSettlements, setHistoricalSettlements] = useState<
    Settlement[]
  >([])
  const [isCurrentLoading, setIsCurrentLoading] = useState(true)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [isCurrentEmpty, setIsCurrentEmpty] = useState(false)
  const [currentSnapshotSyncedAt, setCurrentSnapshotSyncedAt] = useState<
    string | null
  >(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [currentFinancialRefreshToken, setCurrentFinancialRefreshToken] =
    useState(0)
  const hasAccess = Boolean(selectedClubSlug && canViewOwn)
  const reviewableUsers = useMemo(
    () => users.filter((user) => user.id !== currentUser?.id),
    [currentUser?.id, users],
  )
  const selectedCourt = courts.find(
    (court) => String(court.id) === query.court,
  )
  const selectedCourtLabel = query.court
    ? selectedCourt
      ? getCourtDisplayName(selectedCourt)
      : `ملعب #${query.court}`
    : 'كل الملاعب'
  const offlineScope: OfflineScope | null = useMemo(
    () =>
      currentUser?.id && selectedClubSlug
        ? { userId: currentUser.id, clubSlug: selectedClubSlug }
        : null,
    [currentUser, selectedClubSlug],
  )
  const currentSnapshotLabel = currentSnapshotSyncedAt
    ? `بيانات محفوظة من آخر تحديث ناجح: ${
        formatArabicDateTime(currentSnapshotSyncedAt) ?? currentSnapshotSyncedAt
      }`
    : null

  useEffect(() => {
    let isActive = true

    async function loadUsers(): Promise<void> {
      if (!hasAccess || !selectedClubSlug || !canSettle) {
        setUsers([])
        return
      }

      setIsLoadingFilters(true)
      setFilterOptionsError(null)

      try {
        const response = await listClubUsers(selectedClubSlug, {
          is_active: true,
        })
        if (isActive) {
          setUsers(Array.isArray(response) ? response : response.results)
        }
      } catch {
        if (isActive) {
          setUsers([])
          setFilterOptionsError('تعذر تحميل قائمة الموظفين')
        }
      } finally {
        if (isActive) {
          setIsLoadingFilters(false)
        }
      }
    }

    void loadUsers()

    return () => {
      isActive = false
    }
  }, [canSettle, hasAccess, selectedClubSlug])

  useEffect(() => {
    let isActive = true

    async function loadCourts(): Promise<void> {
      if (!hasAccess || !selectedClubSlug || !canSettle) {
        setCourts([])
        return
      }

      try {
        const response = await listCourts(selectedClubSlug)

        if (isActive) {
          setCourts(response.results)
        }
      } catch {
        if (isActive) {
          setCourts([])
          setFilterOptionsError('تعذر تحميل بعض خيارات التصفية')
        }
      }
    }

    void loadCourts()

    return () => {
      isActive = false
    }
  }, [canSettle, hasAccess, selectedClubSlug])

  useEffect(() => {
    let isActive = true

    async function loadCurrentMoney(): Promise<void> {
      if (!selectedClubSlug || (!canSettle && !isOwnMode)) {
        setCurrentPreview(null)
        setCurrentEmployees([])
        setIsCurrentLoading(false)
        return
      }

      setIsCurrentLoading(true)
      setCurrentError(null)
      setIsCurrentEmpty(false)
      setCurrentPreview(null)
      setCurrentEmployees([])
      setCurrentSnapshotSyncedAt(null)

      try {
        if (isOwnMode || query.collected_by) {
          const previewCollectorId = isOwnMode ? null : query.collected_by
          const previewCourtId = isOwnMode
            ? assignedCourtId
            : query.court || null
          const preview = await getSettlementPreview(
            selectedClubSlug,
            {
              ...(isOwnMode
                ? assignedCourtId
                  ? { court: assignedCourtId }
                  : {}
                : { collected_by: query.collected_by }),
              ...(!isOwnMode && query.court ? { court: query.court } : {}),
            },
          )

          if (!isActive) {
            return
          }

          setCurrentPreview(preview)
          setIsCurrentEmpty(preview.transaction_count <= 0)

          if (offlineScope) {
            const syncedAt = new Date().toISOString()

            try {
              await offlineRepositories.replaceCurrentCustodySnapshot(
                offlineScope,
                {
                  kind: 'preview',
                  collectorId: previewCollectorId,
                  courtId: previewCourtId,
                  payload: preview,
                },
                syncedAt,
              )
            } catch {
              // Non-fatal: online Backend data is already rendered.
            }
          }
        } else {
          const summaryCourtId = query.court || null
          const summary = await getCurrentCustodySummary(selectedClubSlug, {
            ...(summaryCourtId ? { court: summaryCourtId } : {}),
          })

          if (!isActive) {
            return
          }

          setCurrentEmployees(summary.results)
          setIsCurrentEmpty(summary.results.length === 0)

          if (offlineScope) {
            const syncedAt = new Date().toISOString()

            try {
              await offlineRepositories.replaceCurrentCustodySnapshot(
                offlineScope,
                {
                  kind: 'grouped_summary',
                  collectorId: null,
                  courtId: summaryCourtId,
                  payload: summary,
                },
                syncedAt,
              )
            } catch {
              // Non-fatal: online Backend data is already rendered.
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
                isOwnMode || query.collected_by ? 'preview' : 'grouped_summary',
                isOwnMode ? null : query.collected_by,
                isOwnMode ? assignedCourtId : query.court || null,
              )
            } catch {
              // Non-fatal: stale local cleanup must not block the empty state.
            }
          }
          setIsCurrentEmpty(true)
        } else {
          const snapshot = offlineScope
            ? await offlineRepositories
                .readCurrentCustodySnapshot(
                  offlineScope,
                  isOwnMode || query.collected_by
                    ? 'preview'
                    : 'grouped_summary',
                  isOwnMode ? null : query.collected_by,
                  isOwnMode ? assignedCourtId : query.court || null,
                )
                .catch(() => undefined)
            : undefined

          if (!isActive) {
            return
          }

          if (snapshot) {
            if (snapshot.snapshot_kind === 'grouped_summary') {
              setCurrentEmployees(
                'results' in snapshot.payload ? snapshot.payload.results : [],
              )
              setIsCurrentEmpty(
                'results' in snapshot.payload
                  ? snapshot.payload.results.length === 0
                  : true,
              )
            } else {
              setCurrentPreview(
                'results' in snapshot.payload ? null : snapshot.payload,
              )
              setIsCurrentEmpty(
                'results' in snapshot.payload
                  ? true
                  : snapshot.payload.transaction_count <= 0,
              )
            }
            setCurrentSnapshotSyncedAt(snapshot.synced_at)
          } else {
            setCurrentError(
              getApiErrorMessage(error, 'تعذر تحميل المبالغ الحالية'),
            )
          }
        }
      } finally {
        if (isActive) {
          setIsCurrentLoading(false)
        }
      }
    }

    void loadCurrentMoney()

    return () => {
      isActive = false
    }
  }, [
    assignedCourtId,
    canSettle,
    currentFinancialRefreshToken,
    currentUser?.id,
    isOwnMode,
    offlineScope,
    query.collected_by,
    query.court,
    selectedClubSlug,
  ])

  useEffect(() => {
    let isActive = true

    async function loadHistory(): Promise<void> {
      if (!selectedClubSlug || (!canSettle && !isOwnMode) || !query.history) {
        setHistoricalSettlements([])
        setHistoryError(null)
        setIsHistoryLoading(false)
        return
      }

      setIsHistoryLoading(true)
      setHistoryError(null)

      try {
        const response = await listSettlements(selectedClubSlug, {
          status: 'SETTLED',
          ...(query.court ? { court: query.court } : {}),
          ...(isOwnMode || !query.collected_by
            ? {}
            : { collected_by: query.collected_by }),
        })

        if (isActive) {
          setHistoricalSettlements(response.results)
        }
      } catch (error) {
        if (isActive) {
          setHistoricalSettlements([])
          setHistoryError(
            getApiErrorMessage(error, 'تعذر تحميل المبالغ المستلمة سابقًا'),
          )
        }
      } finally {
        if (isActive) {
          setIsHistoryLoading(false)
        }
      }
    }

    void loadHistory()

    return () => {
      isActive = false
    }
  }, [
    canSettle,
    currentFinancialRefreshToken,
    isOwnMode,
    query.collected_by,
    query.court,
    query.history,
    selectedClubSlug,
  ])

  useEffect(() => {
    if (!selectedClubSlug || !canViewOwn) {
      return undefined
    }

    return subscribeCurrentFinancialStateChanged((event) => {
      if (event.clubSlug && event.clubSlug !== selectedClubSlug) {
        return
      }

      setCurrentFinancialRefreshToken((current) => current + 1)
    })
  }, [canViewOwn, selectedClubSlug])

  const userFilterOptions = [
    { value: '', label: financeCopy.allEmployees },
    ...reviewableUsers.map((user) => ({
      value: String(user.id),
      label: getClubUserDisplayName(user),
    })),
    ...(query.collected_by &&
    !reviewableUsers.some((user) => String(user.id) === query.collected_by)
      ? [{ value: query.collected_by, label: 'موظف محدد' }]
      : []),
  ]
  const courtFilterOptions = [
    { value: '', label: 'كل الملاعب' },
    ...courts.map((court) => ({
      value: String(court.id),
      label: getCourtDisplayName(court),
    })),
    ...(query.court && !selectedCourt
      ? [{ value: query.court, label: selectedCourtLabel }]
      : []),
  ]

  if (!selectedClubSlug) {
    return (
      <AppCard>
        <p className="text-sm font-semibold text-[var(--sloty-text-muted)]">
          اختر ناديًا أولًا لعرض المبالغ.
        </p>
      </AppCard>
    )
  }

  if (!canViewOwn) {
    return (
      <AppCard>
        <p className="text-sm font-semibold text-[var(--sloty-danger)]">
          ليس لديك صلاحية عرض المبالغ.
        </p>
      </AppCard>
    )
  }

  return (
    <div className="space-y-5">
      {canSettle ? (
        <AppCard className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--sloty-text-primary)]">
              {navigationCopy.staffMoneyPage}
            </h2>
            <p className="mt-1 text-sm font-medium text-[var(--sloty-text-muted)]">
              المبالغ اللي لسه مع الموظفين ولم يتم استلامها.
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <AppSelect
                disabled={isLoadingFilters}
                label={financeCopy.collector}
                onChange={(value) => {
                  navigate(
                    {
                      pathname: location.pathname,
                      search: getHubSearch({
                        collected_by: value,
                        court: query.court,
                        history: query.history,
                      }),
                    },
                    { replace: false },
                  )
                }}
                options={userFilterOptions}
                value={query.collected_by}
              />
              <AppSelect
                label="نطاق الملعب"
                onChange={(value) => {
                  navigate(
                    {
                      pathname: location.pathname,
                      search: getHubSearch({
                        collected_by: query.collected_by,
                        court: value,
                        history: query.history,
                      }),
                    },
                    { replace: false },
                  )
                }}
                options={courtFilterOptions}
                value={query.court}
              />
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-[var(--sloty-text-primary)]">
              <input
                checked={query.history}
                className="h-5 w-5 rounded border-[var(--sloty-border)] text-[var(--sloty-primary)]"
                onChange={(event) =>
                  navigate(
                    {
                      pathname: location.pathname,
                      search: getHubSearch({
                        collected_by: query.collected_by,
                        court: query.court,
                        history: event.target.checked,
                      }),
                    },
                    { replace: false },
                  )
                }
                type="checkbox"
              />
              {financeCopy.reviewPreviouslyReceived}
            </label>
          </div>

          <Link
            className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--sloty-primary-dark)]"
            to="/transactions"
          >
            {financeCopy.financialLedgerLink} ↗
          </Link>
        </AppCard>
      ) : null}

      {filterOptionsError ? (
        <p className="text-xs font-semibold text-[var(--sloty-danger)]">
          {filterOptionsError}
        </p>
      ) : null}

      {isOwnMode ? (
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-[var(--sloty-text-primary)]">
          <input
            checked={query.history}
            className="h-5 w-5 rounded border-[var(--sloty-border)] text-[var(--sloty-primary)]"
            onChange={(event) =>
              navigate({
                pathname: location.pathname,
                search: getHubSearch({
                  collected_by: '',
                  court: '',
                  history: event.target.checked,
                }),
              })
            }
            type="checkbox"
          />
          {financeCopy.reviewPreviouslyReceived}
        </label>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--sloty-text-primary)]">
          {isOwnMode
            ? financeCopy.currentCustody
            : financeCopy.currentEmployeeMoney}
        </h2>
        {canSettle ? (
          <p className="text-sm font-semibold text-[var(--sloty-text-muted)]">
            نطاق العهدة: {selectedCourtLabel}
          </p>
        ) : null}
        {currentSnapshotLabel ? (
          <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
            {currentSnapshotLabel}
          </p>
        ) : null}

        {isCurrentLoading ? (
          <AppCard>
            <p className="text-sm font-medium text-[var(--sloty-text-muted)]">
              جاري تحميل المبالغ الحالية...
            </p>
          </AppCard>
        ) : null}

        {currentError ? (
          <AppCard>
            <p className="text-sm font-semibold text-[var(--sloty-danger)]">
              {currentError}
            </p>
          </AppCard>
        ) : null}

        {!isCurrentLoading && !currentError && isCurrentEmpty ? (
          <AppCard>
            <p className="text-sm font-medium text-[var(--sloty-text-primary)]">
              {financeCopy.currentCustodyEmpty}
            </p>
          </AppCard>
        ) : null}

        {!isCurrentLoading &&
        currentPreview &&
        currentPreview.transaction_count > 0 ? (
          <AppCard className="space-y-4">
            <div>
              <p className="text-lg font-bold text-[var(--sloty-text-primary)]">
                {currentPreview.collected_by_name}
              </p>
              {currentPreview.court_name ? (
                <p className="mt-1 text-sm font-medium text-[var(--sloty-text-muted)]">
                  {currentPreview.court_name}
                </p>
              ) : null}
            </div>
            <div>
              <CurrentCustodyValue record={currentPreview} />
              <p className="mt-1 text-sm font-medium text-[var(--sloty-text-muted)]">
                {currentPreview.transaction_count} معاملات
              </p>
            </div>
            <CurrentCustodyPaymentBreakdown
              totals={currentPreview.totals_by_payment_method}
            />
            {canSettle && currentPreview.can_approve ? (
              <Link
                to={buildPathWithQuery('/settlements/preview', {
                  collected_by: currentPreview.collected_by,
                  court: query.court || currentPreview.court,
                })}
              >
                <AppButton fullWidth type="button">
                  {financeCopy.receiveAmount}
                </AppButton>
              </Link>
            ) : currentPreview.is_self_preview && !currentPreview.can_approve ? (
              <p className="text-sm font-medium text-[var(--sloty-text-muted)]">
                {financeCopy.selfPreviewDenied}
              </p>
            ) : null}
            <LinkedTransactions
              count={currentPreview.transaction_count}
              isExpanded={expandedKey === `preview-${currentPreview.collected_by}`}
              onToggle={() =>
                setExpandedKey((current) =>
                  current === `preview-${currentPreview.collected_by}`
                    ? null
                    : `preview-${currentPreview.collected_by}`,
                )
              }
              transactions={currentPreview.transactions}
            />
          </AppCard>
        ) : null}

        {!isCurrentLoading && !currentError && currentEmployees.length > 0 ? (
          <CurrentCustodySection
            court={query.court || undefined}
            mode="management"
            records={currentEmployees}
            showTitle={false}
          />
        ) : null}
      </section>

      {query.history ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-[var(--sloty-text-primary)]">
            {financeCopy.previouslyReceived}
          </h2>
          {isHistoryLoading ? (
            <AppCard>
              <p className="text-sm font-medium text-[var(--sloty-text-muted)]">
                جاري تحميل المبالغ المستلمة سابقًا...
              </p>
            </AppCard>
          ) : null}
          {historyError ? (
            <AppCard>
              <p className="text-sm font-semibold text-[var(--sloty-danger)]">
                {historyError}
              </p>
            </AppCard>
          ) : null}
          {!isHistoryLoading &&
          !historyError &&
          historicalSettlements.length === 0 ? (
            <AppCard>
              <p className="text-sm font-medium text-[var(--sloty-text-muted)]">
                مفيش مبالغ مستلمة سابقًا مطابقة.
              </p>
            </AppCard>
          ) : null}
          {!isHistoryLoading && historicalSettlements.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {historicalSettlements.map((settlement) => (
                <AppCard className="space-y-4" key={settlement.id}>
                  <div>
                    <p className="text-lg font-bold text-[var(--sloty-text-primary)]">
                      {getSettlementCollectorName(settlement)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--sloty-primary-dark)]">
                      ✓ تم الاستلام
                    </p>
                  </div>
                  {settlement.total_amount ? (
                    <p className="text-2xl font-bold text-[var(--sloty-text-primary)]">
                      {formatMoneyAmount(settlement.total_amount, {
                        suffix: 'ج.م',
                      })}
                    </p>
                  ) : null}
                  {settlement.transaction_count !== undefined ? (
                    <p className="text-sm font-medium text-[var(--sloty-text-muted)]">
                      {settlement.transaction_count} عملية
                    </p>
                  ) : null}
                  <PeriodBlock
                    end={settlement.period_end}
                    start={settlement.period_start}
                  />
                  <Link to={`/settlements/${settlement.id}`}>
                    <AppButton fullWidth type="button" variant="secondary">
                      {financeCopy.viewDetails}
                    </AppButton>
                  </Link>
                </AppCard>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {isOwnMode ? (
        <Link
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--sloty-primary-dark)]"
          to="/transactions"
        >
          عرض {navigationCopy.transactionsStaff} ↗
        </Link>
      ) : null}
    </div>
  )
}
