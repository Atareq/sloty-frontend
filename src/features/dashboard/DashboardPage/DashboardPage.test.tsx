import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { offlineRepositories } from '../../../offline/repositories/offlineRepositories'
import { listCourts } from '../../courts/courtsApi'
import {
  getCurrentCustodySummary,
  getSettlementPreview,
} from '../../settlements/settlementsApi'
import { notifyCurrentFinancialStateChanged } from '../../settlements/currentFinancialStateInvalidation'
import { getDashboardSummary } from '../dashboardApi'
import type { DashboardSummaryResponse } from '../dashboard.types'
import { DashboardPage } from './DashboardPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../dashboardApi', () => ({
  getDashboardSummary: vi.fn(),
}))

vi.mock('../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

vi.mock('../../settlements/settlementsApi', () => ({
  getCurrentCustodySummary: vi.fn(),
  getSettlementPreview: vi.fn(),
}))

vi.mock('../../../offline/repositories/offlineRepositories', () => ({
  offlineRepositories: {
    deleteCurrentCustodySnapshot: vi.fn(),
    readCachedTransactions: vi.fn(),
    readCurrentCustodySnapshot: vi.fn(),
    replaceCurrentCustodySnapshot: vi.fn(),
  },
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetDashboardSummary = vi.mocked(getDashboardSummary)
const mockedListCourts = vi.mocked(listCourts)
const mockedGetCurrentCustodySummary = vi.mocked(getCurrentCustodySummary)
const mockedGetSettlementPreview = vi.mocked(getSettlementPreview)
const mockedOfflineRepositories = vi.mocked(offlineRepositories)

const baseSummaryResponse: DashboardSummaryResponse = {
  context: {
    club_id: 1,
    club_name: 'نادي النصر',
    date_from: '2026-07-21',
    date_to: '2026-07-21',
  },
  needs_action_breakdown: {
    expiring_hold_count: 1,
    hold_waiting_payment_count: 2,
    overdue_confirmed_count: 3,
    remaining_after_slot_end_count: 4,
  },
  payment_method_totals: {
    CASH: {
      amount: '500.00',
      count: 5,
      refund: '150.00',
    },
  },
  summary: {
    cancelled_bookings: 1,
    completed_bookings: 6,
    confirmed_bookings: 8,
    expired_bookings: 0,
    hold_bookings: 2,
    needs_action_count: 10,
    no_show_bookings: 1,
    settled_transaction_amount: '300.00',
    settled_transaction_count: 3,
    staff_with_unsettled_transactions_count: 1,
    total_booking_value: '1200.00',
    total_bookings: 18,
    total_paid_amount: '900.00',
    total_remaining_amount: null,
    transaction_count: 9,
    booking_payment_total: '1050.00',
    booking_refund_total: '150.00',
    transaction_total: '900.00',
    unsettled_transaction_total_amount: '700.00',
    unsettled_transaction_count: 7,
  },
}

const currentCustodyRow = {
  collected_by: 15,
  collected_by_name: 'أحمد المحصل',
  period_start: '2026-07-20T10:00:00Z',
  period_end: '2026-07-21T10:00:00Z',
  transaction_count: 3,
  total_amount: '1250.00',
  net_amount: '1250.00',
  booking_payments: '1400.00',
  booking_refunds: '-150.00',
  totals_by_payment_method: {
    CASH: '400.00',
    DIGITAL_WALLET: '300.00',
    BANK_TRANSFER: '550.00',
  },
  is_self: false,
  can_approve: true,
}

const ownCurrentCustodyPreview = {
  ...currentCustodyRow,
  club: 1,
  collected_by: 1,
  collected_by_name: 'محمد أحمد',
  court: 3,
  court_name: 'ملعب 3',
  is_self_preview: true,
  approval_required: true,
  can_approve: false,
  transactions: [],
}

function mockAuth(selectedClubSlug: string | null = 'nasr-club') {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: {
      id: 1,
      username: 'mohamed.owner',
      email: '',
      first_name: 'محمد',
      last_name: 'أحمد',
      phone_number: null,
      is_active: true,
      is_platform_admin: false,
      account_created_by: null,
      requires_club_selection: false,
      memberships: [],
    },
    selectedClubSlug,
    selectedMembership: selectedClubSlug
      ? {
          id: 10,
          role: 'OWNER',
          club: {
            id: 1,
            name: 'نادي النصر',
            slug: selectedClubSlug,
            city: 'ASSIUT',
            is_active: true,
          },
          court: null,
        }
      : null,
    role: 'OWNER',
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
}

function LocationProbe() {
  const location = useLocation()

  return <span data-testid="location">{location.pathname + location.search}</span>
}

function renderDashboard(initialEntry = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DashboardPage />
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-07-21T10:00:00Z'))
    mockAuth()
    mockedGetDashboardSummary.mockResolvedValue(baseSummaryResponse)
    mockedGetCurrentCustodySummary.mockResolvedValue({
      results: [currentCustodyRow],
    })
    mockedGetSettlementPreview.mockResolvedValue(ownCurrentCustodyPreview)
    mockedOfflineRepositories.readCachedTransactions.mockResolvedValue([])
    mockedOfflineRepositories.readCurrentCustodySnapshot.mockResolvedValue(
      undefined,
    )
    mockedOfflineRepositories.replaceCurrentCustodySnapshot.mockResolvedValue(
      undefined,
    )
    mockedOfflineRepositories.deleteCurrentCustodySnapshot.mockResolvedValue(
      undefined,
    )
    mockedListCourts.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 3,
          club: 1,
          name: 'ملعب 3',
          sport_type: 'FOOTBALL',
          default_price: '300.00',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 12,
        },
        {
          id: 4,
          club: 1,
          name: '',
          sport_type: 'FOOTBALL',
          default_price: '300.00',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 12,
        },
      ],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows no selected club message', async () => {
    mockAuth(null)

    renderDashboard()

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض ملخص التشغيل.'),
    ).toBeInTheDocument()
    expect(mockedGetDashboardSummary).not.toHaveBeenCalled()
    expect(mockedGetCurrentCustodySummary).not.toHaveBeenCalled()
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
    expect(mockedListCourts).not.toHaveBeenCalled()
  })

  it('shows loading skeletons without fake zeroes', () => {
    mockedGetDashboardSummary.mockReturnValue(new Promise(() => {}))

    renderDashboard()

    expect(screen.getByText('جاري تحميل ملخص التشغيل...')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('loads and renders court scope options without blocking summary', async () => {
    renderDashboard()

    expect(await screen.findByText('نطاق الملعب')).toBeInTheDocument()
    expect(screen.getAllByText('كل الملاعب').length).toBeGreaterThan(0)
    expect((await screen.findAllByText('ملعب 3')).length).toBeGreaterThan(0)
    expect(screen.getByText('ملعب #4')).toBeInTheDocument()
    expect(mockedListCourts).toHaveBeenCalledWith('nasr-club')
    expect(await screen.findByText('18 حجوزات مسجلة النهاردة'))
      .toBeInTheDocument()
  })

  it('uses staff assigned court without exposing all-courts selection', async () => {
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
        court: { id: 3, name: 'ملعب 3' },
      },
      role: 'STAFF',
    })

    renderDashboard('/dashboard?shortcut=week&court=4')

    expect(await screen.findByText('مساء الخير يا محمد')).toBeInTheDocument()
    expect(screen.getByText(/ملعب 3/)).toBeInTheDocument()
    expect(screen.queryByText('نطاق الملعب')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'كل الملاعب' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ملعب #4' }))
      .not.toBeInTheDocument()
    expect(screen.getByText('العهدة الحالية')).toBeInTheDocument()
    expect(
      screen.getByText('المبلغ المستحق للتسليم: 1,250.00 ج.م'),
    ).toBeInTheDocument()
    expect(screen.getByText('3 معاملات')).toBeInTheDocument()
    expect(screen.queryByText('استلام المبلغ')).not.toBeInTheDocument()
    expect(screen.queryByText('سوّي عهدتك')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'آخر 7 أيام' }))
      .not.toBeInTheDocument()
    expect(mockedListCourts).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(mockedGetDashboardSummary).toHaveBeenCalledWith('nasr-club', {
        date: '2026-07-21',
        court: '3',
      })
    })
    expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {
      court: 3,
    })
    expect(mockedGetCurrentCustodySummary).not.toHaveBeenCalled()
  })

  it('does not expose employee settlement actions to a restricted Manager', async () => {
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
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
        permissions: {
          can_change_pricing: false,
          can_manage_working_hours: false,
          can_manage_settlements: false,
        },
      },
      role: 'MANAGER',
    })

    renderDashboard()

    expect(await screen.findByText('18 حجوزات مسجلة النهاردة'))
      .toBeInTheDocument()
    expect(
      screen.queryByText('المبالغ الموجودة مع الموظفين حاليًا'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('استلام المبلغ')).not.toBeInTheDocument()
  })

  it('preserves employee custody management for an authorized Manager', async () => {
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
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
        permissions: {
          can_change_pricing: false,
          can_manage_working_hours: false,
          can_manage_settlements: true,
        },
      },
      role: 'MANAGER',
    })

    renderDashboard()

    expect(
      await screen.findByText('المبالغ الموجودة مع الموظفين حاليًا'),
    ).toBeInTheDocument()
    expect(screen.getByText('استلام المبلغ')).toHaveAttribute(
      'href',
      '/settlements/preview?collected_by=15',
    )
    expect(mockedGetCurrentCustodySummary).toHaveBeenCalledWith(
      'nasr-club',
      {},
    )
  })

  it('uses a human empty custody state for Staff without settlement actions', async () => {
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
        court: { id: 3, name: 'ملعب 3' },
      },
      role: 'STAFF',
    })
    mockedGetSettlementPreview.mockRejectedValueOnce(
      new ApiClientError('No current custody', 409, {
        code: 'NO_UNSETTLED_TRANSACTIONS',
      }),
    )

    renderDashboard()

    expect(
      await screen.findByText('لا توجد مبالغ مستحقة للتسليم حاليًا'),
    ).toBeInTheDocument()
    expect(screen.queryByText('استلام المبلغ')).not.toBeInTheDocument()
    expect(screen.queryByText('سوّي عهدتك')).not.toBeInTheDocument()
  })

  it('does not block summary when court options fail', async () => {
    mockedListCourts.mockRejectedValueOnce(new Error('failed'))

    renderDashboard()

    expect(await screen.findByText('تعذر تحميل خيارات الملاعب'))
      .toBeInTheDocument()
    expect(await screen.findByText('18 حجوزات مسجلة النهاردة'))
      .toBeInTheDocument()
    expect(mockedGetDashboardSummary).toHaveBeenCalled()
  })

  it('keeps current custody independent from dashboard period shortcut changes', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    renderDashboard()

    await waitFor(() => {
      expect(mockedGetCurrentCustodySummary).toHaveBeenCalledWith(
        'nasr-club',
        {},
      )
    })
    const initialCustodyCallCount = mockedGetCurrentCustodySummary.mock.calls
      .length

    await user.click(await screen.findByRole('button', { name: 'آخر 7 أيام' }))

    await waitFor(() => {
      expect(mockedGetDashboardSummary).toHaveBeenLastCalledWith('nasr-club', {
        date_from: '2026-07-15',
        date_to: '2026-07-21',
      })
    })
    expect(mockedGetCurrentCustodySummary).toHaveBeenCalledTimes(
      initialCustodyCallCount,
    )
    expect(
      screen.getByText('المبلغ المستحق للتسليم: 1,250.00 ج.م'),
    ).toBeInTheDocument()
  })

  it('refetches current custody after a financial mutation signal without changing period filters', async () => {
    mockedGetCurrentCustodySummary
      .mockResolvedValueOnce({
        results: [currentCustodyRow],
      })
      .mockResolvedValueOnce({
        results: [
          {
            ...currentCustodyRow,
            transaction_count: 4,
            net_amount: '1450.00',
            total_amount: '1450.00',
            totals_by_payment_method: {
              CASH: '600.00',
              DIGITAL_WALLET: '300.00',
              BANK_TRANSFER: '550.00',
            },
          },
        ],
      })

    renderDashboard()

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,250.00 ج.م'),
    ).toBeInTheDocument()
    const summaryCallCount = mockedGetDashboardSummary.mock.calls.length

    notifyCurrentFinancialStateChanged({
      clubSlug: 'nasr-club',
      reason: 'booking-payment',
    })

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,450.00 ج.م'),
    ).toBeInTheDocument()
    expect(mockedGetDashboardSummary).toHaveBeenCalledTimes(summaryCallCount)
  })

  it('keeps current custody visible when the period summary request fails', async () => {
    mockedGetDashboardSummary.mockRejectedValueOnce(new Error('summary failed'))

    renderDashboard()

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,250.00 ج.م'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('تعذر تحميل ملخص التشغيل. حاول مرة أخرى.'),
    ).toBeInTheDocument()
  })

  it('keeps period summary visible when the current-custody request fails', async () => {
    mockedGetCurrentCustodySummary.mockRejectedValueOnce(
      new Error('custody failed'),
    )

    renderDashboard()

    expect(await screen.findByText('18 حجوزات مسجلة النهاردة'))
      .toBeInTheDocument()
    expect(
      await screen.findByText('تعذر تحميل العهدة الحالية.'),
    ).toBeInTheDocument()
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
  })

  it('uses the cached Backend current-custody snapshot when the request fails, not cached Transaction reduction', async () => {
    mockedGetCurrentCustodySummary.mockRejectedValueOnce(
      new Error('custody failed'),
    )
    mockedOfflineRepositories.readCachedTransactions.mockResolvedValue([
      {
        id: 21,
        booking: 1,
        amount: '900.00',
        payment_method: 'CASH',
        transaction_type: 'PAYMENT',
        created: '2026-09-03T08:00:00+03:00',
        is_cancelled: false,
        is_settled: false,
      },
      {
        id: 22,
        booking: 1,
        amount: '-150.00',
        payment_method: 'CASH',
        transaction_type: 'REFUND',
        created: '2026-09-03T09:00:00+03:00',
        is_cancelled: false,
        is_settled: false,
      },
    ])
    mockedOfflineRepositories.readCurrentCustodySnapshot.mockResolvedValueOnce({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      snapshot_kind: 'grouped_summary',
      collector_scope: 'all',
      collector_id: null,
      court_scope: 'all',
      court_id: null,
      payload: { results: [currentCustodyRow] },
      synced_at: '2026-09-03T08:00:00.000Z',
    })

    renderDashboard()

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,250.00 ج.م'),
    ).toBeInTheDocument()
    expect(screen.queryByText('750.00 ج.م')).not.toBeInTheDocument()
    expect(mockedOfflineRepositories.readCachedTransactions)
      .not.toHaveBeenCalled()
    expect(screen.getByText(/بيانات محفوظة من آخر تحديث ناجح/))
      .toBeInTheDocument()
  })

  it('applies deep-linked court and preserves it through shortcut changes', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    renderDashboard('/dashboard?court=3')

    await waitFor(() => {
      expect(mockedGetDashboardSummary).toHaveBeenCalledWith('nasr-club', {
        date: '2026-07-21',
        court: '3',
      })
    })
    expect((await screen.findAllByText('ملعب 3')).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'أمس' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/dashboard?court=3&shortcut=yesterday',
      )
    })
    expect(mockedGetDashboardSummary).toHaveBeenLastCalledWith('nasr-club', {
      date: '2026-07-20',
      court: '3',
    })
  })

  it('preserves unknown deep-linked court IDs with fallback labels', async () => {
    renderDashboard('/dashboard?court=99')

    expect(await screen.findByText('ملعب #99')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockedGetDashboardSummary).toHaveBeenCalledWith('nasr-club', {
        date: '2026-07-21',
        court: '99',
      })
    })
  })

  it('changes and clears court scope through URL state', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    renderDashboard('/dashboard?shortcut=week')

    await user.click(await screen.findByRole('button', { name: 'ملعب 3' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/dashboard?shortcut=week&court=3',
      )
    })
    expect(mockedGetDashboardSummary).toHaveBeenLastCalledWith('nasr-club', {
      date_from: '2026-07-15',
      date_to: '2026-07-21',
      court: '3',
    })
    await waitFor(() => {
      expect(mockedGetCurrentCustodySummary).toHaveBeenLastCalledWith(
        'nasr-club',
        { court: 3 },
      )
    })

    await user.click(screen.getByRole('button', { name: 'كل الملاعب' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/dashboard?shortcut=week',
      )
    })
    expect(mockedGetDashboardSummary).toHaveBeenLastCalledWith('nasr-club', {
      date_from: '2026-07-15',
      date_to: '2026-07-21',
    })
    await waitFor(() => {
      expect(mockedGetCurrentCustodySummary).toHaveBeenLastCalledWith(
        'nasr-club',
        {},
      )
    })
  })

  it('uses a simple one-court state and a dropdown for larger court lists', async () => {
    const oneCourt = {
      id: 3,
      club: 1,
      name: 'ملعب وحيد',
      sport_type: 'FOOTBALL',
      default_price: '300.00',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
      is_active: true,
      requires_digital_payment_reference: false,
      internal_hold_expiry_hours: 12,
    }
    mockedListCourts.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [oneCourt],
    })
    const { unmount } = renderDashboard()

    expect((await screen.findAllByText('كل الملاعب')).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'ملعب وحيد' }))
      .not.toBeInTheDocument()

    unmount()
    mockedListCourts.mockResolvedValueOnce({
      count: 5,
      next: null,
      previous: null,
      results: [1, 2, 3, 4, 5].map((id) => ({
        ...oneCourt,
        id,
        name: `ملعب ${id}`,
      })),
    })
    renderDashboard()

    expect(await screen.findByLabelText('نطاق الملعب')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /نطاق الملعب/ }))
      .toBeInTheDocument()
  })

  it('puts the accurate daily operational summary before secondary analytics', async () => {
    renderDashboard()

    expect(await screen.findByText('مساء الخير يا محمد')).toBeInTheDocument()
    const dailySection = screen.getByText('النهاردة').closest('section')
    const analyticsSection = screen.getByText('متابعة وأرقام').closest('section')

    expect(dailySection).toBeInTheDocument()
    expect(analyticsSection).toBeInTheDocument()
    expect(
      dailySection?.compareDocumentPosition(analyticsSection as Node)
      ?? 0,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.getByText('18 حجوزات مسجلة النهاردة')).toBeInTheDocument()
    expect(screen.getByText('2 بانتظار العربون').closest('a')).toHaveAttribute(
      'href',
      '/bookings?date=2026-07-21&status=HOLD',
    )
    expect(screen.getByText('محتاجين إجراء')).toBeInTheDocument()
    expect(screen.getByText('متابعة وأرقام')).toBeInTheDocument()
    expect(screen.queryByText('حجوزات اليوم')).not.toBeInTheDocument()
    expect(screen.queryByText('تحصيل اليوم')).not.toBeInTheDocument()
    expect(screen.queryByText('هذا الأسبوع')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'آخر 7 أيام' }))
      .toBeInTheDocument()
  })

  it('does not fabricate unsupported booking-level Home dependencies', async () => {
    renderDashboard()

    expect(await screen.findByText('18 حجوزات مسجلة النهاردة'))
      .toBeInTheDocument()
    expect(baseSummaryResponse).not.toHaveProperty('next_booking')
    expect(baseSummaryResponse).not.toHaveProperty('hold_attention')
    expect(baseSummaryResponse).not.toHaveProperty('action_items')
    expect(baseSummaryResponse).not.toHaveProperty('my_custody')
    expect(screen.queryByText('الحجز الجاي')).not.toBeInTheDocument()
    expect(screen.queryByText(/ينتهي بعد/)).not.toBeInTheDocument()
  })

  it('preserves selected court in operational and settlement links', async () => {
    renderDashboard('/dashboard?court=3')

    expect(await screen.findByText('18 حجوزات مسجلة النهاردة'))
      .toBeInTheDocument()
    expect(screen.getByText('2 بانتظار العربون').closest('a')).toHaveAttribute(
      'href',
      '/bookings?court=3&date=2026-07-21&status=HOLD',
    )
    expect(screen.getByText('استلام المبلغ')).toHaveAttribute(
      'href',
      '/settlements/preview?collected_by=15&court=3',
    )
  })

  it('links booking status and money rows to filtered pages', async () => {
    renderDashboard()

    expect(await screen.findByText('حالات الحجوزات')).toBeInTheDocument()
    expect(
      screen.getAllByText('بانتظار العربون').some(
        (element) =>
          element.closest('a')?.getAttribute('href') ===
          '/bookings?date=2026-07-21&status=HOLD',
      ),
    ).toBe(true)
    const cashActivityLink = screen
      .getAllByText('نقدي')
      .map((element) => element.closest('a'))
      .find((element) =>
        element?.getAttribute('href')?.startsWith('/transactions?'),
      )

    expect(cashActivityLink).toHaveAttribute(
      'href',
      '/transactions?date=2026-07-21&is_cancelled=false&payment_method=CASH',
    )
  })

  it('links current employee custody cards to settlement preview', async () => {
    renderDashboard()

    expect(await screen.findByText('أحمد المحصل')).toBeInTheDocument()
    expect(screen.getByText('استلام المبلغ')).toHaveAttribute(
      'href',
      '/settlements/preview?collected_by=15',
    )
  })

  it('renders friendly empty states and missing amount dashes', async () => {
    mockedGetCurrentCustodySummary.mockResolvedValueOnce({ results: [] })
    mockedGetDashboardSummary.mockResolvedValueOnce({
      ...baseSummaryResponse,
      needs_action_breakdown: {
        expiring_hold_count: 0,
        hold_waiting_payment_count: 0,
        overdue_confirmed_count: 0,
        remaining_after_slot_end_count: 0,
      },
      payment_method_totals: {},
      summary: {
        ...baseSummaryResponse.summary,
        needs_action_count: 0,
        hold_bookings: 0,
        staff_with_unsettled_transactions_count: 0,
        total_remaining_amount: null,
        transaction_total: '0',
        unsettled_transaction_total_amount: null,
        unsettled_transaction_count: 0,
      },
    })

    renderDashboard()

    expect(
      await screen.findByText('مفيش حجوزات محتاجة إجراء دلوقتي.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('لا توجد مبالغ مستحقة للتسليم حاليًا'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('-')).not.toHaveLength(0)
    expect(screen.getAllByText('0 جنيه')).not.toHaveLength(0)
  })
})
