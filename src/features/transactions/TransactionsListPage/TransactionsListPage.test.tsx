import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { offlineRepositories } from '../../../offline/repositories/offlineRepositories'
import { useOfflineSync } from '../../../offline/sync/offlineSyncContext'
import { chooseAppSelectOption } from '../../../test/appSelectTestUtils'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import { listCourts } from '../../courts/courtsApi'
import { cancelTransaction, getTransaction, listTransactions } from '../transactionsApi'
import { TransactionsListPage } from './TransactionsListPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../../offline/sync/offlineSyncContext', () => ({
  useOfflineSync: vi.fn(),
}))

vi.mock('../../../offline/repositories/offlineRepositories', () => ({
  offlineRepositories: {
    getSyncMetadata: vi.fn(),
    readCachedTransactions: vi.fn(),
    readTransactionDetail: vi.fn(),
    saveTransactionDetail: vi.fn(),
  },
}))

vi.mock('../transactionsApi', () => ({
  cancelTransaction: vi.fn(),
  getTransaction: vi.fn(),
  listTransactions: vi.fn(),
}))

vi.mock('../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

vi.mock('../../clubUsers/clubUsersApi', () => ({
  listClubUsers: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseOfflineSync = vi.mocked(useOfflineSync)
const mockedOfflineRepositories = vi.mocked(offlineRepositories)
const mockedCancelTransaction = vi.mocked(cancelTransaction)
const mockedGetTransaction = vi.mocked(getTransaction)
const mockedListTransactions = vi.mocked(listTransactions)
const mockedListCourts = vi.mocked(listCourts)
const mockedListClubUsers = vi.mocked(listClubUsers)
const defaultFilters = {
  ordering: '-created',
}

function paginatedResponse<T>(results: T[]) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

function renderTransactionsPage(initialEntry = '/transactions') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <TransactionsListPage />
    </MemoryRouter>,
  )
}

async function expandQuickShortcuts(
  user?: { click: (element: HTMLElement) => Promise<unknown> },
) {
  const toggle = await screen.findByRole('button', {
    name: 'اختصارات البحث السريع',
  })

  if (toggle.getAttribute('aria-expanded') === 'true') {
    return
  }

  if (user) {
    await user.click(toggle)
    return
  }

  fireEvent.click(toggle)
}

function mockOfflineConnectivity(): void {
  mockedUseOfflineSync.mockReturnValue({
    connectivity: {
      backendReachability: 'unreachable',
      browserNetwork: 'offline',
      eventVersion: 1,
      lastBrowserEvent: 'offline',
      lastConnectivityChangeAt: '2026-07-20T10:00:00.000Z',
    },
    freshness: {
      ageMs: 60 * 60 * 1000,
      canCreateNewOfflineRequest: true,
      isLoading: false,
      lastSuccessfulOperationalSyncAt: '2026-07-20T09:00:00.000Z',
      level: 'fresh',
      warningText: null,
    },
    requestSync: vi.fn(),
    sync: {
      activeDataset: null,
      activeScopeKey: 'user:1:club:nasr-club',
      backendReachability: 'unreachable',
      lastRunCompletedAt: null,
      lastRunResult: null,
      lastRunStartedAt: null,
      status: 'idle',
    },
  })
}

describe('TransactionsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-07-20T10:00:00Z'))
    mockedUseOfflineSync.mockReturnValue({
      connectivity: {
        backendReachability: 'reachable',
        browserNetwork: 'likely_online',
        eventVersion: 0,
        lastBrowserEvent: null,
        lastConnectivityChangeAt: '2026-07-20T10:00:00.000Z',
      },
      freshness: {
        ageMs: 60 * 60 * 1000,
        canCreateNewOfflineRequest: true,
        isLoading: false,
        lastSuccessfulOperationalSyncAt: '2026-07-20T09:00:00.000Z',
        level: 'fresh',
        warningText: null,
      },
      requestSync: vi.fn(),
      sync: {
        activeDataset: null,
        activeScopeKey: null,
        backendReachability: 'reachable',
        lastRunCompletedAt: null,
        lastRunResult: null,
        lastRunStartedAt: null,
        status: 'idle',
      },
    })
    mockedOfflineRepositories.getSyncMetadata.mockResolvedValue(undefined)
    mockedOfflineRepositories.readCachedTransactions.mockResolvedValue([])
    mockedOfflineRepositories.readTransactionDetail.mockResolvedValue(undefined)
    mockedOfflineRepositories.saveTransactionDetail.mockResolvedValue(undefined)
    mockedListCourts.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 3,
          club: 1,
          name: 'ملعب 1',
          sport_type: 'football',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 2,
        },
        {
          id: 4,
          club: 1,
          name: 'ملعب متوقف',
          sport_type: 'football',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
          is_active: false,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 2,
        },
      ],
    })
    mockedListClubUsers.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 15,
          username: 'collector',
          first_name: 'أحمد',
          last_name: 'محمد',
          is_active: true,
          role: 'STAFF',
        },
      ],
    })
    mockedUseAuth.mockReturnValue({
      accessToken: 'token',
      claims: { user_id: 1 },
      currentUser: {
        id: 1,
        username: 'owner-user',
        email: 'owner@example.com',
        first_name: 'أحمد',
        last_name: 'علي',
        phone_number: null,
        is_active: true,
        profile_role: 'OWNER',
        account_created_by: null,
      },
      selectedClubSlug: 'nasr-club',
      accessibleClubs: [],
      accessibleCourts: [{ id: 3, name: 'ملعب 1' }] as never,
      selectedCourtId: null,
      selectCourt: vi.fn(),
      role: 'OWNER',
      isAuthenticated: true,
      isOperational: true,
      isLoadingSession: false,
      isTokenExpired: false,
      sessionError: null,
      login: vi.fn(),
      logout: vi.fn(),
      selectClub: vi.fn(),
      clearSelectedClub: vi.fn(),
      refreshCurrentUser: vi.fn(),
      setTokens: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads transactions for the selected club slug', async () => {
    mockedListTransactions.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 5,
          booking: 10,
          amount: '150.00',
          payment_method: 'DIGITAL_WALLET' as const,
          payment_reference: 'REF-123',
          created: '2026-07-02T10:00:00Z',
          booking_start_time: '2026-07-02T11:00:00Z',
          booking_end_time: '2026-07-02T12:00:00Z',
          court_name: 'ملعب النجوم',
          created_by: 15,
          created_by_username: 'collector',
        },
      ]),
    )

    renderTransactionsPage()

    expect(await screen.findByText(/150\.00 ج\.م/)).toBeInTheDocument()
    expect(screen.getByText('تحصيل')).toBeInTheDocument()
    expect(screen.getByText(/محفظة إلكترونية/)).toBeInTheDocument()
    expect(screen.getByText('ملعب النجوم')).toBeInTheDocument()
    expect(screen.getByText(/حصّلها: collector/)).toBeInTheDocument()
    expect(screen.queryByText('#10')).not.toBeInTheDocument()
    expect(screen.getByText('REF-123')).toBeInTheDocument()
    expect(mockedListTransactions).toHaveBeenCalledWith(
      'nasr-club',
      defaultFilters,
    )
    expect(
      screen.getByRole('button', { name: 'اختصارات البحث السريع' }),
    ).toBeInTheDocument()
    await expandQuickShortcuts()
    expect(
      screen.getByRole('button', { name: 'فلترة المعاملات المالية' }),
    ).toBeInTheDocument()
  })

  it('keeps staff transactions court-scoped without creator filtering', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      role: 'STAFF',
      accessibleCourts: [{ id: 3, name: 'ملعب 1' }] as never,
    })
    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage('/transactions?court=99&created_by=15')

    await expandQuickShortcuts(user)
    await user.click(
      await screen.findByRole('button', { name: 'فلترة المعاملات المالية' }),
    )
    expect((await screen.findAllByText('ملعب 1')).length).toBeGreaterThan(0)
    expect(screen.queryByText('كل الملاعب')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('المحصل')).not.toBeInTheDocument()
    expect(mockedListCourts).not.toHaveBeenCalled()
    expect(mockedListClubUsers).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(mockedListTransactions).toHaveBeenCalledWith('nasr-club', {
        court: '3',
        ...defaultFilters,
      })
    })
    expect(mockedListTransactions.mock.calls[0]?.[1]).not.toHaveProperty(
      'created_by',
    )
  })

  it('shows an empty state when the selected club has no transactions', async () => {
    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    expect(
      await screen.findByText('مفيش عمليات مالية لسه.'),
    ).toBeInTheDocument()
  })

  it('does not load transactions without a selected club slug', async () => {
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      selectedClubSlug: null,
    })

    renderTransactionsPage()

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض المعاملات المالية'),
    ).toBeInTheDocument()
    expect(mockedListTransactions).not.toHaveBeenCalled()
  })

  it('shows cancelled transaction state and cancellation reason', async () => {
    mockedListTransactions.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 7,
          amount: '200.00',
          payment_method: 'CASH' as const,
          is_cancelled: true,
          cancellation_reason: 'مبلغ خاطئ',
          cancelled_by: { id: 1, name: 'أحمد' },
          cancelled_at: '2026-07-02T12:00:00Z',
        },
      ]),
    )

    renderTransactionsPage()

    expect(await screen.findByText('ملغية')).toBeInTheDocument()
    expect(screen.getByText('مبلغ خاطئ')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إلغاء التحصيل' }),
    ).not.toBeInTheDocument()
  })

  it('renders refund rows as signed backend amounts without correction actions', async () => {
    mockedListTransactions.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 8,
          booking: 10,
          transaction_type: 'REFUND' as const,
          amount: '-250.00',
          payment_method: 'CASH' as const,
          created_by: { id: 1, name: 'أحمد' },
          is_cancelled: false,
          is_settled: false,
        },
      ]),
    )

    renderTransactionsPage()

    expect(await screen.findByText('استرداد')).toBeInTheDocument()
    expect(screen.getByText(/-250\.00 ج\.م/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إلغاء التحصيل' }),
    ).not.toBeInTheDocument()
  })

  it('cancels an active payment and reloads transactions', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(
        paginatedResponse([
          {
            id: 5,
            amount: '150.00',
            payment_method: 'CASH' as const,
            created_by: { id: 1, name: 'أحمد' },
            is_cancelled: false,
            is_settled: false,
          },
        ]),
      )
      .mockResolvedValueOnce(paginatedResponse([]))
    mockedCancelTransaction.mockResolvedValueOnce({
      id: 5,
      amount: '150.00',
      payment_method: 'CASH',
      is_cancelled: true,
    })

    renderTransactionsPage(
      '/transactions?settlement_status=unsettled&is_cancelled=false',
    )

    await user.click(await screen.findByRole('button', { name: 'إلغاء التحصيل' }))
    await user.click(screen.getByRole('button', { name: 'تأكيد إلغاء تسجيل الدفعة' }))

    expect(screen.getByText('سبب الإلغاء مطلوب')).toBeInTheDocument()

    await user.type(screen.getByLabelText('سبب الإلغاء'), 'مبلغ خاطئ')
    await user.click(screen.getByRole('button', { name: 'تأكيد إلغاء تسجيل الدفعة' }))

    expect(mockedCancelTransaction).toHaveBeenCalledWith('nasr-club', 5, {
      reason: 'مبلغ خاطئ',
    })
    expect(mockedListTransactions).toHaveBeenCalledTimes(2)
    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      {
        is_cancelled: 'false',
        ordering: '-created',
        settlement_status: 'unsettled',
      },
    )
    expect(await screen.findByText('تم إلغاء العملية')).toBeInTheDocument()
  })

  it('renders the scoped cached transaction snapshot offline without calling the server', async () => {
    mockOfflineConnectivity()
    mockedOfflineRepositories.getSyncMetadata.mockResolvedValueOnce({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      schema_version: 1,
      updated_at: '2026-07-20T08:42:00.000Z',
      transactions_last_sync_at: '2026-07-20T08:42:00.000Z',
    })
    mockedOfflineRepositories.readCachedTransactions.mockResolvedValueOnce([
      {
        id: 50,
        booking: 10,
        amount: '175.00',
        payment_method: 'BANK_TRANSFER',
        payment_reference: 'BANK-50',
        created: '2026-07-20T08:00:00Z',
        booking_start_time: '2026-07-20T10:00:00Z',
        booking_end_time: '2026-07-20T11:00:00Z',
        court: 3,
        court_name: 'ملعب 1',
        created_by: 15,
        created_by_username: 'collector',
        is_cancelled: false,
        is_settled: false,
      },
    ])

    renderTransactionsPage()

    expect(await screen.findByText(/175\.00 ج\.م/)).toBeInTheDocument()
    expect(screen.getByText('بدون إنترنت', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('BANK-50')).toBeInTheDocument()
    expect(mockedListTransactions).not.toHaveBeenCalled()
    expect(mockedListCourts).not.toHaveBeenCalled()
    expect(mockedListClubUsers).not.toHaveBeenCalled()
  })

  it('keeps cached transactions visible with fallback copy when online refresh fails', async () => {
    mockedListTransactions.mockRejectedValue(
      new ApiClientError('تعذر الاتصال بالخادم', 503),
    )
    mockedOfflineRepositories.getSyncMetadata.mockResolvedValue({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      schema_version: 1,
      updated_at: '2026-07-20T08:42:00.000Z',
      transactions_last_sync_at: '2026-07-20T08:42:00.000Z',
    })
    mockedOfflineRepositories.readCachedTransactions.mockResolvedValue([
      {
        id: 52,
        booking: 10,
        amount: '225.00',
        payment_method: 'CASH',
        created: '2026-07-20T08:00:00Z',
        booking_start_time: '2026-07-20T10:00:00Z',
        booking_end_time: '2026-07-20T11:00:00Z',
        court: 3,
        court_name: 'ملعب 1',
        created_by: 15,
        created_by_username: 'collector',
        is_cancelled: false,
        is_settled: false,
      },
    ])

    renderTransactionsPage('/transactions?date_from=2026-07-14&date_to=2026-07-20')

    expect(await screen.findByText(/225\.00 ج\.م/)).toBeInTheDocument()
    expect(
      screen.getByText('تعذر تحديث البيانات حاليًا. يتم عرض آخر نسخة محفوظة.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('تعذر الاتصال بالخادم')).not.toBeInTheDocument()
  })

  it('shows an internet-required state offline when no transaction cache exists', async () => {
    mockOfflineConnectivity()
    mockedOfflineRepositories.getSyncMetadata.mockResolvedValueOnce(undefined)
    mockedOfflineRepositories.readCachedTransactions.mockResolvedValueOnce([])

    renderTransactionsPage()

    expect(
      await screen.findByText('سجل المعاملات محتاج إنترنت أول مرة علشان يتعرض.'),
    ).toBeInTheDocument()
    expect(mockedListTransactions).not.toHaveBeenCalled()
  })

  it('searches cached payment references locally without server requests', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockOfflineConnectivity()
    mockedOfflineRepositories.getSyncMetadata.mockResolvedValue({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      schema_version: 1,
      updated_at: '2026-07-20T08:42:00.000Z',
      transactions_last_sync_at: '2026-07-20T08:42:00.000Z',
    })
    mockedOfflineRepositories.readCachedTransactions.mockResolvedValue([
      {
        id: 51,
        amount: '100.00',
        payment_method: 'BANK_TRANSFER',
        payment_reference: 'BANK-51',
        created: '2026-07-20T08:00:00Z',
        is_cancelled: false,
        is_settled: false,
      },
      {
        id: 52,
        amount: '200.00',
        payment_method: 'DIGITAL_WALLET',
        payment_reference: 'WALLET-52',
        created: '2026-07-19T08:00:00Z',
        is_cancelled: false,
        is_settled: false,
      },
    ])

    renderTransactionsPage()

    expect(await screen.findByText('BANK-51')).toBeInTheDocument()
    const searchInput = screen.getByRole('searchbox', {
      name: 'بحث في المعاملات المالية',
    })
    await user.click(searchInput)
    await user.type(searchInput, 'wallet')
    await act(async () => {
      vi.advanceTimersByTime(350)
    })

    await waitFor(() => {
      expect(screen.queryByText('BANK-51')).not.toBeInTheDocument()
    })
    expect(screen.getByText('WALLET-52')).toBeInTheDocument()
    expect(mockedListTransactions).not.toHaveBeenCalled()

    await user.clear(searchInput)
    await act(async () => {
      vi.advanceTimersByTime(350)
    })

    await waitFor(() => {
      expect(screen.getByText('BANK-51')).toBeInTheDocument()
    })
  })

  it('applies safe cached-field filters and distinguishes outside-cache dates offline', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockOfflineConnectivity()
    mockedOfflineRepositories.getSyncMetadata.mockResolvedValue({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      schema_version: 1,
      updated_at: '2026-07-20T08:42:00.000Z',
      transactions_last_sync_at: '2026-07-20T08:42:00.000Z',
    })
    mockedOfflineRepositories.readCachedTransactions.mockResolvedValue([
      {
        id: 61,
        amount: '100.00',
        payment_method: 'CASH',
        created: '2026-07-20T08:00:00Z',
        is_cancelled: false,
        is_settled: false,
      },
      {
        id: 62,
        amount: '200.00',
        payment_method: 'DIGITAL_WALLET',
        payment_reference: 'WALLET-62',
        created: '2026-07-20T09:00:00Z',
        is_cancelled: true,
        is_settled: true,
      },
    ])

    renderTransactionsPage()

    expect(await screen.findByText(/100\.00 ج\.م/)).toBeInTheDocument()
    await expandQuickShortcuts(user)
    await user.click(screen.getByRole('button', { name: 'فلترة المعاملات المالية' }))
    await chooseAppSelectOption(
      user,
      screen.getByLabelText('طريقة الدفع'),
      'محفظة إلكترونية',
    )
    await user.click(screen.getByRole('checkbox', { name: 'ملغية' }))
    await user.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))

    await waitFor(() => {
      expect(screen.queryByText(/100\.00 ج\.م/)).not.toBeInTheDocument()
    })
    expect(screen.getByText(/200\.00 ج\.م/)).toBeInTheDocument()
    expect(mockedListTransactions).not.toHaveBeenCalled()
  })

  it('shows internet-required copy for dates outside the seven-day transaction cache', async () => {
    mockOfflineConnectivity()
    mockedOfflineRepositories.getSyncMetadata.mockResolvedValueOnce({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      schema_version: 1,
      updated_at: '2026-07-20T08:42:00.000Z',
      transactions_last_sync_at: '2026-07-20T08:42:00.000Z',
    })
    mockedOfflineRepositories.readCachedTransactions.mockResolvedValueOnce([
      {
        id: 70,
        amount: '100.00',
        payment_method: 'CASH',
        created: '2026-07-20T08:00:00Z',
        is_cancelled: false,
        is_settled: false,
      },
    ])

    renderTransactionsPage('/transactions?date_from=2026-07-01&date_to=2026-07-02')

    expect(
      await screen.findByText('البيانات للفترة دي محتاجة إنترنت علشان تتعرض.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/100\.00 ج\.م/)).not.toBeInTheDocument()
    expect(mockedListTransactions).not.toHaveBeenCalled()
  })

  it('sorts the complete cached transaction dataset locally offline', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockOfflineConnectivity()
    mockedOfflineRepositories.getSyncMetadata.mockResolvedValue({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      schema_version: 1,
      updated_at: '2026-07-20T08:42:00.000Z',
      transactions_last_sync_at: '2026-07-20T08:42:00.000Z',
    })
    mockedOfflineRepositories.readCachedTransactions.mockResolvedValue([
      {
        id: 81,
        amount: '100.00',
        payment_method: 'CASH',
        created: '2026-07-20T08:00:00Z',
        is_cancelled: false,
        is_settled: false,
      },
      {
        id: 82,
        amount: '200.00',
        payment_method: 'CASH',
        created: '2026-07-19T08:00:00Z',
        is_cancelled: false,
        is_settled: false,
      },
    ])

    renderTransactionsPage()

    expect(await screen.findByText(/100\.00 ج\.م/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ترتيب المعاملات: الأحدث أولاً' }))

    await waitFor(() => {
      const amounts = screen
        .getAllByText(/\d+\.00 ج\.م/)
        .map((node) => node.textContent)
      expect(amounts[0]).toContain('200.00')
      expect(amounts[1]).toContain('100.00')
    })
    expect(mockedListTransactions).not.toHaveBeenCalled()
  })

  it('opens cached transaction details offline without detail GET or cancel POST', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockOfflineConnectivity()
    mockedOfflineRepositories.getSyncMetadata.mockResolvedValue({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      schema_version: 1,
      updated_at: '2026-07-20T08:42:00.000Z',
      transactions_last_sync_at: '2026-07-20T08:42:00.000Z',
    })
    mockedOfflineRepositories.readCachedTransactions.mockResolvedValue([
      {
        id: 91,
        amount: '150.00',
        payment_method: 'BANK_TRANSFER',
        payment_reference: 'BANK-91',
        created: '2026-07-20T08:00:00Z',
        is_cancelled: false,
        is_settled: false,
      },
    ])
    mockedOfflineRepositories.readTransactionDetail.mockResolvedValueOnce({
      id: 91,
      amount: '150.00',
      payment_method: 'BANK_TRANSFER',
      payment_reference: 'BANK-91',
      notes: 'ملاحظة محفوظة',
      created: '2026-07-20T08:00:00Z',
      is_cancelled: false,
      is_settled: false,
    })

    renderTransactionsPage()

    await user.click((await screen.findAllByRole('button', { name: 'عرض التفاصيل' }))[0])

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('ملاحظة محفوظة')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إلغاء التحصيل' }))
      .not.toBeInTheDocument()
    expect(mockedGetTransaction).not.toHaveBeenCalled()
    expect(mockedCancelTransaction).not.toHaveBeenCalled()
  })

  it('does not expose raw cancellation actor ids in transaction details', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockOfflineConnectivity()
    mockedOfflineRepositories.getSyncMetadata.mockResolvedValue({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      schema_version: 1,
      updated_at: '2026-07-20T08:42:00.000Z',
      transactions_last_sync_at: '2026-07-20T08:42:00.000Z',
    })
    mockedOfflineRepositories.readCachedTransactions.mockResolvedValue([
      {
        id: 92,
        amount: '150.00',
        payment_method: 'CASH',
        created: '2026-07-20T08:00:00Z',
        is_cancelled: true,
        is_settled: false,
        cancellation_reason: 'تصحيح تسجيل سابق',
        cancelled_by: 77,
      },
    ])

    renderTransactionsPage()

    await user.click((await screen.findAllByRole('button', { name: 'عرض التفاصيل' }))[0])

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText('تصحيح تسجيل سابق').length).toBeGreaterThan(0)
    expect(screen.queryByText('مستخدم #77')).not.toBeInTheDocument()
  })

  it('persists successful online transaction detail reads into the scoped cache', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockedListTransactions.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 101,
          amount: '250.00',
          payment_method: 'DIGITAL_WALLET',
          payment_reference: 'WALLET-101',
          created: '2026-07-20T08:00:00Z',
          is_cancelled: false,
          is_settled: false,
        },
      ]),
    )
    mockedGetTransaction.mockResolvedValueOnce({
      id: 101,
      amount: '250.00',
      payment_method: 'DIGITAL_WALLET',
      payment_reference: 'WALLET-101',
      notes: 'تفاصيل من الخادم',
      created: '2026-07-20T08:00:00Z',
      is_cancelled: false,
      is_settled: false,
    })

    renderTransactionsPage()

    await user.click((await screen.findAllByRole('button', { name: 'عرض التفاصيل' }))[0])

    expect(mockedGetTransaction).toHaveBeenCalledWith('nasr-club', 101)
    expect(
      await screen.findByText('تفاصيل من الخادم'),
    ).toBeInTheDocument()
    expect(mockedOfflineRepositories.saveTransactionDetail)
      .toHaveBeenCalledWith(
        { userId: 1, clubSlug: 'nasr-club' },
        expect.objectContaining({ id: 101 }),
        expect.any(String),
      )
  })

  it('shows full transaction notes in detail', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockedListTransactions.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 102,
          amount: '250.00',
          payment_method: 'DIGITAL_WALLET',
          payment_reference: 'WALLET-102',
          created: '2026-07-20T08:00:00Z',
          is_cancelled: false,
          is_settled: false,
        },
      ]),
    )
    mockedGetTransaction.mockResolvedValueOnce({
      id: 102,
      amount: '250.00',
      payment_method: 'DIGITAL_WALLET',
      payment_reference: 'WALLET-102',
      notes: 'التحويل تم من رقم مختلف.\nراجع صورة الإيصال.',
      created: '2026-07-20T08:00:00Z',
      is_cancelled: false,
      is_settled: false,
    })

    renderTransactionsPage()

    await user.click((await screen.findAllByRole('button', { name: 'عرض التفاصيل' }))[0])

    const note = 'التحويل تم من رقم مختلف.\nراجع صورة الإيصال.'

    expect(screen.getByText('ملاحظات')).toBeInTheDocument()
    expect(await screen.findByText((_, element) => element?.textContent === note)).toHaveClass(
      'whitespace-pre-wrap',
      'break-words',
    )

  })

  it('hides transaction notes section when detail notes are blank', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockedListTransactions.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 103,
          amount: '150.00',
          payment_method: 'CASH',
          created: '2026-07-20T09:00:00Z',
          is_cancelled: false,
          is_settled: false,
        },
      ]),
    )
    mockedGetTransaction.mockResolvedValueOnce({
      id: 103,
      amount: '150.00',
      payment_method: 'CASH',
      notes: '   \n\t',
      created: '2026-07-20T09:00:00Z',
      is_cancelled: false,
      is_settled: false,
    })

    renderTransactionsPage()

    await user.click((await screen.findAllByRole('button', { name: 'عرض التفاصيل' }))[0])

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText('ملاحظات')).not.toBeInTheDocument()
  })

  it('respects summary redirect filters without adding default dates', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage(
      '/transactions?settlement_status=unsettled&is_cancelled=false',
    )

    expect(
      await screen.findByRole('button', { name: 'إزالة فلتر لم يتم استلامها' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'إزالة فلتر غير ملغية' }),
    ).toBeInTheDocument()
    expect(mockedListTransactions).toHaveBeenCalledWith('nasr-club', {
      is_cancelled: 'false',
      ordering: '-created',
      settlement_status: 'unsettled',
    })
    await expandQuickShortcuts(user)
    await user.click(await screen.findByRole('button', { name: 'فلترة المعاملات المالية' }))
    expect(screen.getByLabelText('من تاريخ')).toHaveValue('')
    expect(screen.getByLabelText('إلى تاريخ')).toHaveValue('')
  })

  it('removes active chips and reloads with remaining URL filters', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage(
      '/transactions?settlement_status=unsettled&is_cancelled=false',
    )

    await user.click(
      await screen.findByRole('button', { name: 'إزالة فلتر لم يتم استلامها' }),
    )

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', {
      is_cancelled: 'false',
      ordering: '-created',
    })
    expect(
      screen.queryByRole('button', { name: 'إزالة فلتر لم يتم استلامها' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'إزالة فلتر غير ملغية' }),
    ).toBeInTheDocument()
  })

  it('opens advanced filters in a filter sheet', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    await expandQuickShortcuts(user)
    await user.click(await screen.findByRole('button', { name: 'فلترة المعاملات المالية' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'فلترة المعاملات المالية' })).toBeInTheDocument()
    expect(screen.getAllByLabelText('المحصل')).not.toHaveLength(0)
  })

  it('applies selected filters through the URL query params', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    await screen.findByText('مفيش عمليات مالية لسه.')
    await expandQuickShortcuts(user)
    await user.click(screen.getByRole('button', { name: 'فلترة المعاملات المالية' }))
    await user.clear(screen.getByLabelText('من تاريخ'))
    await user.type(screen.getByLabelText('من تاريخ'), '2026-07-01')
    await user.clear(screen.getByLabelText('إلى تاريخ'))
    await user.type(screen.getByLabelText('إلى تاريخ'), '2026-07-15')
    await chooseAppSelectOption(user, screen.getByLabelText('طريقة الدفع'), 'نقدي')
    await chooseAppSelectOption(user, screen.getByLabelText('الملعب'), 'ملعب 1')
    await chooseAppSelectOption(
      user,
      screen.getByLabelText('المحصل'),
      'أحمد محمد',
    )
    await user.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', {
      court: '3',
      created_by: '15',
      date_from: '2026-07-01',
      date_to: '2026-07-15',
      ordering: '-created',
      payment_method: 'CASH',
    })
  })

  it('keeps receipt and cancellation filters out of the advanced filter sheet', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    await screen.findByText('مفيش عمليات مالية لسه.')
    await expandQuickShortcuts(user)
    await user.click(screen.getByRole('button', { name: 'فلترة المعاملات المالية' }))

    expect(screen.queryByText('حالة الاستلام')).not.toBeInTheDocument()
    expect(screen.queryByText('حالة الإلغاء')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('checkbox', { name: 'تم استلامها' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('checkbox', { name: 'غير ملغية' }),
    ).not.toBeInTheDocument()
  })

  it('applies independent quick shortcuts for unsettled and cancelled transactions', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    await screen.findByText('مفيش عمليات مالية لسه.')
    await expandQuickShortcuts(user)

    const unsettledCheckbox = screen.getByRole('checkbox', {
      name: 'لم يتم استلامها',
    })
    const cancelledCheckbox = screen.getByRole('checkbox', { name: 'ملغية' })

    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(
      screen.queryByRole('checkbox', { name: 'تم استلامها' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('checkbox', { name: 'غير ملغية' }),
    ).not.toBeInTheDocument()

    await user.click(unsettledCheckbox)
    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', {
      ordering: '-created',
      settlement_status: 'unsettled',
    })

    await user.click(cancelledCheckbox)
    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', {
      is_cancelled: 'true',
      ordering: '-created',
      settlement_status: 'unsettled',
    })

    await user.click(unsettledCheckbox)
    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', {
      is_cancelled: 'true',
      ordering: '-created',
    })
    expect(mockedListTransactions.mock.calls.at(-1)?.[1]).not.toHaveProperty(
      'settlement_status',
    )

    await user.click(cancelledCheckbox)
    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', {
      ordering: '-created',
    })
    expect(mockedListTransactions.mock.calls.at(-1)?.[1]).not.toHaveProperty(
      'is_cancelled',
    )
  })

  it('preserves quick shortcuts when applying advanced filters', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage(
      '/transactions?settlement_status=unsettled&is_cancelled=true',
    )

    await screen.findByText('مفيش عمليات مالية مطابقة للفلاتر الحالية.')
    await expandQuickShortcuts(user)
    await user.click(screen.getByRole('button', { name: 'فلترة المعاملات المالية' }))
    await chooseAppSelectOption(user, screen.getByLabelText('طريقة الدفع'), 'نقدي')
    await user.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', {
      is_cancelled: 'true',
      ordering: '-created',
      payment_method: 'CASH',
      settlement_status: 'unsettled',
    })
  })

  it('shows active court and collector chips with loaded names', async () => {
    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage('/transactions?court=3&created_by=15')

    expect(
      await screen.findByRole('button', { name: 'إزالة فلتر ملعب 1' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'إزالة فلتر أحمد محمد' }),
    ).toBeInTheDocument()
    expect(mockedListTransactions).toHaveBeenCalledWith('nasr-club', {
      court: '3',
      created_by: '15',
      ordering: '-created',
    })
  })

  it('resets advanced filters while preserving quick shortcuts', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage('/transactions?settlement_status=unsettled')

    await screen.findByText('مفيش عمليات مالية مطابقة للفلاتر الحالية.')
    await expandQuickShortcuts(user)
    expect(screen.getByRole('checkbox', { name: 'لم يتم استلامها' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'فلترة المعاملات المالية' }))
    await user.clear(screen.getByLabelText('من تاريخ'))
    await user.type(screen.getByLabelText('من تاريخ'), '2026-07-01')
    await user.click(screen.getByRole('button', { name: 'إعادة ضبط' }))

    expect(screen.getByLabelText('من تاريخ')).toHaveValue('')
    expect(screen.getByLabelText('إلى تاريخ')).toHaveValue('')
    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', {
      ordering: '-created',
      settlement_status: 'unsettled',
    })
  })

  it('does not automatically restrict transactions to a date period for any role on page open', async () => {
    // 1. Owner / Admin role
    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))
    const { unmount } = renderTransactionsPage()

    expect(mockedListTransactions).toHaveBeenCalledWith('nasr-club', {
      ordering: '-created',
    })
    expect(screen.queryByRole('button', { name: /إزالة فلتر/ })).not.toBeInTheDocument()
    unmount()

    // 2. Staff role
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      role: 'STAFF',
      accessibleCourts: [{ id: 3, name: 'ملعب 1' }] as never,
    })
    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))
    const { unmount: unmountStaff } = renderTransactionsPage()

    expect(mockedListTransactions).toHaveBeenCalledWith('nasr-club', {
      court: '3',
      ordering: '-created',
    })
    expect(screen.queryByRole('button', { name: /إزالة فلتر/ })).not.toBeInTheDocument()
    unmountStaff()
  })

  it('supports toggling ordering between newest and oldest using the shared OrderBy control', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    expect(mockedListTransactions).toHaveBeenCalledWith('nasr-club', {
      ordering: '-created',
    })

    const orderButton = screen.getByRole('button', {
      name: 'ترتيب المعاملات: الأحدث أولاً',
    })
    expect(orderButton).toBeInTheDocument()

    await user.click(orderButton)

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', {
      ordering: 'created',
    })
    expect(
      screen.getByRole('button', {
        name: 'ترتيب المعاملات: الأقدم أولاً',
      }),
    ).toBeInTheDocument()
  })

  it('renders quick search shortcuts with filter button, allows expanding/collapsing, and auto-collapses on search query', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    await screen.findByText('مفيش عمليات مالية لسه.')

    const toggle = screen.getByRole('button', {
      name: 'اختصارات البحث السريع',
    })
    const searchInput = screen.getByRole('searchbox', {
      name: 'بحث في المعاملات المالية',
    })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toBeEnabled()
    expect(
      screen.queryByRole('button', { name: 'فلترة المعاملات المالية' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('checkbox', { name: 'لم يتم استلامها' }),
    ).not.toBeInTheDocument()

    // Expand
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('button', { name: 'فلترة المعاملات المالية' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(
      screen.getByRole('checkbox', { name: 'لم يتم استلامها' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'ملغية' })).toBeInTheDocument()

    // Collapse by clicking again
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByRole('button', { name: 'فلترة المعاملات المالية' }),
    ).not.toBeInTheDocument()

    // Re-open and type into search -> auto collapses
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.type(searchInput, 'REF-123')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toBeEnabled()
    expect(searchInput).toHaveValue('REF-123')
    expect(
      screen.queryByRole('button', { name: 'فلترة المعاملات المالية' }),
    ).not.toBeInTheDocument()

    // Can reopen while search input has text
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('button', { name: 'فلترة المعاملات المالية' }),
    ).toBeInTheDocument()

    // Clicking advanced filter button opens FilterSheet
    await user.click(
      screen.getByRole('button', { name: 'فلترة المعاملات المالية' }),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'فلترة المعاملات المالية' }),
    ).toBeInTheDocument()
  })
})
