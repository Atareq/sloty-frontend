import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { listCourts } from '../../courts/courtsApi'
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

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetDashboardSummary = vi.mocked(getDashboardSummary)
const mockedListCourts = vi.mocked(listCourts)

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
    },
  },
  staff_unsettled_money: [
    {
      collected_by: 15,
      collected_by_name: 'أحمد المحصل',
      court: 3,
      court_name: 'ملعب 3',
      total_unsettled_amount: '700.00',
      unsettled_transaction_count: 7,
      totals_by_payment_method: {
        CASH: '700.00',
      },
    },
  ],
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
    transaction_total: '900.00',
    unsettled_transaction_total_amount: '700.00',
    unsettled_transaction_count: 7,
  },
}

function mockAuth(selectedClubSlug: string | null = 'nasr-club') {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: null,
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
      await screen.findByText('اختر ناديًا أولًا لعرض الملخص'),
    ).toBeInTheDocument()
    expect(mockedGetDashboardSummary).not.toHaveBeenCalled()
    expect(mockedListCourts).not.toHaveBeenCalled()
  })

  it('shows loading skeletons without fake zeroes', () => {
    mockedGetDashboardSummary.mockReturnValue(new Promise(() => {}))

    renderDashboard()

    expect(screen.getByText('جاري تحميل الملخص...')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('loads and renders court scope options without blocking summary', async () => {
    renderDashboard()

    expect(await screen.findByText('نطاق الملعب')).toBeInTheDocument()
    expect(screen.getAllByText('كل الملاعب').length).toBeGreaterThan(0)
    expect((await screen.findAllByText('ملعب 3')).length).toBeGreaterThan(0)
    expect(screen.getByText('ملعب #4')).toBeInTheDocument()
    expect(mockedListCourts).toHaveBeenCalledWith('nasr-club')
    expect(await screen.findByText('حجوزات اليوم')).toBeInTheDocument()
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

    renderDashboard('/dashboard?court=4')

    expect(await screen.findByText('نطاق الملعب')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'كل الملاعب' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ملعب #4' }))
      .not.toBeInTheDocument()
    expect(mockedListCourts).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(mockedGetDashboardSummary).toHaveBeenCalledWith('nasr-club', {
        date: '2026-07-21',
        court: '3',
      })
    })
  })

  it('does not block summary when court options fail', async () => {
    mockedListCourts.mockRejectedValueOnce(new Error('failed'))

    renderDashboard()

    expect(await screen.findByText('تعذر تحميل خيارات الملاعب'))
      .toBeInTheDocument()
    expect(await screen.findByText('حجوزات اليوم')).toBeInTheDocument()
    expect(mockedGetDashboardSummary).toHaveBeenCalled()
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
    expect(screen.getByRole('combobox', { name: 'نطاق الملعب' }))
      .toBeInTheDocument()
  })

  it('renders main KPI cards with filtered links', async () => {
    renderDashboard()

    expect(await screen.findByText('حجوزات اليوم')).toBeInTheDocument()
    expect(screen.getAllByText('تحتاج إجراء')).not.toHaveLength(0)
    expect(screen.getByText('تحصيل اليوم')).toBeInTheDocument()
    expect(screen.getAllByText('مبالغ غير مسواة حالياً')).not.toHaveLength(0)

    expect(screen.getByText('حجوزات اليوم').closest('a')).toHaveAttribute(
      'href',
      '/bookings?date=2026-07-21',
    )
    expect(screen.getAllByText('تحتاج إجراء')[0].closest('a')).toHaveAttribute(
      'href',
      '/bookings?date=2026-07-21&needs_action=true',
    )
    expect(screen.getByText('تحصيل اليوم').closest('a')).toHaveAttribute(
      'href',
      '/transactions?date=2026-07-21&is_cancelled=false',
    )
    expect(
      screen.getAllByText('مبالغ غير مسواة حالياً')[0].closest('a'),
    ).toHaveAttribute(
      'href',
      '/transactions?settlement_status=unsettled&is_cancelled=false',
    )
  })

  it('preserves selected court in supported Dashboard links only', async () => {
    renderDashboard('/dashboard?court=3')

    expect(await screen.findByText('حجوزات اليوم')).toBeInTheDocument()
    expect(screen.getByText('حجوزات اليوم').closest('a')).toHaveAttribute(
      'href',
      '/bookings?court=3&date=2026-07-21',
    )
    expect(screen.getAllByText('تحتاج إجراء')[0].closest('a')).toHaveAttribute(
      'href',
      '/bookings?court=3&date=2026-07-21&needs_action=true',
    )
    expect(screen.getByText('تحصيل اليوم').closest('a')).toHaveAttribute(
      'href',
      '/transactions?court=3&date=2026-07-21&is_cancelled=false',
    )
    expect(screen.getByText('مراجعة التسوية')).toHaveAttribute(
      'href',
      '/settlements/preview?collected_by=15&court=3',
    )
  })

  it('links booking status and money rows to filtered pages', async () => {
    renderDashboard()

    expect(await screen.findByText('حالات الحجوزات')).toBeInTheDocument()
    expect(screen.getByText('بانتظار العربون').closest('a')).toHaveAttribute(
      'href',
      '/bookings?date=2026-07-21&status=HOLD',
    )
    expect(screen.getByText('كاش').closest('a')).toHaveAttribute(
      'href',
      '/transactions?date=2026-07-21&is_cancelled=false&payment_method=CASH',
    )
  })

  it('links staff unsettled money cards to settlement preview', async () => {
    renderDashboard()

    expect(await screen.findByText('أحمد المحصل')).toBeInTheDocument()
    expect(screen.getByText('مراجعة التسوية')).toHaveAttribute(
      'href',
      '/settlements/preview?collected_by=15&court=3',
    )
  })

  it('renders friendly empty states and missing amount dashes', async () => {
    mockedGetDashboardSummary.mockResolvedValueOnce({
      ...baseSummaryResponse,
      needs_action_breakdown: {
        expiring_hold_count: 0,
        hold_waiting_payment_count: 0,
        overdue_confirmed_count: 0,
        remaining_after_slot_end_count: 0,
      },
      payment_method_totals: {},
      staff_unsettled_money: [],
      summary: {
        ...baseSummaryResponse.summary,
        needs_action_count: 0,
        staff_with_unsettled_transactions_count: 0,
        total_remaining_amount: null,
        transaction_total: '0',
        unsettled_transaction_total_amount: null,
        unsettled_transaction_count: 0,
      },
    })

    renderDashboard()

    expect(
      await screen.findByText('لا توجد حجوزات تحتاج إجراء'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('لا توجد مبالغ غير مسواة حالياً'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('-')).not.toHaveLength(0)
    expect(screen.getAllByText('0 جنيه')).not.toHaveLength(0)
  })
})
