import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  getApiErrorMessage,
  getApiFieldErrors,
  isApiClientError,
} from '../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../core/api/apiClient'
import {
  canChooseOperationalCourt,
  getAssignedOperationalCourtId,
} from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { AppSelect } from '../../../shared/components/AppSelect/AppSelect'
import { AppSheet } from '../../../shared/components/AppSheet/AppSheet'
import { FilterCheckboxGroup } from '../../../shared/components/FilterCheckboxGroup/FilterCheckboxGroup'
import { FilterSheet } from '../../../shared/components/FilterSheet/FilterSheet'
import { AppSuccessNotice } from '../../../shared/components/AppSuccessNotice/AppSuccessNotice'
import { LiveSearchField } from '../../../shared/components/LiveSearchField/LiveSearchField'
import { ResultRefreshRegion } from '../../../shared/components/ResultRefreshRegion/ResultRefreshRegion'
import { financeCopy, navigationCopy } from '../../../shared/copy/appCopy'
import type { OfflineScope } from '../../../offline/offline.types'
import {
  getOfflineTransactionsView,
  type OfflineTransactionViewParams,
} from '../../../offline/transactions/offlineTransactionFilters'
import { getTransactionSyncWindow } from '../../../offline/transactions/transactionSyncWindow'
import { getScheduleFreshnessLabel } from '../../../offline/schedule/scheduleFreshness'
import { offlineRepositories } from '../../../offline/repositories/offlineRepositories'
import { useOfflineSync } from '../../../offline/sync/offlineSyncContext'
import { buildPathWithQuery } from '../../../shared/utils/buildPathWithQuery'
import type { QueryParamValue } from '../../../shared/utils/buildPathWithQuery'
import {
  formatBookingDateWithWeekday,
  formatBookingTimeRange,
} from '../../bookings/bookingDisplay.helpers'
import {
  formatArabicDateTime,
  formatDateInputValue,
  getLastSevenDaysRange,
} from '../../../shared/utils/date'
import { formatMoneyAmount } from '../../../shared/utils/money'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import type { ClubUser } from '../../clubUsers/clubUsers.types'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import { notifyCurrentFinancialStateChanged } from '../../settlements/currentFinancialStateInvalidation'
import { CancelTransactionSheet } from '../components/CancelTransactionSheet/CancelTransactionSheet'
import type { CancelTransactionValues } from '../components/CancelTransactionSheet/CancelTransactionSheet'
import { cancelTransaction, getTransaction, listTransactions } from '../transactionsApi'
import { getSinglePairValue } from '../transactionFilters.helpers'
import type {
  PaymentMethod,
  Transaction,
  TransactionQueryParams,
  TransactionSettlementStatus,
} from '../transactions.types'
import {
  getTransactionType,
  isRefundTransaction,
  paymentMethodLabels,
  transactionTypeLabels,
} from '../transactions.types'

interface FilterState {
  court: string
  created_by: string
  date_from: string
  date_to: string
  is_cancelled: Array<'false' | 'true'>
  payment_method: PaymentMethod | ''
  settlement_status: TransactionSettlementStatus[]
}

interface FilterOption {
  value: string
  label: string
}

interface FilterLabelMaps {
  courtLabels: Record<string, string>
  collectorLabels: Record<string, string>
}

const transactionFilterKeys = [
  'court',
  'created_by',
  'date',
  'date_from',
  'date_to',
  'is_cancelled',
  'page',
  'payment_method',
  'settlement_status',
] as const

const chipFilterKeys = transactionFilterKeys.filter((key) => key !== 'page')

function createDefaultQueryParams(): TransactionQueryParams {
  return getLastSevenDaysRange()
}

function createOfflineDefaultQueryParams(): TransactionQueryParams {
  const syncWindow = getTransactionSyncWindow()

  return {
    date_from: syncWindow.dateFrom,
    date_to: syncWindow.dateTo,
  }
}

function isPaymentMethod(value: string): value is PaymentMethod {
  return Object.keys(paymentMethodLabels).includes(value)
}

function parseTransactionQueryParams(search: string): TransactionQueryParams {
  const queryObject = toQueryObject(search)
  const params: TransactionQueryParams = {}

  transactionFilterKeys.forEach((key) => {
    const value = queryObject[key]

    if (!value) {
      return
    }

    if (key === 'payment_method') {
      params.payment_method = isPaymentMethod(value) ? value : ''
      return
    }

    if (key === 'settlement_status') {
      params.settlement_status = value as TransactionSettlementStatus
      return
    }

    if (key === 'is_cancelled') {
      params.is_cancelled = value
      return
    }

    if (key === 'court' || key === 'created_by' || key === 'page') {
      params[key] = value
      return
    }

    if (key === 'date' || key === 'date_from' || key === 'date_to') {
      params[key] = value
    }
  })

  return params
}

function hasTransactionFilters(params: TransactionQueryParams): boolean {
  return transactionFilterKeys.some((key) => {
    const value = params[key]

    return value !== undefined && value !== ''
  })
}

function filterStateFromParams(params: TransactionQueryParams): FilterState {
  return {
    court: params.court === undefined ? '' : String(params.court),
    created_by:
      params.created_by === undefined ? '' : String(params.created_by),
    date_from: params.date_from ?? '',
    date_to: params.date_to ?? '',
    is_cancelled:
      params.is_cancelled === undefined
        ? []
        : [String(params.is_cancelled) as 'false' | 'true'],
    payment_method: params.payment_method ?? '',
    settlement_status: params.settlement_status
      ? [params.settlement_status]
      : [],
  }
}

function paramsFromFilterState(filters: FilterState): TransactionQueryParams {
  return {
    ...(filters.court ? { court: filters.court } : {}),
    ...(filters.created_by ? { created_by: filters.created_by } : {}),
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(getSinglePairValue(filters.is_cancelled) !== undefined
      ? { is_cancelled: getSinglePairValue(filters.is_cancelled) }
      : {}),
    ...(filters.payment_method ? { payment_method: filters.payment_method } : {}),
    ...(getSinglePairValue(filters.settlement_status) !== undefined
      ? { settlement_status: getSinglePairValue(filters.settlement_status) }
      : {}),
  }
}

function getTransactionSearch(params: TransactionQueryParams): string {
  return buildPathWithQuery(
    '',
    params as Record<string, QueryParamValue>,
  ).replace(/^\?/, '?')
}

function getChipLabel(
  key: (typeof chipFilterKeys)[number],
  value: string | number | boolean,
  labels: FilterLabelMaps,
): string {
  if (key === 'date') {
    return `تاريخ ${value}`
  }

  if (key === 'date_from') {
    return `من ${value}`
  }

  if (key === 'date_to') {
    return `إلى ${value}`
  }

  if (key === 'court') {
    return labels.courtLabels[String(value)] ?? 'ملعب محدد'
  }

  if (key === 'created_by') {
    return labels.collectorLabels[String(value)] ?? 'موظف محدد'
  }

  if (key === 'payment_method') {
    return paymentMethodLabels[value as PaymentMethod] ?? String(value)
  }

  if (key === 'settlement_status') {
    return value === 'unsettled' ? 'لم يتم استلامها' : 'تم استلامها'
  }

  if (key === 'is_cancelled') {
    return String(value) === 'true' ? 'ملغية' : 'غير ملغية'
  }

  return String(value)
}

function getActiveFilterChips(
  params: TransactionQueryParams,
  labels: FilterLabelMaps,
): Array<{
  key: (typeof chipFilterKeys)[number]
  label: string
}> {
  return chipFilterKeys.flatMap((key) => {
    const value = params[key]

    if (value === undefined || value === '') {
      return []
    }

    return [
      {
        key,
        label: getChipLabel(key, value, labels),
      },
    ]
  })
}

function normalizeClubUsersResponse(
  response: ClubUser[] | { results: ClubUser[] },
): ClubUser[] {
  return Array.isArray(response) ? response : response.results
}

function getClubUserName(user: ClubUser): string {
  const fullName = [user.first_name, user.last_name]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')

  return fullName || user.username || 'مستخدم النادي'
}

function getActorId(
  value: Transaction['created_by'] | Transaction['cancelled_by'],
): number | null {
  if (!value) {
    return null
  }

  return typeof value === 'number' ? value : value.id
}

function getActorName(
  value: Transaction['created_by'] | Transaction['cancelled_by'],
): string | null {
  if (!value || typeof value === 'number') {
    return null
  }

  return value.name ?? null
}

function getTransactionCreatedValue(transaction: Transaction): string {
  return transaction.created ?? transaction.modified ?? ''
}

function hasNonEmptyText(value?: string | null): value is string {
  return Boolean(value?.trim())
}

interface TransactionDetailSheetProps {
  detailError: string | null
  isLoading: boolean
  isOfflineMode: boolean
  onClose: () => void
  transaction: Transaction | null
}

function TransactionDetailSheet({
  detailError,
  isLoading,
  isOfflineMode,
  onClose,
  transaction,
}: TransactionDetailSheetProps) {
  if (!transaction) {
    return null
  }

  const createdLabel = formatArabicDateTime(getTransactionCreatedValue(transaction))
  const bookingDateLabel = transaction.booking_start_time
    ? formatBookingDateWithWeekday(transaction.booking_start_time)
    : null
  const bookingSlotLabel =
    transaction.booking_start_time && transaction.booking_end_time
      ? formatBookingTimeRange(
          transaction.booking_start_time,
          transaction.booking_end_time,
        )
      : null
  const collectorName =
    transaction.created_by_username ||
    getActorName(transaction.created_by) ||
    null
  const cancellationActor =
    getActorName(transaction.cancelled_by) ??
    (getActorId(transaction.cancelled_by)
      ? `مستخدم #${getActorId(transaction.cancelled_by)}`
      : null)
  const transactionType = getTransactionType(transaction)
  const isReferenceVisible =
    transaction.payment_method !== 'CASH' &&
    hasNonEmptyText(transaction.payment_reference)

  return (
    <AppSheet
      className="md:max-w-lg"
      onRequestClose={onClose}
      title="تفاصيل العملية المالية"
    >
      <div className="space-y-4">
        {isOfflineMode ? (
          <p className="rounded-xl bg-[var(--sloty-soft-mint)] px-3 py-2 text-xs font-bold text-[var(--sloty-primary-dark)]">
            بدون إنترنت · تفاصيل العملية للقراءة فقط، وأي إجراء مالي يحتاج اتصال.
          </p>
        ) : null}

        {detailError ? (
          <p className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {detailError}
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل تفاصيل العملية...
          </p>
        ) : null}

        <div className="space-y-1">
          <p className="text-xl font-black text-[var(--sloty-primary-dark)]">
            {formatMoneyAmount(transaction.amount, { suffix: 'ج.م' })}
          </p>
          <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
            {transactionTypeLabels[transactionType]} ·{' '}
            {paymentMethodLabels[transaction.payment_method]}
          </p>
          {createdLabel ? (
            <p className="text-sm font-semibold text-[var(--sloty-text-muted)]">
              اتسجلت: {createdLabel}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {bookingDateLabel || bookingSlotLabel ? (
            <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
              <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                الحجز
              </p>
              {bookingDateLabel ? (
                <p className="mt-1 text-sm font-bold text-[var(--sloty-text-primary)]">
                  {bookingDateLabel}
                </p>
              ) : null}
              {bookingSlotLabel ? (
                <p className="text-sm font-semibold text-[var(--sloty-text-primary)]">
                  {bookingSlotLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          {transaction.court_name ? (
            <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
              <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                الملعب
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--sloty-text-primary)]">
                {transaction.court_name}
              </p>
            </div>
          ) : null}

          {collectorName ? (
            <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
              <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                {financeCopy.collectedBy}
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--sloty-text-primary)]">
                {collectorName}
              </p>
            </div>
          ) : null}

          <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
            <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
              حالة الاستلام
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--sloty-text-primary)]">
              {transaction.is_settled ? 'تم استلامها' : 'لم يتم استلامها'}
            </p>
          </div>
        </div>

        {isReferenceVisible ? (
          <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
            <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
              {financeCopy.paymentReference}
            </p>
            <p className="mt-1 break-words text-sm font-bold text-[var(--sloty-text-primary)]">
              {transaction.payment_reference}
            </p>
          </div>
        ) : null}

        {hasNonEmptyText(transaction.notes) ? (
          <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
            <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
              ملاحظات
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-[var(--sloty-text-primary)]">
              {transaction.notes}
            </p>
          </div>
        ) : null}

        {transaction.is_cancelled ? (
          <div className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2">
            <p className="text-sm font-bold text-[var(--sloty-danger)]">
              العملية ملغية
            </p>
            {hasNonEmptyText(transaction.cancellation_reason) ? (
              <p className="mt-1 text-sm font-semibold text-[var(--sloty-danger)]">
                {transaction.cancellation_reason}
              </p>
            ) : null}
            {transaction.cancelled_at ? (
              <p className="mt-1 text-xs font-bold text-[var(--sloty-danger)]">
                {formatArabicDateTime(transaction.cancelled_at)}
              </p>
            ) : null}
            {cancellationActor ? (
              <p className="mt-1 text-xs font-bold text-[var(--sloty-danger)]">
                بواسطة: {cancellationActor}
              </p>
            ) : null}
          </div>
        ) : null}

        <AppButton fullWidth onClick={onClose} type="button" variant="secondary">
          إغلاق
        </AppButton>
      </div>
    </AppSheet>
  )
}

interface TransactionsFilterFormProps {
  canChooseCollector: boolean
  canChooseCourt: boolean
  collectorOptions: FilterOption[]
  courtOptions: FilterOption[]
  initialFilters: FilterState
  isLoading: boolean
  onClose?: () => void
  onApply: (filters: FilterState) => void
  onReset: () => void
}

function TransactionsFilterForm({
  canChooseCollector,
  canChooseCourt,
  collectorOptions,
  courtOptions,
  initialFilters,
  isLoading,
  onClose,
  onApply,
  onReset,
}: TransactionsFilterFormProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters)

  function updateFilter<Key extends keyof FilterState>(
    field: Key,
    value: FilterState[Key],
  ): void {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }))
  }

  function toggleFilterValue<Value extends string>(
    values: Value[],
    value: Value,
    checked: boolean,
  ): Value[] {
    return checked
      ? Array.from(new Set([...values, value]))
      : values.filter((item) => item !== value)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onApply(filters)
    onClose?.()
  }

  const paymentMethodOptions = [
    { value: '', label: 'كل طرق الدفع' },
    ...Object.entries(paymentMethodLabels).map(([value, label]) => ({
      value,
      label,
    })),
  ]

  const courtFilterOptions = [
    { value: '', label: 'كل الملاعب' },
    ...(filters.court
    && !courtOptions.some((option) => option.value === filters.court)
      ? [{ value: filters.court, label: 'ملعب محدد' }]
      : []),
    ...courtOptions,
  ]

  const collectorFilterOptions = [
    { value: '', label: 'كل الموظفين' },
    ...(filters.created_by
    && !collectorOptions.some((option) => option.value === filters.created_by)
      ? [
        {
          value: filters.created_by,
          label: 'موظف محدد',
        },
      ]
      : []),
    ...collectorOptions,
  ]

  return (
    <form
      className="grid grid-cols-1 gap-3 md:grid-cols-4"
      onSubmit={handleSubmit}
    >
      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>من تاريخ</span>
        <input
          className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('date_from', event.target.value)}
          type="date"
          value={filters.date_from}
        />
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>إلى تاريخ</span>
        <input
          className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('date_to', event.target.value)}
          type="date"
          value={filters.date_to}
        />
      </label>

      <FilterCheckboxGroup
        className="md:col-span-2 xl:col-span-1"
        label="حالة الاستلام"
        onChange={(key, checked) =>
          updateFilter(
            'settlement_status',
            toggleFilterValue(
              filters.settlement_status,
              key as TransactionSettlementStatus,
              checked,
            ),
          )
        }
        options={[
          {
            key: 'unsettled',
            label: 'لم يتم استلامها',
            checked: filters.settlement_status.includes('unsettled'),
          },
          {
            key: 'settled',
            label: 'تم استلامها',
            checked: filters.settlement_status.includes('settled'),
          },
        ]}
      />

      <FilterCheckboxGroup
        className="md:col-span-2 xl:col-span-1"
        label="حالة الإلغاء"
        onChange={(key, checked) =>
          updateFilter(
            'is_cancelled',
            toggleFilterValue(
              filters.is_cancelled,
              key as 'false' | 'true',
              checked,
            ),
          )
        }
        options={[
          {
            key: 'false',
            label: 'غير ملغية',
            checked: filters.is_cancelled.includes('false'),
          },
          {
            key: 'true',
            label: 'ملغية',
            checked: filters.is_cancelled.includes('true'),
          },
        ]}
      />

      <AppSelect
        label="طريقة الدفع"
        onChange={(value) =>
          updateFilter('payment_method', value as PaymentMethod | '')
        }
        options={paymentMethodOptions}
        value={filters.payment_method}
      />

      {canChooseCourt ? (
        <AppSelect
          label="الملعب"
          onChange={(value) => updateFilter('court', value)}
          options={courtFilterOptions}
          value={filters.court}
        />
      ) : (
        <div className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
          <span>الملعب</span>
          <div className="flex h-11 items-center rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm">
            {courtOptions[0]?.label ?? 'ملعب المستخدم'}
          </div>
        </div>
      )}

      {canChooseCollector ? (
        <AppSelect
          label="الموظف المحصل"
          onChange={(value) => updateFilter('created_by', value)}
          options={collectorFilterOptions}
          value={filters.created_by}
        />
      ) : null}

      <div className="flex flex-col gap-2 md:justify-end">
        <AppButton disabled={isLoading} fullWidth type="submit">
          تطبيق الفلاتر
        </AppButton>
        <AppButton
          disabled={isLoading}
          fullWidth
          onClick={() => {
            onReset()
            onClose?.()
          }}
          type="button"
          variant="secondary"
        >
          إعادة ضبط
        </AppButton>
      </div>
    </form>
  )
}

/**
 * Basic transaction history for the currently selected club context.
 */
export function TransactionsListPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, role, selectedClubSlug, selectedMembership } = useAuth()
  const { connectivity } = useOfflineSync()
  const assignedCourtId = getAssignedOperationalCourtId(
    role,
    selectedMembership,
  )
  const canChooseCourt = canChooseOperationalCourt(role, selectedMembership)
  const canChooseCollector = canChooseCourt
  const [usesUnfilteredEmptyUrl, setUsesUnfilteredEmptyUrl] = useState(false)
  const [offlineSearchDraft, setOfflineSearchDraft] = useState('')
  const [offlineSearchQuery, setOfflineSearchQuery] = useState('')
  const [offlineSearchResetToken, setOfflineSearchResetToken] = useState(0)
  const [offlineSort, setOfflineSort] = useState<'newest' | 'oldest'>('newest')
  const urlParams = useMemo(
    () => parseTransactionQueryParams(location.search),
    [location.search],
  )
  const isOfflineMode =
    connectivity.browserNetwork === 'offline' ||
    connectivity.backendReachability === 'unreachable'
  const offlineScope = useMemo<OfflineScope | null>(() => {
    if (!currentUser || !selectedClubSlug) {
      return null
    }

    return {
      userId: currentUser.id,
      clubSlug: selectedClubSlug,
    }
  }, [currentUser, selectedClubSlug])
  const scopedUrlParams = useMemo(() => {
    if (canChooseCourt) {
      return urlParams
    }

    const staffParams = { ...urlParams }
    delete staffParams.court
    // Backend self-scopes Staff collections to assigned Court + current user.
    // Do not send created_by=currentUser as a frontend security/scoping hack.
    delete staffParams.created_by
    return staffParams
  }, [canChooseCourt, urlParams])
  const urlHasTransactionFilters = hasTransactionFilters(scopedUrlParams)
  const effectiveParams = useMemo(() => {
    const fixedCourtParams =
      !canChooseCourt && assignedCourtId
        ? { court: String(assignedCourtId) }
        : {}

    if (urlHasTransactionFilters) {
      return {
        ...scopedUrlParams,
        ...fixedCourtParams,
      }
    }

    return {
      ...(usesUnfilteredEmptyUrl ? {} : createDefaultQueryParams()),
      ...fixedCourtParams,
    }
  }, [
    assignedCourtId,
    canChooseCourt,
    urlHasTransactionFilters,
    scopedUrlParams,
    usesUnfilteredEmptyUrl,
  ])
  const offlineBaseParams = useMemo(
    () =>
      isOfflineMode && !urlHasTransactionFilters && !usesUnfilteredEmptyUrl
        ? createOfflineDefaultQueryParams()
        : effectiveParams,
    [
      effectiveParams,
      isOfflineMode,
      urlHasTransactionFilters,
      usesUnfilteredEmptyUrl,
    ],
  )
  const initialFilters = useMemo(
    () => filterStateFromParams(offlineBaseParams),
    [offlineBaseParams],
  )
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Transaction | null>(null)
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelFieldErrors, setCancelFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [offlineLastSyncAt, setOfflineLastSyncAt] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [courtOptions, setCourtOptions] = useState<FilterOption[]>([])
  const [collectorOptions, setCollectorOptions] = useState<FilterOption[]>([])
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null)
  const filterLabelMaps = useMemo<FilterLabelMaps>(
    () => ({
      collectorLabels: Object.fromEntries(
        collectorOptions.map((option) => [option.value, option.label]),
      ),
      courtLabels: Object.fromEntries(
        courtOptions.map((option) => [option.value, option.label]),
      ),
    }),
    [collectorOptions, courtOptions],
  )
  const visibleEffectiveParams = useMemo(() => {
    if (canChooseCourt) {
      return effectiveParams
    }

    const visibleParams = { ...effectiveParams }
    delete visibleParams.court
    delete visibleParams.created_by
    return visibleParams
  }, [canChooseCourt, effectiveParams])
  const activeFilterChips = getActiveFilterChips(
    visibleEffectiveParams,
    filterLabelMaps,
  )
  const hasActiveFilters = activeFilterChips.length > 0
  const offlineFreshness = getScheduleFreshnessLabel(offlineLastSyncAt)

  const loadOfflineTransactions = useCallback(async (
    fallbackError?: unknown,
  ): Promise<boolean> => {
    if (!offlineScope) {
      return false
    }

    const metadata = await offlineRepositories.getSyncMetadata(offlineScope)
    const cachedTransactions = await offlineRepositories.readCachedTransactions(
      offlineScope,
    )

    setOfflineLastSyncAt(metadata?.transactions_last_sync_at ?? null)

    if (!metadata?.transactions_last_sync_at) {
      setTransactions([])
      setError(null)
      setMessage(
        fallbackError
          ? 'تعذر الاتصال بالخادم، ومفيش سجل معاملات محفوظ على الجهاز.'
          : 'سجل المعاملات محتاج إنترنت أول مرة علشان يتعرض.',
      )
      return true
    }

    const offlineView = getOfflineTransactionsView(
      cachedTransactions,
      {
        ...offlineBaseParams,
        search: offlineSearchQuery,
        sort: offlineSort,
      } satisfies OfflineTransactionViewParams,
    )

    if (offlineView.state === 'outside_window') {
      setTransactions([])
      setError(null)
      setMessage('البيانات للفترة دي محتاجة إنترنت علشان تتعرض.')
      return true
    }

    setTransactions(offlineView.transactions)
    setError(null)
    setMessage(null)

    return true
  }, [
    offlineBaseParams,
    offlineScope,
    offlineSearchQuery,
    offlineSort,
  ])

  useEffect(() => {
    let isActive = true

    async function loadFilterOptions(): Promise<void> {
      if (!selectedClubSlug || isOfflineMode) {
        setCourtOptions([])
        setCollectorOptions([])
        setFilterOptionsError(null)
        return
      }

      setFilterOptionsError(null)

      try {
        const [courtsResponse, usersResponse] = await Promise.all([
          canChooseCourt ? listCourts(selectedClubSlug) : Promise.resolve(null),
          canChooseCollector
            ? listClubUsers(selectedClubSlug, { is_active: true })
            : Promise.resolve(null),
        ])

        if (!isActive) {
          return
        }

        setCourtOptions(
          canChooseCourt && courtsResponse
            ? courtsResponse.results
                .filter((court: Court) => court.is_active)
                .map((court) => ({
                  value: String(court.id),
                  label: court.name,
                }))
            : selectedMembership?.court
              ? [
                  {
                    value: String(selectedMembership.court.id),
                    label: selectedMembership.court.name,
                  },
                ]
              : [],
        )
        setCollectorOptions(
          usersResponse
            ? normalizeClubUsersResponse(usersResponse).map((user) => ({
                value: String(user.id),
                label: getClubUserName(user),
              }))
            : [],
        )
      } catch {
        if (isActive) {
          setCourtOptions([])
          setCollectorOptions([])
          setFilterOptionsError('تعذر تحميل خيارات الفلاتر')
        }
      }
    }

    void loadFilterOptions()

    return () => {
      isActive = false
    }
  }, [
    canChooseCollector,
    canChooseCourt,
    isOfflineMode,
    selectedClubSlug,
    selectedMembership,
  ])

  async function reloadTransactions(
    nextParams = effectiveParams,
  ): Promise<void> {
    if (!selectedClubSlug) {
      setTransactions([])
      return
    }

    const transactionsResponse = await listTransactions(
      selectedClubSlug,
      nextParams,
    )
    setTransactions(transactionsResponse.results)
  }

  useEffect(() => {
    let isActive = true

    async function loadTransactions(): Promise<void> {
      if (!selectedClubSlug) {
        setTransactions([])
        setError(null)
        setMessage('اختر ناديًا أولًا لعرض المعاملات المالية')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setIsRefreshing(false)
      setError(null)
      setMessage(null)

      try {
        if (isOfflineMode) {
          await loadOfflineTransactions()
          return
        }

        const transactionsResponse = await listTransactions(
          selectedClubSlug,
          effectiveParams,
        )

        if (isActive) {
          setTransactions(transactionsResponse.results)
          setOfflineLastSyncAt(null)
        }
      } catch (error) {
        if (isActive) {
          if (
            isApiClientError(error) &&
            (error.status === 0 || error.status >= 500)
          ) {
            try {
              if (await loadOfflineTransactions(error)) {
                return
              }
            } catch {
              // Keep the original API error visible if IndexedDB fallback fails.
            }
          }

          setTransactions([])
          setError(
            getApiErrorMessage(
              error,
              'تعذر تحميل المعاملات المالية. حاول مرة أخرى',
            ),
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    }

    void loadTransactions()

    return () => {
      isActive = false
    }
  }, [
    effectiveParams,
    isOfflineMode,
    loadOfflineTransactions,
    offlineSearchQuery,
    offlineSort,
    selectedClubSlug,
  ])

  function handleApplyFilters(nextFilters: FilterState): void {
    const nextParams = paramsFromFilterState(nextFilters)
    delete nextParams.page
    if (!canChooseCourt) {
      delete nextParams.court
      delete nextParams.created_by
    }
    const nextSearch = getTransactionSearch(nextParams)

    setUsesUnfilteredEmptyUrl(!nextSearch)
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch,
      },
      { replace: false },
    )
  }

  function applyQuickParams(nextParams: TransactionQueryParams): void {
    setUsesUnfilteredEmptyUrl(false)
    navigate(
      {
        pathname: location.pathname,
        search: getTransactionSearch(nextParams),
      },
      { replace: false },
    )
  }

  function handleQuickLastSevenDays(): void {
    applyQuickParams(
      isOfflineMode ? createOfflineDefaultQueryParams() : createDefaultQueryParams(),
    )
  }

  function handleQuickToday(): void {
    const today = formatDateInputValue(new Date())

    applyQuickParams({
      date_from: today,
      date_to: today,
    })
  }

  function handleQuickUnsettled(): void {
    applyQuickParams({
      settlement_status: 'unsettled',
      is_cancelled: 'false',
    })
  }

  function handleResetFilters(): void {
    const defaultParams = isOfflineMode
      ? createOfflineDefaultQueryParams()
      : createDefaultQueryParams()

    setUsesUnfilteredEmptyUrl(false)
    navigate(
      {
        pathname: location.pathname,
        search: getTransactionSearch(defaultParams),
      },
      { replace: false },
    )
  }

  function handleRemoveFilter(key: (typeof chipFilterKeys)[number]): void {
    const nextParams = { ...scopedUrlParams }

    delete nextParams[key]
    delete nextParams.page

    const nextSearch = getTransactionSearch(nextParams)

    setUsesUnfilteredEmptyUrl(!nextSearch)
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch,
      },
      { replace: false },
    )
  }

  async function handleCancelTransaction(
    values: CancelTransactionValues,
  ): Promise<void> {
    if (!selectedClubSlug || !cancelTarget || isOfflineMode) {
      if (isOfflineMode) {
        setCancelError('يحتاج اتصال بالإنترنت')
      }
      return
    }

    setIsCancelSubmitting(true)
    setCancelError(null)
    setCancelFieldErrors(null)

    try {
      await cancelTransaction(selectedClubSlug, cancelTarget.id, values)
      setCancelTarget(null)
      setSuccessMessage('تم إلغاء العملية')
      notifyCurrentFinancialStateChanged({
        clubSlug: selectedClubSlug,
        reason: 'transaction-cancellation',
      })
      await reloadTransactions()
    } catch (error) {
      setCancelError(
        getApiErrorMessage(error, 'تعذر إلغاء التحصيل. حاول مرة أخرى'),
      )
      setCancelFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsCancelSubmitting(false)
    }
  }

  const handleOfflineSearch = useCallback((value: string): void => {
    setOfflineSearchQuery(value)
  }, [])

  function handleClearOfflineSearch(): void {
    setOfflineSearchDraft('')
    setOfflineSearchQuery('')
    setOfflineSearchResetToken((currentToken) => currentToken + 1)
  }

  async function loadAuthoritativeTransactionDetail(
    transactionId: number,
  ): Promise<Transaction> {
    if (!selectedClubSlug) {
      throw new Error('Transaction detail requires a selected Club.')
    }

    const freshTransaction = await getTransaction(selectedClubSlug, transactionId)

    if (offlineScope) {
      void offlineRepositories.saveTransactionDetail(
        offlineScope,
        freshTransaction,
        new Date().toISOString(),
      )
    }

    return freshTransaction
  }

  async function handleSelectTransaction(transaction: Transaction): Promise<void> {
    setSelectedTransaction(transaction)
    setDetailError(null)

    if (isOfflineMode) {
      if (!offlineScope) {
        return
      }

      const cachedDetail = await offlineRepositories.readTransactionDetail(
        offlineScope,
        transaction.id,
      )

      if (cachedDetail) {
        setSelectedTransaction(cachedDetail)
      }
      return
    }

    setIsDetailLoading(true)

    try {
      setSelectedTransaction(
        await loadAuthoritativeTransactionDetail(transaction.id),
      )
    } catch (error) {
      setDetailError(
        getApiErrorMessage(
          error,
          'تعذر تحميل تفاصيل العملية. البيانات المعروضة من السجل الحالي.',
        ),
      )
    } finally {
      setIsDetailLoading(false)
    }
  }

  function closeTransactionDetail(): void {
    setSelectedTransaction(null)
    setDetailError(null)
    setIsDetailLoading(false)
  }

  return (
    <div className="space-y-5">
      {role !== 'STAFF' ? (
        <Link
          className="inline-flex text-sm font-black text-[var(--sloty-primary-dark)]"
          to="/settlements"
        >
          {navigationCopy.ledgerBackToMoney}
        </Link>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <AppButton onClick={handleQuickLastSevenDays} type="button" variant="secondary">
          آخر 7 أيام
        </AppButton>
        <AppButton onClick={handleQuickToday} type="button" variant="secondary">
          اليوم
        </AppButton>
        <AppButton onClick={handleQuickUnsettled} type="button" variant="secondary">
          لم يتم استلامها
        </AppButton>
        <AppButton onClick={() => setIsFilterSheetOpen(true)} type="button">
          فلترة
        </AppButton>
      </div>

      {isOfflineMode ? (
        <AppCard className="border-[var(--sloty-primary)]/20 bg-[var(--sloty-soft-mint)]">
          <p className="text-sm font-extrabold text-[var(--sloty-primary-dark)]">
            بدون إنترنت
            {offlineFreshness ? ` · ${offlineFreshness.text}` : ''}
          </p>
          <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
            سجل المعاملات المعروض محدود بآخر ٧ أيام محفوظة على الجهاز. البحث
            دون إنترنت يشمل مرجع الدفع فقط لأن بيانات العميل غير موجودة كاملة في
            سجل المعاملات الحالي.
          </p>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
            <LiveSearchField
              aria-label="بحث في المعاملات المحفوظة"
              debounceMs={120}
              key={`offline-transaction-search-${offlineSearchResetToken}`}
              label="بحث محفوظ"
              onDraftChange={setOfflineSearchDraft}
              onSearch={handleOfflineSearch}
              placeholder="مرجع الدفع"
              value={offlineSearchQuery}
            />
            <div className="flex shrink-0 gap-2">
              <AppButton
                onClick={() => setOfflineSort('newest')}
                type="button"
                variant={offlineSort === 'newest' ? 'primary' : 'secondary'}
              >
                ↓ الأحدث
              </AppButton>
              <AppButton
                onClick={() => setOfflineSort('oldest')}
                type="button"
                variant={offlineSort === 'oldest' ? 'primary' : 'secondary'}
              >
                ↑ الأقدم
              </AppButton>
              {offlineSearchDraft || offlineSearchQuery ? (
                <AppButton
                  onClick={handleClearOfflineSearch}
                  type="button"
                  variant="secondary"
                >
                  مسح البحث
                </AppButton>
              ) : null}
            </div>
          </div>
        </AppCard>
      ) : null}

      {filterOptionsError ? (
        <p className="text-xs font-bold text-[var(--sloty-danger)]">
          {filterOptionsError}
        </p>
      ) : null}

      <AppCard className="hidden md:block">
        <TransactionsFilterForm
          canChooseCollector={canChooseCollector}
          canChooseCourt={canChooseCourt}
          collectorOptions={collectorOptions}
          courtOptions={courtOptions}
          initialFilters={initialFilters}
          isLoading={isLoading}
          key={`desktop-${getTransactionSearch(effectiveParams) || 'empty-filters'}`}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />
      </AppCard>

      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="فلترة المعاملات المالية"
      >
        <TransactionsFilterForm
          canChooseCollector={canChooseCollector}
          canChooseCourt={canChooseCourt}
          collectorOptions={collectorOptions}
          courtOptions={courtOptions}
          initialFilters={initialFilters}
          isLoading={isLoading}
          key={`mobile-${getTransactionSearch(effectiveParams) || 'empty-filters'}`}
          onApply={handleApplyFilters}
          onClose={() => setIsFilterSheetOpen(false)}
          onReset={handleResetFilters}
        />
      </FilterSheet>

      {hasActiveFilters ? (
        <div className="flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <button
              aria-label={`إزالة فلتر ${chip.label}`}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)] transition hover:bg-emerald-100"
              key={chip.key}
              onClick={() => handleRemoveFilter(chip.key)}
              type="button"
            >
              {chip.label}
              <span aria-hidden="true" className="text-sm leading-none">×</span>
            </button>
          ))}
        </div>
      ) : null}

      {successMessage ? (
        <AppSuccessNotice
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      ) : null}

      <ResultRefreshRegion isRefreshing={isRefreshing}>
      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل المعاملات المالية...
          </p>
        </AppCard>
      ) : null}

      {!isLoading && (error || message) ? (
        <AppCard>
          <p
            className={[
              'text-sm font-bold',
              error
                ? 'text-[var(--sloty-danger)]'
                : 'text-[var(--sloty-text-muted)]',
            ].join(' ')}
          >
            {error ?? message}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && !message && transactions.length === 0 ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            {isOfflineMode && offlineSearchQuery
              ? 'ملقيناش معاملات محفوظة مطابقة للبحث.'
              : urlHasTransactionFilters
              ? 'مفيش عمليات مالية مطابقة للفلاتر الحالية.'
              : role === 'STAFF'
                ? 'مفيش عمليات تحصيل لسه.'
                : 'مفيش عمليات مالية لسه.'}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && transactions.length > 0 ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {transactions.map((transaction) => {
            const createdLabel = formatArabicDateTime(transaction.created)
            const createdById = getActorId(transaction.created_by)
            const collectorName =
              transaction.created_by_username ||
              getActorName(transaction.created_by) ||
              (createdById
                ? filterLabelMaps.collectorLabels[String(createdById)]
                : null)
            const bookingDateLabel = transaction.booking_start_time
              ? formatBookingDateWithWeekday(transaction.booking_start_time)
              : null
            const bookingSlotLabel =
              transaction.booking_start_time && transaction.booking_end_time
                ? formatBookingTimeRange(
                    transaction.booking_start_time,
                    transaction.booking_end_time,
                  )
                : createdLabel
            const transactionType = getTransactionType(transaction)
            const isRefund = isRefundTransaction(transaction)
            const canCancel =
              !isOfflineMode &&
              !isRefund &&
              transaction.is_cancelled !== true &&
              transaction.is_settled !== true &&
              (!currentUser?.id || !createdById || currentUser.id === createdById)

            return (
              <AppCard className="space-y-3" key={transaction.id}>
                <div className="space-y-1">
                  {bookingDateLabel ? (
                    <p className="text-base font-bold text-[var(--sloty-text-primary)]">
                      {bookingDateLabel}
                    </p>
                  ) : null}
                  {bookingSlotLabel ? (
                    <p className="text-sm font-semibold text-[var(--sloty-text-primary)]">
                      {bookingSlotLabel}
                    </p>
                  ) : null}
                  <p className="text-lg font-bold text-[var(--sloty-primary-dark)]">
                    {formatMoneyAmount(transaction.amount, { suffix: 'ج.م' })} ·{' '}
                    {paymentMethodLabels[transaction.payment_method]}
                  </p>
                  {collectorName ? (
                    <p className="text-sm font-medium text-[var(--sloty-text-muted)]">
                      {financeCopy.collectedBy}: {collectorName}
                    </p>
                  ) : null}
                  {transaction.court_name ? (
                    <p className="text-sm font-medium text-[var(--sloty-text-muted)]">
                      {transaction.court_name}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                    <span
                      className={[
                        'rounded-full px-3 py-1 text-xs font-semibold',
                        isRefund
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]',
                      ].join(' ')}
                    >
                      {transactionTypeLabels[transactionType]}
                    </span>
                    {transaction.is_cancelled ? (
                      <span className="rounded-full bg-[var(--sloty-danger-soft)] px-3 py-1 text-xs font-semibold text-[var(--sloty-danger)]">
                        ملغية
                      </span>
                    ) : null}
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {transaction.is_settled ? 'تم استلامها' : 'لم يتم استلامها'}
                    </span>
                </div>

                {transaction.payment_method !== 'CASH' &&
                transaction.payment_reference ? (
                  <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm">
                    <p className="font-medium text-[var(--sloty-text-muted)]">
                      {financeCopy.paymentReference}
                    </p>
                    <p className="mt-1 font-semibold text-[var(--sloty-text-primary)]">
                      {transaction.payment_reference}
                    </p>
                  </div>
                ) : null}
                  {transaction.cancellation_reason ? (
                    <div className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2">
                      <p className="font-semibold text-[var(--sloty-danger)]">
                        سبب الإلغاء
                      </p>
                      <p className="mt-1 font-semibold text-[var(--sloty-danger)]">
                        {transaction.cancellation_reason}
                      </p>
                    </div>
                  ) : null}

                {canCancel ? (
                  <AppButton
                    fullWidth
                    onClick={() => {
                      setCancelTarget(transaction)
                      setCancelError(null)
                      setCancelFieldErrors(null)
                    }}
                    variant="danger"
                  >
                    إلغاء التحصيل
                  </AppButton>
                ) : null}
                <AppButton
                  fullWidth
                  onClick={() => {
                    void handleSelectTransaction(transaction)
                  }}
                  type="button"
                  variant="secondary"
                >
                  عرض التفاصيل
                </AppButton>
              </AppCard>
            )
          })}
        </section>
      ) : null}
      </ResultRefreshRegion>

      {cancelTarget && !isOfflineMode ? (
        <CancelTransactionSheet
          error={cancelError}
          fieldErrors={cancelFieldErrors}
          isSubmitting={isCancelSubmitting}
          onClose={() => {
            setCancelTarget(null)
            setCancelError(null)
            setCancelFieldErrors(null)
          }}
          onSubmit={handleCancelTransaction}
        />
      ) : null}

      <TransactionDetailSheet
        detailError={detailError}
        isLoading={isDetailLoading}
        isOfflineMode={isOfflineMode}
        onClose={closeTransactionDetail}
        transaction={selectedTransaction}
      />
    </div>
  )
}
