import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { getDashboardSummary } from '../dashboardApi'
import type { DashboardSummaryResponse } from '../dashboard.types'
import { DashboardPage } from './DashboardPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../dashboardApi', () => ({
  getDashboardSummary: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetDashboardSummary = vi.mocked(getDashboardSummary)

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
    unsettled_transaction_amount: '700.00',
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

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
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
  })

  it('shows loading skeletons without fake zeroes', () => {
    mockedGetDashboardSummary.mockReturnValue(new Promise(() => {}))

    renderDashboard()

    expect(screen.getByText('جاري تحميل الملخص...')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
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

  it('links booking status and money rows to filtered pages', async () => {
    renderDashboard()

    expect(await screen.findByText('حالات الحجوزات')).toBeInTheDocument()
    expect(screen.getByText('انتظار الدفع').closest('a')).toHaveAttribute(
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
        unsettled_transaction_amount: null,
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
