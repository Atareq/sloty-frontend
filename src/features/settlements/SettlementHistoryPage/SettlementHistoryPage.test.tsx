import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { getDashboardSummary } from '../../dashboard/dashboardApi'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import { getSettlementPreview, listSettlements } from '../settlementsApi'
import { SettlementHistoryPage } from './SettlementHistoryPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../clubUsers/clubUsersApi', () => ({
  listClubUsers: vi.fn(),
}))

vi.mock('../../dashboard/dashboardApi', () => ({
  getDashboardSummary: vi.fn(),
}))

vi.mock('../settlementsApi', () => ({
  getSettlementPreview: vi.fn(),
  listSettlements: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetDashboardSummary = vi.mocked(getDashboardSummary)
const mockedGetSettlementPreview = vi.mocked(getSettlementPreview)
const mockedListClubUsers = vi.mocked(listClubUsers)
const mockedListSettlements = vi.mocked(listSettlements)

function mockAuth(options: {
  canManageSettlements?: boolean
  selectedClubSlug?: string | null
} = {}) {
  const selectedClubSlug =
    'selectedClubSlug' in options ? options.selectedClubSlug ?? null : 'nasr-club'

  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: {
      id: 1,
      username: 'manager',
      email: 'manager@example.com',
      first_name: 'Current',
      last_name: 'User',
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
          role: 'MANAGER',
          club: {
            id: 1,
            name: 'نادي النصر',
            slug: selectedClubSlug,
            city: 'ASSIUT',
            is_active: true,
          },
          court: null,
          can_manage_settlements: options.canManageSettlements ?? true,
        }
      : null,
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
}

describe('SettlementHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
    mockedListClubUsers.mockResolvedValue([])
    mockedGetDashboardSummary.mockResolvedValue({
      context: {
        club_id: 1,
        club_name: 'نادي النصر',
        date_from: '2026-07-19',
        date_to: '2026-07-19',
      },
      needs_action_breakdown: {
        expiring_hold_count: 0,
        hold_waiting_payment_count: 0,
        overdue_confirmed_count: 0,
        remaining_after_slot_end_count: 0,
      },
      payment_method_totals: {},
      staff_unsettled_money: [],
      summary: {
        cancelled_bookings: 0,
        completed_bookings: 0,
        confirmed_bookings: 0,
        expired_bookings: 0,
        hold_bookings: 0,
        needs_action_count: 0,
        no_show_bookings: 0,
        settled_transaction_amount: '0.00',
        settled_transaction_count: 0,
        staff_with_unsettled_transactions_count: 0,
        total_booking_value: '0.00',
        total_bookings: 0,
        total_paid_amount: '0.00',
        total_remaining_amount: null,
        transaction_count: 0,
        transaction_total: '0.00',
        unsettled_transaction_total_amount: '0.00',
        unsettled_transaction_count: 0,
      },
    })
    mockedGetSettlementPreview.mockResolvedValue({
      club: 1,
      collected_by: 1,
      collected_by_name: 'Manager User',
      is_self_preview: true,
      can_approve: false,
      approval_required: true,
      period_start: '2026-07-19T15:20:00Z',
      period_end: '2026-07-19T16:20:00Z',
      transaction_count: 0,
      total_amount: '0.00',
      booking_payments: '0.00',
      booking_refunds: '0.00',
      net_amount: '0.00',
      totals_by_payment_method: {},
      transactions: [],
    })
    mockedListSettlements.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
  })

  it('reuses the money-management hub instead of a separate history page', async () => {
    render(
      <MemoryRouter>
        <SettlementHistoryPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('المبالغ مع الموظفين')).toBeInTheDocument()
    expect(screen.getByText('مراجعة المبالغ المستلمة سابقًا')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'عرض الرئيسية' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'عرض التحصيلات المفتوحة' }))
      .not.toBeInTheDocument()
    await waitFor(() => {
      expect(mockedGetDashboardSummary).toHaveBeenCalledWith('nasr-club', {
        settlement_status: 'unsettled',
      })
    })
  })

  it('shows own preview mode for managers without can_manage_settlements', async () => {
    mockAuth({ canManageSettlements: false })

    render(
      <MemoryRouter>
        <SettlementHistoryPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('مفيش مبالغ معاك دلوقتي.'))
      .toBeInTheDocument()
    expect(screen.queryByText('المبالغ مع الموظفين')).not.toBeInTheDocument()
    expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {})
    expect(mockedListSettlements).not.toHaveBeenCalled()
  })

  it('shows no selected club message', async () => {
    mockAuth({ selectedClubSlug: null })

    render(
      <MemoryRouter>
        <SettlementHistoryPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض المبالغ.'),
    ).toBeInTheDocument()
    expect(mockedListSettlements).not.toHaveBeenCalled()
  })
})
