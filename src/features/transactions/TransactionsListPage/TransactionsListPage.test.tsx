import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { useAuth } from '../../../core/auth/useAuth'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import { listCourts } from '../../courts/courtsApi'
import { cancelTransaction, listTransactions } from '../transactionsApi'
import { TransactionsListPage } from './TransactionsListPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../transactionsApi', () => ({
  cancelTransaction: vi.fn(),
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
const mockedListTransactions = vi.mocked(listTransactions)
const mockedListCourts = vi.mocked(listCourts)
const mockedListClubUsers = vi.mocked(listClubUsers)
const defaultFilters = {
  date_from: '2026-07-13',
  date_to: '2026-07-20',
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
          reference: 'REF-123',
          created: '2026-07-02T10:00:00Z',
        },
      ]),
    )

    renderTransactionsPage()

    expect(await screen.findByText('150.00')).toBeInTheDocument()
    expect(screen.getAllByText('محفظة رقمية')).toHaveLength(2)
    expect(screen.getByText('#10')).toBeInTheDocument()
    expect(screen.getByText('REF-123')).toBeInTheDocument()
    expect(mockedListTransactions).toHaveBeenCalledWith(
      'nasr-club',
      defaultFilters,
    )
    expect(
      screen.getByText('سجل المدفوعات المسجلة داخل نادي النصر'),
    ).toBeInTheDocument()
  })

  it('shows an empty state when the selected club has no transactions', async () => {
    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    expect(
      await screen.findByText('لا توجد دفعات مطابقة للفلاتر الحالية'),
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
      await screen.findByText('اختر ناديًا أولًا لعرض المعاملات'),
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

    expect(await screen.findByText('ملغي')).toBeInTheDocument()
    expect(screen.getByText('مبلغ خاطئ')).toBeInTheDocument()
    expect(screen.getByText('أحمد')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إلغاء الدفع' }),
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

    await user.click(await screen.findByRole('button', { name: 'إلغاء الدفع' }))
    await user.click(screen.getByRole('button', { name: 'تأكيد إلغاء الدفع' }))

    expect(screen.getByText('سبب الإلغاء مطلوب')).toBeInTheDocument()

    await user.type(screen.getByLabelText('سبب الإلغاء'), 'مبلغ خاطئ')
    await user.click(screen.getByRole('button', { name: 'تأكيد إلغاء الدفع' }))

    expect(mockedCancelTransaction).toHaveBeenCalledWith('nasr-club', 5, {
      reason: 'مبلغ خاطئ',
    })
    expect(mockedListTransactions).toHaveBeenCalledTimes(2)
    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      {
        is_cancelled: 'false',
        settlement_status: 'unsettled',
      },
    )
    expect(await screen.findByText('تم إلغاء الدفع بنجاح')).toBeInTheDocument()
  })

  it('respects summary redirect filters without adding default dates', async () => {
    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage(
      '/transactions?settlement_status=unsettled&is_cancelled=false',
    )

    expect(
      await screen.findByRole('button', { name: 'إزالة فلتر غير مسواة' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'إزالة فلتر غير ملغية' }),
    ).toBeInTheDocument()
    expect(mockedListTransactions).toHaveBeenCalledWith('nasr-club', {
      is_cancelled: 'false',
      settlement_status: 'unsettled',
    })
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
      await screen.findByRole('button', { name: 'إزالة فلتر غير مسواة' }),
    )

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', {
      is_cancelled: 'false',
    })
    expect(
      screen.queryByRole('button', { name: 'إزالة فلتر غير مسواة' }),
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

    await user.click(await screen.findByRole('button', { name: 'غير مسواة' }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', {
      settlement_status: 'unsettled',
      is_cancelled: 'false',
    })
  })

  it('opens advanced filters in a filter sheet', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage()

    await user.click(await screen.findByRole('button', { name: 'فلترة' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('فلترة المعاملات')).toBeInTheDocument()
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

    await screen.findByText('لا توجد دفعات مطابقة للفلاتر الحالية')
    expect(await screen.findByRole('option', { name: 'ملعب 1' })).toBeInTheDocument()
    expect(
      await screen.findByRole('option', { name: 'أحمد محمد' }),
    ).toBeInTheDocument()
    await user.clear(screen.getByLabelText('من تاريخ'))
    await user.type(screen.getByLabelText('من تاريخ'), '2026-07-01')
    await user.clear(screen.getByLabelText('إلى تاريخ'))
    await user.type(screen.getByLabelText('إلى تاريخ'), '2026-07-15')
    await user.selectOptions(screen.getByLabelText('حالة التسوية'), 'settled')
    await user.selectOptions(screen.getByLabelText('حالة الإلغاء'), 'false')
    await user.selectOptions(screen.getByLabelText('طريقة الدفع'), 'CASH')
    await user.selectOptions(screen.getByLabelText('الملعب'), '3')
    await user.selectOptions(screen.getByLabelText('الموظف المحصل'), '15')
    await user.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))

    expect(mockedListTransactions).toHaveBeenLastCalledWith('nasr-club', {
      court: '3',
      created_by: '15',
      date_from: '2026-07-01',
      date_to: '2026-07-15',
      is_cancelled: 'false',
      payment_method: 'CASH',
      settlement_status: 'settled',
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
    })
  })

  it('resets filters to the default last seven days', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListTransactions
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderTransactionsPage('/transactions?settlement_status=unsettled')

    await screen.findByText('لا توجد دفعات مطابقة للفلاتر الحالية')
    await user.clear(screen.getByLabelText('من تاريخ'))
    await user.type(screen.getByLabelText('من تاريخ'), '2026-07-01')
    await user.selectOptions(screen.getByLabelText('حالة التسوية'), 'settled')
    await user.click(screen.getByRole('button', { name: 'إعادة ضبط' }))

    expect(screen.getByLabelText('من تاريخ')).toHaveValue('2026-07-13')
    expect(screen.getByLabelText('إلى تاريخ')).toHaveValue('2026-07-20')
    expect(screen.getByLabelText('حالة التسوية')).toHaveValue('')
    expect(mockedListTransactions).toHaveBeenLastCalledWith(
      'nasr-club',
      defaultFilters,
    )
  })
})
