import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { useAuth } from '../../../core/auth/useAuth'
import { chooseAppSelectOption } from '../../../test/appSelectTestUtils'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import { listCourts } from '../../courts/courtsApi'
import { cancelTransaction, getTransaction, listTransactions } from '../transactionsApi'
import type { Transaction } from '../transactions.types'
import { TransactionsListPage } from './TransactionsListPage'
import { listCopy } from '../../../shared/copy/appCopy'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
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
const mockedCancelTransaction = vi.mocked(cancelTransaction)
const mockedGetTransaction = vi.mocked(getTransaction)
const mockedListTransactions = vi.mocked(listTransactions)
const mockedListCourts = vi.mocked(listCourts)
const mockedListClubUsers = vi.mocked(listClubUsers)
const lastSevenDaysFilters = {
  date_from: '2026-07-14',
  date_to: '2026-07-20',
}

function expectedListQuery(
  params: Record<string, string | number | boolean> = {},
) {
  return {
    ordering: '-created',
    ...params,
  }
}

function paginatedResponse<T>(results: T[]) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })

  return { promise, resolve }
}

function renderTransactionsPage(initialEntry = '/transactions') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <TransactionsListPage />
    </MemoryRouter>,
  )
}

function mockStaffAuth() {
  mockedUseAuth.mockReturnValue({
    ...mockedUseAuth(),
    selectedMembership: {
      id: 10,
      role: 'STAFF',
      club: {
        id: 1,
        name: 'نادي النصر',
        slug: 'nasr-club',
        city: 'ASSIUT',
        is_active: true,
      },
      court: { id: 3, name: 'ملعب 1' },
    },
    role: 'STAFF',
  })
}

function mockOwnerAuth() {
  const auth = mockedUseAuth()

  mockedUseAuth.mockReturnValue({
    ...auth,
    selectedMembership: auth.selectedMembership
      ? {
          ...auth.selectedMembership,
          role: 'OWNER',
          court: null,
        }
      : auth.selectedMembership,
    role: 'OWNER',
  })
}

describe('TransactionsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-07-20T10:00:00Z'))
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
          default_price: '300.00',
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
          default_price: '300.00',
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
          membership_id: 100,
          username: 'collector',
          first_name: 'أحمد',
          last_name: 'محمد',
          role: 'STAFF',
        },
      ],
    })
    mockedUseAuth.mockReturnValue({
      accessToken: 'token',
      claims: { user_id: 1 },
      currentUser: {
        id: 1,
        username: 'staff-user',
        email: 'staff@example.com',
        first_name: 'أحمد',
        last_name: 'علي',
        phone_number: null,
        is_active: true,
        is_platform_admin: false,
        account_created_by: null,
        requires_club_selection: false,
        memberships: [
          {
            id: 10,
            role: 'MANAGER',
            club: {
              id: 1,
              name: 'نادي النصر',
              slug: 'nasr-club',
              city: 'ASSIUT',
              is_active: true,
            },
            court: null,
          },
        ],
      },
      selectedClubSlug: 'nasr-club',
      selectedMembership: {
        id: 10,
        role: 'MANAGER',
        club: {
          id: 1,
          name: 'نادي النصر',
          slug: 'nasr-club',
          city: 'ASSIUT',
          is_active: true,
        },
        court: null,
      },
      role: 'MANAGER',
      isAuthenticated: true,
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
          notes: 'العميل حول المبلغ من رقم مختلف.',
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
    expect(screen.getByText('معاملة')).toBeInTheDocument()
    expect(screen.getByText(/محفظة رقمية/)).toBeInTheDocument()
    expect(screen.getByText('ملعب النجوم')).toBeInTheDocument()
    expect(screen.getByText(/حصّلها: collector/)).toBeInTheDocument()
    expect(screen.queryByText('#10')).not.toBeInTheDocument()
    expect(screen.getByText('REF-123')).toBeInTheDocument()
    expect(screen.queryByText('ملاحظات')).not.toBeInTheDocument()
    expect(mockedGetTransaction).not.toHaveBeenCalled()
    expect(mockedListTransactions).toHaveBeenCalledWith(
      'nasr-club',
      expectedListQuery(),
    )
    expect(screen.getByRole('button', { name: listCopy.newestFirst }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: listCopy.oldestFirst }))
      .toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'فلترة' })).toBeInTheDocument()
  })

  it('keeps staff transactions court-scoped without creator filtering', async () => {
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      selectedMembership: {
        id: 10,
        role: 'STAFF',
        club: {
          id: 1,
          name: 'نادي النصر',
          slug: 'nasr-club',
          city: 'ASSIUT',
          is_active: true,
        },
        court: { id: 3, name: 'ملعب 1' },
      },
      role: 'STAFF',
    })
    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage('/transactions?court=99&created_by=15')

    expect((await screen.findAllByText('ملعب 1')).length).toBeGreaterThan(0)
    expect(screen.queryByText('كل الملاعب')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('الموظف المحصل')).not.toBeInTheDocument()
    expect(mockedListCourts).not.toHaveBeenCalled()
    expect(mockedListClubUsers).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(mockedListTransactions).toHaveBeenCalledWith('nasr-club', expectedListQuery({
        court: '3',
      }))
    })
    expect(mockedListTransactions.mock.calls[0]?.[1]).not.toHaveProperty(
      'created_by',
    )
    expect(mockedListTransactions.mock.calls[0]?.[1]).not.toHaveProperty(
      'date_from',
    )
    expect(mockedListTransactions.mock.calls[0]?.[1]).not.toHaveProperty(
      'date_to',
    )
    expect(screen.getByRole('button', { name: listCopy.newestFirst }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: listCopy.oldestFirst }))
      .toHaveAttribute('aria-pressed', 'false')
  })

  it('shows an empty state when the selected club has no transactions', async () => {
    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    expect(
      await screen.findByText('مفيش معاملات مالية لسه.'),
    ).toBeInTheDocument()
  })

  it('does not load transactions without a selected club slug', async () => {
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      selectedClubSlug: null,
      selectedMembership: null,
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
          payment_reference: 'CASH-REF-SHOULD-HIDE',
          notes: '   ',
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
    expect(screen.queryByText('CASH-REF-SHOULD-HIDE')).not.toBeInTheDocument()
    expect(screen.queryByText('ملاحظات')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إلغاء المعاملة' }),
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
      screen.queryByRole('button', { name: 'إلغاء المعاملة' }),
    ).not.toBeInTheDocument()
  })

  it('hides cancellation for settled or incomplete authoritative state', async () => {
    mockedListTransactions.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 9,
          amount: '100.00',
          payment_method: 'CASH' as const,
          created_by: { id: 1, name: 'أحمد' },
          is_cancelled: false,
          is_settled: true,
        },
        {
          id: 10,
          amount: '120.00',
          payment_method: 'CASH' as const,
          created_by: { id: 1, name: 'أحمد' },
        },
      ]),
    )

    renderTransactionsPage()

    expect(await screen.findByText('تم الاستلام')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إلغاء المعاملة' }),
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

    await user.click(await screen.findByRole('button', { name: 'إلغاء المعاملة' }))
    const cancelDialog = screen.getByRole('dialog', { name: 'إلغاء المعاملة' })
    await user.click(
      within(cancelDialog).getByRole('button', { name: 'إلغاء المعاملة' }),
    )

    expect(screen.getByText('سبب الإلغاء مطلوب')).toBeInTheDocument()

    await user.type(screen.getByLabelText('سبب الإلغاء'), 'مبلغ خاطئ')
    await user.click(
      within(cancelDialog).getByRole('button', { name: 'إلغاء المعاملة' }),
    )

    expect(mockedCancelTransaction).toHaveBeenCalledWith('nasr-club', 5, {
      reason: 'مبلغ خاطئ',
    })
    expect(mockedListTransactions).toHaveBeenCalledTimes(2)
    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      expectedListQuery({
        is_cancelled: 'false',
        settlement_status: 'unsettled',
      }),
    )
    expect(await screen.findByText('تم إلغاء المعاملة')).toBeInTheDocument()
  })

  it('respects summary redirect filters without adding default dates', async () => {
    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage(
      '/transactions?settlement_status=unsettled&is_cancelled=false',
    )

    expect(
      await screen.findByRole('button', { name: 'إزالة فلتر لسه مع الموظف' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'إزالة فلتر غير ملغية' }),
    ).toBeInTheDocument()
    expect(mockedListTransactions).toHaveBeenCalledWith('nasr-club', expectedListQuery({
      is_cancelled: 'false',
      settlement_status: 'unsettled',
    }))
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
      await screen.findByRole('button', { name: 'إزالة فلتر لسه مع الموظف' }),
    )

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', expectedListQuery({
      is_cancelled: 'false',
    }))
    expect(
      screen.queryByRole('button', { name: 'إزالة فلتر لسه مع الموظف' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'إزالة فلتر غير ملغية' }),
    ).toBeInTheDocument()
  })

  it('applies the unsettled quick filter without adding default dates', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    await user.click(await screen.findByRole('button', { name: 'لسه مع الموظف' }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', expectedListQuery({
      settlement_status: 'unsettled',
      is_cancelled: 'false',
    }))
  })

  it('applies the last-seven-days range only after explicit selection', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockedListTransactions.mockResolvedValue(paginatedResponse([]))

    renderTransactionsPage()
    await screen.findByText('مفيش معاملات مالية لسه.')
    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', expectedListQuery())

    await user.click(screen.getByRole('button', { name: 'آخر 7 أيام' }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      expectedListQuery(lastSevenDaysFilters),
    )
  })

  it('keeps current rows visible during a stale-safe results refresh', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    const refreshedResponse = deferred<ReturnType<
      typeof paginatedResponse<Transaction>
    >>()
    mockedListTransactions
      .mockResolvedValueOnce(
        paginatedResponse([
          {
            id: 20,
            amount: '175.00',
            payment_method: 'CASH' as const,
          },
        ]),
      )
      .mockReturnValueOnce(refreshedResponse.promise)

    renderTransactionsPage()

    expect(await screen.findByText(/175\.00 ج\.م/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'لسه مع الموظف' }))

    expect(screen.getByText(/175\.00 ج\.م/)).toBeInTheDocument()
    expect(screen.getByText('جاري تحديث المعاملات المالية'))
      .toBeInTheDocument()

    refreshedResponse.resolve(paginatedResponse([]))

    await waitFor(() => {
      expect(screen.queryByText(/175\.00 ج\.م/)).not.toBeInTheDocument()
    })
  })

  it('resets pagination when a quick filter changes', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage('/transactions?page=3&settlement_status=settled')

    await user.click(await screen.findByRole('button', { name: 'اليوم' }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', expectedListQuery({
      date_from: '2026-07-20',
      date_to: '2026-07-20',
    }))
  })

  it('opens advanced filters in a filter sheet', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    await user.click(await screen.findByRole('button', { name: 'فلترة' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('فلترة المعاملات المالية')).toBeInTheDocument()
    expect(screen.getAllByLabelText('الموظف المحصل')).not.toHaveLength(0)
  })

  it('applies selected filters through the URL query params', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    await screen.findByText('مفيش معاملات مالية لسه.')
    await user.clear(screen.getByLabelText('من تاريخ'))
    await user.type(screen.getByLabelText('من تاريخ'), '2026-07-01')
    await user.clear(screen.getByLabelText('إلى تاريخ'))
    await user.type(screen.getByLabelText('إلى تاريخ'), '2026-07-15')
    await user.click(screen.getByRole('checkbox', { name: 'تم الاستلام' }))
    await user.click(screen.getByRole('checkbox', { name: 'غير ملغية' }))
    await chooseAppSelectOption(user, screen.getByLabelText('طريقة الدفع'), 'نقدي')
    await chooseAppSelectOption(user, screen.getByLabelText('الملعب'), 'ملعب 1')
    await chooseAppSelectOption(
      user,
      screen.getByLabelText('الموظف المحصل'),
      'أحمد محمد',
    )
    await user.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', expectedListQuery({
      court: '3',
      created_by: '15',
      date_from: '2026-07-01',
      date_to: '2026-07-15',
      is_cancelled: 'false',
      payment_method: 'CASH',
      settlement_status: 'settled',
    }))
  })

  it('maps both or neither transaction state checkboxes to all', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    await screen.findByText('مفيش معاملات مالية لسه.')
    await user.clear(screen.getByLabelText('من تاريخ'))
    await user.clear(screen.getByLabelText('إلى تاريخ'))
    await user.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', expectedListQuery())

    await user.click(screen.getByRole('checkbox', { name: 'لسه مع الموظف' }))
    await user.click(screen.getByRole('checkbox', { name: 'تم الاستلام' }))
    await user.click(screen.getByRole('checkbox', { name: 'غير ملغية' }))
    await user.click(screen.getByRole('checkbox', { name: 'ملغية' }))
    await chooseAppSelectOption(
      user,
      screen.getByLabelText('طريقة الدفع'),
      'نقدي',
    )
    await user.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', expectedListQuery({
      payment_method: 'CASH',
    }))
  })

  it('maps one checked option from each state group to scalar API values', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    await screen.findByText('مفيش معاملات مالية لسه.')
    await user.clear(screen.getByLabelText('من تاريخ'))
    await user.clear(screen.getByLabelText('إلى تاريخ'))
    await user.click(screen.getByRole('checkbox', { name: 'لسه مع الموظف' }))
    await user.click(screen.getByRole('checkbox', { name: 'ملغية' }))
    await user.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', expectedListQuery({
      is_cancelled: 'true',
      settlement_status: 'unsettled',
    }))
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
    expect(mockedListTransactions).toHaveBeenCalledWith('nasr-club', expectedListQuery({
      court: '3',
      created_by: '15',
    }))
  })

  it('resets filters to all available history', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage('/transactions?settlement_status=unsettled')

    await screen.findByText('مفيش معاملات مالية مطابقة للفلاتر الحالية.')
    await user.clear(screen.getByLabelText('من تاريخ'))
    await user.type(screen.getByLabelText('من تاريخ'), '2026-07-01')
    await user.click(screen.getByRole('checkbox', { name: 'تم الاستلام' }))
    await user.click(screen.getByRole('button', { name: 'إعادة ضبط' }))

    expect(screen.getByLabelText('من تاريخ')).toHaveValue('')
    expect(screen.getByLabelText('إلى تاريخ')).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: 'لسه مع الموظف' }))
      .not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'تم الاستلام' })).not.toBeChecked()
    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      expectedListQuery(),
    )
    expect(screen.getByRole('button', { name: listCopy.newestFirst }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('lets Owner/Manager sort the ledger with the shared two-arrow control', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    mockedListTransactions.mockResolvedValue(paginatedResponse([
      {
        id: 21,
        amount: '80.00',
        payment_method: 'CASH' as const,
      },
      {
        id: 20,
        amount: '90.00',
        payment_method: 'CASH' as const,
      },
    ]))

    renderTransactionsPage(
      '/transactions?page=2&payment_method=CASH&date_from=2026-07-01',
    )

    await screen.findByText(/80\.00 ج\.م/)
    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      expectedListQuery({
        date_from: '2026-07-01',
        page: '2',
        payment_method: 'CASH',
      }),
    )

    await user.click(screen.getByRole('button', { name: listCopy.oldestFirst }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      {
        date_from: '2026-07-01',
        ordering: 'created',
        payment_method: 'CASH',
      },
    )
    expect(screen.getByRole('button', { name: listCopy.oldestFirst }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('من تاريخ')).toHaveValue('2026-07-01')
    expect(screen.getByLabelText('طريقة الدفع')).toHaveTextContent('نقدي')
    expect(scrollTo).not.toHaveBeenCalled()
    const amounts = screen.getAllByText(/ج\.م/).map((node) => node.textContent)
    expect(amounts[0]).toContain('80.00')
    expect(amounts[1]).toContain('90.00')

    await user.click(screen.getByRole('button', { name: listCopy.newestFirst }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      expectedListQuery({
        date_from: '2026-07-01',
        payment_method: 'CASH',
      }),
    )
  })

  it('lets Staff sort their court-scoped ledger with the same arrow contract', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockStaffAuth()
    mockedListTransactions.mockResolvedValue(paginatedResponse([
      {
        id: 21,
        amount: '80.00',
        payment_method: 'CASH' as const,
      },
    ]))

    renderTransactionsPage('/transactions?page=2&settlement_status=unsettled')

    await screen.findByText(/80\.00 ج\.م/)
    expect(screen.getByRole('button', { name: listCopy.newestFirst }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      expectedListQuery({
        court: '3',
        page: '2',
        settlement_status: 'unsettled',
      }),
    )

    await user.click(screen.getByRole('button', { name: listCopy.oldestFirst }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      {
        court: '3',
        ordering: 'created',
        settlement_status: 'unsettled',
      },
    )
    expect(screen.getByRole('button', { name: listCopy.oldestFirst }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('lets Owner sort the management ledger with the same arrow contract', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockOwnerAuth()
    mockedListTransactions.mockResolvedValue(paginatedResponse([
      {
        id: 30,
        amount: '40.00',
        payment_method: 'CASH' as const,
      },
    ]))

    renderTransactionsPage('/transactions?court=3&page=2')

    await screen.findByText(/40\.00 ج\.م/)
    expect(screen.getByRole('button', { name: listCopy.newestFirst }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      expectedListQuery({
        court: '3',
        page: '2',
      }),
    )

    await user.click(screen.getByRole('button', { name: listCopy.oldestFirst }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      {
        court: '3',
        ordering: 'created',
      },
    )
    expect(screen.getByRole('button', { name: listCopy.oldestFirst }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('opens Owner transaction history with no hidden date window', async () => {
    mockOwnerAuth()
    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    expect(
      await screen.findByText('مفيش معاملات مالية لسه.'),
    ).toBeInTheDocument()
    expect(mockedListTransactions).toHaveBeenCalledWith(
      'nasr-club',
      expectedListQuery(),
    )
    expect(mockedListTransactions.mock.calls[0]?.[1]).not.toHaveProperty(
      'date_from',
    )
    expect(screen.getByRole('button', { name: listCopy.newestFirst }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('restores all dates and newest-first sort on reset', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockedListTransactions.mockResolvedValue(paginatedResponse([]))

    renderTransactionsPage('/transactions?ordering=created&date_from=2026-07-01')

    await screen.findByText('مفيش معاملات مالية مطابقة للفلاتر الحالية.')
    expect(screen.getByRole('button', { name: listCopy.oldestFirst }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      {
        date_from: '2026-07-01',
        ordering: 'created',
      },
    )

    await user.click(screen.getByRole('button', { name: 'إعادة ضبط' }))

    expect(screen.getByRole('button', { name: listCopy.newestFirst }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      expectedListQuery(),
    )
  })

  it('keeps existing rows visible while sort refresh is in flight', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    const refreshedResponse = deferred<ReturnType<
      typeof paginatedResponse<Transaction>
    >>()
    mockedListTransactions
      .mockResolvedValueOnce(
        paginatedResponse([
          {
            id: 20,
            amount: '175.00',
            payment_method: 'CASH' as const,
          },
        ]),
      )
      .mockReturnValueOnce(refreshedResponse.promise)

    renderTransactionsPage()

    expect(await screen.findByText(/175\.00 ج\.م/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: listCopy.oldestFirst }))

    expect(screen.getByText(/175\.00 ج\.م/)).toBeInTheDocument()
    expect(screen.getByText('جاري تحديث المعاملات المالية')).toBeInTheDocument()

    refreshedResponse.resolve(paginatedResponse([]))

    await waitFor(() => {
      expect(screen.queryByText(/175\.00 ج\.م/)).not.toBeInTheDocument()
    })
  })

  it('hydrates transaction details lazily and shows notes from the detail response', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockedListTransactions.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 5,
          amount: '150.00',
          payment_method: 'DIGITAL_WALLET' as const,
          payment_reference: 'REF-123',
          created_by: 1,
        },
      ]),
    )
    mockedGetTransaction.mockResolvedValueOnce({
      id: 5,
      amount: '150.00',
      payment_method: 'DIGITAL_WALLET',
      payment_reference: 'REF-123',
      notes: 'العميل حول المبلغ من رقم مختلف.',
      created_by: 1,
    })

    renderTransactionsPage()

    expect(await screen.findByText(/150\.00 ج\.م/)).toBeInTheDocument()
    expect(mockedGetTransaction).not.toHaveBeenCalled()
    expect(screen.queryByText('ملاحظات')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'عرض التفاصيل' }))

    expect(mockedGetTransaction).toHaveBeenCalledTimes(1)
    expect(mockedGetTransaction).toHaveBeenCalledWith('nasr-club', 5)
    expect(await screen.findByText('ملاحظات')).toBeInTheDocument()
    expect(
      screen.getByText('العميل حول المبلغ من رقم مختلف.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('غير متاح')).not.toBeInTheDocument()
  })

  it('hydrates transaction details for Staff through the same shared sheet', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockStaffAuth()
    mockedListTransactions.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 8,
          amount: '60.00',
          payment_method: 'CASH' as const,
        },
      ]),
    )
    mockedGetTransaction.mockResolvedValueOnce({
      id: 8,
      amount: '60.00',
      payment_method: 'CASH',
      notes: 'دفعة الكاش للوردية.',
    })

    renderTransactionsPage()

    expect(await screen.findByText(/60\.00 ج\.م/)).toBeInTheDocument()
    expect(mockedGetTransaction).not.toHaveBeenCalled()
    expect(mockedListTransactions).toHaveBeenCalledWith(
      'nasr-club',
      expectedListQuery({ court: '3' }),
    )

    await user.click(screen.getByRole('button', { name: 'عرض التفاصيل' }))

    expect(mockedGetTransaction).toHaveBeenCalledTimes(1)
    expect(mockedGetTransaction).toHaveBeenCalledWith('nasr-club', 8)
    expect(await screen.findByText('ملاحظات')).toBeInTheDocument()
    expect(screen.getByText('دفعة الكاش للوردية.')).toBeInTheDocument()
  })

  it('hides transaction detail notes when the detail response is empty', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockedListTransactions.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 6,
          amount: '90.00',
          payment_method: 'CASH' as const,
        },
      ]),
    )
    mockedGetTransaction.mockResolvedValueOnce({
      id: 6,
      amount: '90.00',
      payment_method: 'CASH',
      notes: '   ',
    })

    renderTransactionsPage()

    await user.click(await screen.findByRole('button', { name: 'عرض التفاصيل' }))

    expect(await screen.findByRole('dialog', { name: 'تفاصيل المعاملة' }))
      .toBeInTheDocument()
    expect(screen.queryByText('ملاحظات')).not.toBeInTheDocument()
    expect(screen.queryByText('غير متاح')).not.toBeInTheDocument()
    expect(mockedGetTransaction).toHaveBeenCalledTimes(1)
  })
})
