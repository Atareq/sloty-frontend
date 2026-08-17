import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  getApiErrorMessage,
  getApiFieldErrors,
} from '../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../core/api/apiClient'
import {
  canChooseOperationalCourt,
  getAssignedOperationalCourtId,
} from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { FilterSheet } from '../../../shared/components/FilterSheet/FilterSheet'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { buildPathWithQuery } from '../../../shared/utils/buildPathWithQuery'
import type { QueryParamValue } from '../../../shared/utils/buildPathWithQuery'
import {
  formatDateInputValue,
  getLastSevenDaysRange,
} from '../../../shared/utils/date'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import type { ClubUser } from '../../clubUsers/clubUsers.types'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import { CancelTransactionSheet } from '../components/CancelTransactionSheet/CancelTransactionSheet'
import type { CancelTransactionValues } from '../components/CancelTransactionSheet/CancelTransactionSheet'
import { cancelTransaction, listTransactions } from '../transactionsApi'
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
  is_cancelled: string
  payment_method: PaymentMethod | ''
  settlement_status: TransactionSettlementStatus | ''
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
      params.is_cancelled === undefined ? '' : String(params.is_cancelled),
    payment_method: params.payment_method ?? '',
    settlement_status: params.settlement_status ?? '',
  }
}

function paramsFromFilterState(filters: FilterState): TransactionQueryParams {
  return {
    ...(filters.court ? { court: filters.court } : {}),
    ...(filters.created_by ? { created_by: filters.created_by } : {}),
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(filters.is_cancelled ? { is_cancelled: filters.is_cancelled } : {}),
    ...(filters.payment_method ? { payment_method: filters.payment_method } : {}),
    ...(filters.settlement_status
      ? { settlement_status: filters.settlement_status }
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
    return labels.courtLabels[String(value)] ?? `ملعب #${value}`
  }

  if (key === 'created_by') {
    return labels.collectorLabels[String(value)] ?? `الموظف المحصل #${value}`
  }

  if (key === 'payment_method') {
    return paymentMethodLabels[value as PaymentMethod] ?? String(value)
  }

  if (key === 'settlement_status') {
    return value === 'unsettled' ? 'غير مسواة' : 'مسواة'
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

  return fullName || user.username || `#${user.id}`
}

function formatTransactionDate(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
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

  return value.name ?? `#${value.id}`
}

interface TransactionsFilterFormProps {
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

  function updateFilter(field: keyof FilterState, value: string): void {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onApply(filters)
    onClose?.()
  }

  return (
    <form
      className="grid grid-cols-1 gap-3 md:grid-cols-4"
      onSubmit={handleSubmit}
    >
      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>من تاريخ</span>
        <input
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('date_from', event.target.value)}
          type="date"
          value={filters.date_from}
        />
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>إلى تاريخ</span>
        <input
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('date_to', event.target.value)}
          type="date"
          value={filters.date_to}
        />
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>حالة التسوية</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('settlement_status', event.target.value)}
          value={filters.settlement_status}
        >
          <option value="">الكل</option>
          <option value="unsettled">غير مسواة</option>
          <option value="settled">مسواة</option>
        </select>
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>حالة الإلغاء</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('is_cancelled', event.target.value)}
          value={filters.is_cancelled}
        >
          <option value="">الكل</option>
          <option value="false">غير ملغية</option>
          <option value="true">ملغية</option>
        </select>
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>طريقة الدفع</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('payment_method', event.target.value)}
          value={filters.payment_method}
        >
          <option value="">كل طرق الدفع</option>
          {Object.entries(paymentMethodLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {canChooseCourt ? (
        <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
          <span>الملعب</span>
          <select
            className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
            onChange={(event) => updateFilter('court', event.target.value)}
            value={filters.court}
          >
            <option value="">كل الملاعب</option>
            {filters.court && !courtOptions.some((option) => option.value === filters.court) ? (
              <option value={filters.court}>ملعب #{filters.court}</option>
            ) : null}
            {courtOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
          <span>الملعب</span>
          <div className="flex h-11 items-center rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm">
            {courtOptions[0]?.label ?? 'ملعب المستخدم'}
          </div>
        </div>
      )}

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>الموظف المحصل</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('created_by', event.target.value)}
          value={filters.created_by}
        >
          <option value="">كل الموظفين</option>
          {filters.created_by
          && !collectorOptions.some((option) => option.value === filters.created_by) ? (
            <option value={filters.created_by}>
              الموظف المحصل #{filters.created_by}
            </option>
          ) : null}
          {collectorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

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
        {onClose ? (
          <AppButton fullWidth onClick={onClose} type="button" variant="secondary">
            إغلاق
          </AppButton>
        ) : null}
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
  const assignedCourtId = getAssignedOperationalCourtId(
    role,
    selectedMembership,
  )
  const canChooseCourt = canChooseOperationalCourt(role, selectedMembership)
  const [usesUnfilteredEmptyUrl, setUsesUnfilteredEmptyUrl] = useState(false)
  const urlParams = useMemo(
    () => parseTransactionQueryParams(location.search),
    [location.search],
  )
  const urlHasTransactionFilters = hasTransactionFilters(urlParams)
  const effectiveParams = useMemo(() => {
    const fixedCourtParams =
      !canChooseCourt && assignedCourtId
        ? { court: String(assignedCourtId) }
        : {}

    if (urlHasTransactionFilters) {
      return {
        ...urlParams,
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
    urlParams,
    usesUnfilteredEmptyUrl,
  ])
  const initialFilters = useMemo(
    () => filterStateFromParams(effectiveParams),
    [effectiveParams],
  )
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState<Transaction | null>(null)
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelFieldErrors, setCancelFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [courtOptions, setCourtOptions] = useState<FilterOption[]>([])
  const [collectorOptions, setCollectorOptions] = useState<FilterOption[]>([])
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null)
  const selectedClubName = selectedMembership?.club.name ?? null
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
  const activeFilterChips = getActiveFilterChips(effectiveParams, filterLabelMaps)
  const hasActiveFilters = activeFilterChips.length > 0

  useEffect(() => {
    let isActive = true

    async function loadFilterOptions(): Promise<void> {
      if (!selectedClubSlug) {
        setCourtOptions([])
        setCollectorOptions([])
        setFilterOptionsError(null)
        return
      }

      setFilterOptionsError(null)

      try {
        const [courtsResponse, usersResponse] = await Promise.all([
          canChooseCourt ? listCourts(selectedClubSlug) : Promise.resolve(null),
          listClubUsers(selectedClubSlug, { is_active: true }),
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
          normalizeClubUsersResponse(usersResponse).map((user) => ({
            value: String(user.id),
            label: getClubUserName(user),
          })),
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
  }, [canChooseCourt, selectedClubSlug, selectedMembership])

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
        setMessage('اختر ناديًا أولًا لعرض المعاملات')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      setMessage(null)

      try {
        const transactionsResponse = await listTransactions(
          selectedClubSlug,
          effectiveParams,
        )

        if (isActive) {
          setTransactions(transactionsResponse.results)
        }
      } catch (error) {
        if (isActive) {
          setTransactions([])
          setError(
            getApiErrorMessage(
              error,
              'تعذر تحميل المعاملات. حاول مرة أخرى',
            ),
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadTransactions()

    return () => {
      isActive = false
    }
  }, [effectiveParams, selectedClubSlug])

  function handleApplyFilters(nextFilters: FilterState): void {
    const nextParams = paramsFromFilterState(nextFilters)
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
    applyQuickParams(createDefaultQueryParams())
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
    const defaultParams = createDefaultQueryParams()

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
    const nextParams = { ...effectiveParams }

    delete nextParams[key]

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
    if (!selectedClubSlug || !cancelTarget) {
      return
    }

    setIsCancelSubmitting(true)
    setCancelError(null)
    setCancelFieldErrors(null)

    try {
      await cancelTransaction(selectedClubSlug, cancelTarget.id, values)
      setCancelTarget(null)
      setSuccessMessage('تم إلغاء تسجيل الدفعة بنجاح')
      await reloadTransactions()
    } catch (error) {
      setCancelError(
        getApiErrorMessage(error, 'تعذر إلغاء تسجيل الدفعة. حاول مرة أخرى'),
      )
      setCancelFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsCancelSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        description={
          selectedClubName
            ? `سجل المدفوعات المسجلة داخل ${selectedClubName}`
            : 'سجل بسيط للمدفوعات المسجلة على حجوزات النادي النشط'
        }
        tone="brand"
        title="المعاملات"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        <AppButton onClick={handleQuickLastSevenDays} type="button" variant="secondary">
          آخر 7 أيام
        </AppButton>
        <AppButton onClick={handleQuickToday} type="button" variant="secondary">
          اليوم
        </AppButton>
        <AppButton onClick={handleQuickUnsettled} type="button" variant="secondary">
          غير مسواة
        </AppButton>
        <AppButton onClick={() => setIsFilterSheetOpen(true)} type="button">
          فلترة
        </AppButton>
      </div>

      {filterOptionsError ? (
        <p className="text-xs font-bold text-[var(--sloty-danger)]">
          {filterOptionsError}
        </p>
      ) : null}

      <AppCard className="hidden md:block">
        <TransactionsFilterForm
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
        title="فلترة المعاملات"
      >
        <TransactionsFilterForm
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
            <span
              className="inline-flex items-center gap-2 rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]"
              key={chip.key}
            >
              {chip.label}
              <button
                aria-label={`إزالة فلتر ${chip.label}`}
                className="rounded-full px-1 text-sm leading-none hover:bg-white/70"
                onClick={() => handleRemoveFilter(chip.key)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {successMessage ? (
        <AppCard>
          <div className="flex items-center justify-between gap-3 text-sm font-bold text-[var(--sloty-primary-dark)]">
            <span>{successMessage}</span>
            <button
              className="rounded-lg px-2 py-1 text-xs hover:bg-[var(--sloty-soft-mint)]"
              onClick={() => setSuccessMessage(null)}
              type="button"
            >
              إغلاق
            </button>
          </div>
        </AppCard>
      ) : null}

      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل المعاملات...
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
            {hasActiveFilters
              ? 'لا توجد دفعات مطابقة للفلاتر الحالية'
              : 'لا توجد معاملات مسجلة حتى الآن'}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && transactions.length > 0 ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {transactions.map((transaction) => {
            const createdLabel = formatTransactionDate(transaction.created)
            const cancelledAtLabel = formatTransactionDate(
              transaction.cancelled_at ?? undefined,
            )
            const cancelledByName = getActorName(transaction.cancelled_by)
            const createdById = getActorId(transaction.created_by)
            const transactionType = getTransactionType(transaction)
            const isRefund = isRefundTransaction(transaction)
            const canCancel =
              !isRefund &&
              transaction.is_cancelled !== true &&
              transaction.is_settled !== true &&
              (!currentUser?.id || !createdById || currentUser.id === createdById)

            return (
              <AppCard className="space-y-3" key={transaction.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      المبلغ
                    </p>
                    <p
                      className="mt-1 text-xl font-black text-[var(--sloty-primary-dark)]"
                      dir="ltr"
                    >
                      {transaction.amount}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <span
                      className={[
                        'rounded-full px-3 py-1 text-xs font-black',
                        isRefund
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]',
                      ].join(' ')}
                    >
                      {transactionTypeLabels[transactionType]}
                    </span>
                    <span className="rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]">
                      {paymentMethodLabels[transaction.payment_method]}
                    </span>
                    {transaction.is_cancelled ? (
                      <span className="rounded-full bg-[var(--sloty-danger-soft)] px-3 py-1 text-xs font-black text-[var(--sloty-danger)]">
                        ملغي
                      </span>
                    ) : null}
                  </div>
                </div>

                <dl className="grid grid-cols-1 gap-2 text-sm">
                  {transaction.booking ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        الحجز
                      </dt>
                      <dd
                        className="font-black text-[var(--sloty-text-primary)]"
                        dir="ltr"
                      >
                        #{transaction.booking}
                      </dd>
                    </div>
                  ) : null}
                  {transaction.reference ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        المرجع
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {transaction.reference}
                      </dd>
                    </div>
                  ) : null}
                  {createdLabel ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        التاريخ
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {createdLabel}
                      </dd>
                    </div>
                  ) : null}
                  {transaction.cancellation_reason ? (
                    <div className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-danger)]">
                        سبب الإلغاء
                      </dt>
                      <dd className="mt-1 font-black text-[var(--sloty-danger)]">
                        {transaction.cancellation_reason}
                      </dd>
                    </div>
                  ) : null}
                  {cancelledAtLabel ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        تاريخ الإلغاء
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {cancelledAtLabel}
                      </dd>
                    </div>
                  ) : null}
                  {cancelledByName ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        ألغي بواسطة
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {cancelledByName}
                      </dd>
                    </div>
                  ) : null}
                </dl>

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
                    إلغاء تسجيل الدفعة
                  </AppButton>
                ) : null}
              </AppCard>
            )
          })}
        </section>
      ) : null}

      {cancelTarget ? (
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
    </div>
  )
}
