import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import { getDashboardSummary } from '../../dashboard/dashboardApi'
import type { DashboardSummaryResponse } from '../../dashboard/dashboard.types'
import { getSettlementPreview, listSettlements } from '../settlementsApi'
import { SettlementsHubPage } from './SettlementsHubPage'

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
const mockedGetSettlementPreview = vi.mocked(getSettlementPreview)
const mockedListSettlements = vi.mocked(listSettlements)
const mockedListClubUsers = vi.mocked(listClubUsers)
const mockedGetDashboardSummary = vi.mocked(getDashboardSummary)

const dashboardSummary: DashboardSummaryResponse = {
  context: {
    club_id: 1,
    club_name: 'نادي النصر',
    date_from: '2026-08-16',
    date_to: '2026-08-16',
  },
  needs_action_breakdown: {
    expiring_hold_count: 0,
    hold_waiting_payment_count: 0,
    overdue_confirmed_count: 0,
    remaining_after_slot_end_count: 0,
  },
  payment_method_totals: {},
  staff_unsettled_money: [
    {
      collected_by: 15,
      collected_by_name: 'أحمد محمد',
      court: 3,
      court_name: 'ملعب 1',
      total_unsettled_amount: '1250.00',
      unsettled_transaction_count: 12,
      totals_by_payment_method: { CASH: '1250.00' },
    },
  ],
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
    staff_with_unsettled_transactions_count: 1,
    total_booking_value: '0.00',
    total_bookings: 0,
    total_paid_amount: '0.00',
    total_remaining_amount: null,
    transaction_count: 0,
    transaction_total: '0.00',
    unsettled_transaction_total_amount: '1250.00',
    unsettled_transaction_count: 12,
  },
}

function mockAuth(role: 'OWNER' | 'MANAGER' | 'STAFF', canSettle = false) {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: {
      id: 1,
      username: 'current-user',
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
    selectedClubSlug: 'nasr-club',
    selectedMembership: {
      id: 10,
      role,
      club: {
        id: 1,
        name: 'نادي النصر',
        slug: 'nasr-club',
        city: 'ASSIUT',
        is_active: true,
      },
      court: role === 'STAFF' ? { id: 7, name: 'ملعب 1' } : null,
      permissions: {
        can_change_pricing: false,
        can_manage_working_hours: false,
        can_manage_settlements: canSettle,
      },
    },
    role,
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

function renderHub(path = '/settlements') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettlementsHubPage />
    </MemoryRouter>,
  )
}

describe('SettlementsHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth('STAFF')
    mockedGetDashboardSummary.mockResolvedValue(dashboardSummary)
    mockedGetSettlementPreview.mockResolvedValue({
      club: 1,
      collected_by: 1,
      collected_by_name: 'أحمد علي',
      is_self_preview: true,
      can_approve: false,
      approval_required: true,
      period_start: '2026-08-16T10:00:00Z',
      period_end: '2026-08-16T11:00:00Z',
      transaction_count: 1,
      total_amount: '150.00',
      booking_payments: '150.00',
      booking_refunds: '0.00',
      net_amount: '150.00',
      totals_by_payment_method: { CASH: '150.00' },
      transactions: [
        {
          id: 20,
          booking: 5,
          amount: '150.00',
          payment_method: 'CASH',
          created: '2026-08-16T10:00:00Z',
        },
      ],
    })
    mockedListSettlements.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
    mockedListClubUsers.mockResolvedValue({
      count: 1,
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
  })

  it('loads staff own preview without collector filters or history by default', async () => {
    renderHub()

    expect(await screen.findByText('مبالغ محتاجة استلام')).toBeInTheDocument()
    expect(await screen.findByText('أحمد علي')).toBeInTheDocument()
    expect(screen.queryByText('المبالغ مع الموظفين')).not.toBeInTheDocument()
    expect(screen.queryByText('استلام المبلغ')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /معاملاتي المالية/ }))
      .toHaveAttribute('href', '/transactions')
    await waitFor(() => {
      expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {})
    })
    expect(mockedListSettlements).not.toHaveBeenCalled()
    expect(mockedListClubUsers).not.toHaveBeenCalled()
    expect(mockedGetDashboardSummary).not.toHaveBeenCalled()
  })

  it('defaults management to all employees and current money without picking a collector', async () => {
    mockAuth('MANAGER', true)

    renderHub()

    expect(await screen.findByText('المبالغ مع الموظفين')).toBeInTheDocument()
    expect(screen.getByText('مراجعة المبالغ المستلمة سابقًا')).toBeInTheDocument()
    expect(screen.getByText('مبالغ محتاجة استلام')).toBeInTheDocument()
    expect(await screen.findByText('أحمد محمد')).toBeInTheDocument()
    expect(screen.getByText('معاه دلوقتي')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'استلام المبلغ' }))
      .toBeInTheDocument()
    expect(screen.getByRole('link', { name: /عرض سجل المعاملات المالية/ }))
      .toHaveAttribute('href', '/transactions')
    expect(screen.queryByText('تم استلامها سابقًا')).not.toBeInTheDocument()
    expect(screen.queryByText('عرض المعاملات المرتبطة')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(mockedGetDashboardSummary).toHaveBeenCalledWith('nasr-club', {
        settlement_status: 'unsettled',
      })
    })
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
    expect(mockedListSettlements).not.toHaveBeenCalled()
  })

  it('keeps linked preview transactions collapsed until the same card is expanded', async () => {
    const user = userEvent.setup()
    mockAuth('MANAGER', true)
    mockedGetSettlementPreview.mockResolvedValueOnce({
      club: 1,
      collected_by: 15,
      collected_by_name: 'أحمد محمد',
      is_self_preview: false,
      can_approve: true,
      approval_required: false,
      period_start: '2026-08-16T10:00:00Z',
      period_end: '2026-08-16T11:00:00Z',
      transaction_count: 1,
      total_amount: '150.00',
      booking_payments: '150.00',
      booking_refunds: '0.00',
      net_amount: '150.00',
      totals_by_payment_method: { CASH: '150.00' },
      transactions: [
        {
          id: 20,
          booking: 5,
          amount: '150.00',
          payment_method: 'CASH',
          created: '2026-08-16T10:00:00Z',
          payment_reference: 'IPN-1',
        },
      ],
    })

    renderHub('/settlements?collected_by=15')

    const expander = await screen.findByRole('button', {
      name: /عرض المعاملات المرتبطة \(1\)/,
    })
    expect(expander).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('IPN-1')).not.toBeInTheDocument()

    await user.click(expander)
    expect(expander).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('IPN-1')).toBeInTheDocument()
  })

  it('loads historical settled records only after the previous-receipts checkbox is applied', async () => {
    const user = userEvent.setup()
    mockAuth('OWNER', true)
    mockedListSettlements.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 9,
          collected_by: 15,
          collected_by_name: 'أحمد محمد',
          total_amount: '2000.00',
          transaction_count: 8,
          period_start: '2026-07-19T10:00:00Z',
          period_end: '2026-07-19T15:20:00Z',
          status: 'SETTLED',
          created_by: { id: 1, name: 'Owner User' },
          created: '2026-07-19T15:20:00Z',
        },
      ],
    })

    renderHub()
    await screen.findByText('أحمد محمد')
    await user.click(screen.getByRole('checkbox', {
      name: 'مراجعة المبالغ المستلمة سابقًا',
    }))

    expect(await screen.findByText('تم استلامها سابقًا')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'عرض التفاصيل' })).toHaveAttribute(
      'href',
      '/settlements/9',
    )
    await waitFor(() => {
      expect(mockedListSettlements).toHaveBeenCalledWith('nasr-club', {
        status: 'SETTLED',
      })
    })
  })

  it('shows the staff empty-custody state for NO_UNSETTLED_TRANSACTIONS', async () => {
    mockedGetSettlementPreview.mockRejectedValueOnce(
      new ApiClientError('No unsettled transactions', 404, {
        code: 'NO_UNSETTLED_TRANSACTIONS',
      }),
    )

    renderHub()

    expect(
      await screen.findByText('مفيش مبالغ معاك دلوقتي.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('No unsettled transactions')).not.toBeInTheDocument()
  })

  it('does not offer the signed-in manager as a custody review target', async () => {
    mockAuth('MANAGER', true)
    mockedListClubUsers.mockResolvedValueOnce({
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          membership_id: 99,
          username: 'current-user',
          first_name: 'Current',
          last_name: 'User',
          role: 'MANAGER',
        },
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

    renderHub()

    expect(await screen.findByText('المبالغ مع الموظفين')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /كل الموظفين/ }))
    expect(screen.queryByRole('option', { name: 'Current User' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'كل الموظفين' }))
      .toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'أحمد محمد' }))
      .toBeInTheDocument()
  })
})
