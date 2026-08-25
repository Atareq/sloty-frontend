import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import { listCourts } from '../../courts/courtsApi'
import { getSettlementPreview, listSettlements } from '../settlementsApi'
import { SettlementsHubPage } from './SettlementsHubPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../clubUsers/clubUsersApi', () => ({
  listClubUsers: vi.fn(),
}))

vi.mock('../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

vi.mock('../settlementsApi', () => ({
  getSettlementPreview: vi.fn(),
  listSettlements: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetSettlementPreview = vi.mocked(getSettlementPreview)
const mockedListSettlements = vi.mocked(listSettlements)
const mockedListClubUsers = vi.mocked(listClubUsers)
const mockedListCourts = vi.mocked(listCourts)

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

function renderHub() {
  return render(
    <MemoryRouter initialEntries={['/settlements']}>
      <SettlementsHubPage />
    </MemoryRouter>,
  )
}

describe('SettlementsHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth('STAFF')
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
    mockedListCourts.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
  })

  it('loads staff own preview and self-scoped history without collected_by', async () => {
    renderHub()

    expect(
      await screen.findByText('عهدتي'),
    ).toBeInTheDocument()
    expect(await screen.findByText('أحمد علي')).toBeInTheDocument()
    expect(screen.queryByText('عهد الموظفين')).not.toBeInTheDocument()
    expect(screen.queryByText('تأكيد استلام العهدة')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {})
    })
    expect(mockedListSettlements).toHaveBeenCalledWith('nasr-club')
    expect(mockedListClubUsers).not.toHaveBeenCalled()
  })

  it('preserves management mode for authorized manager', async () => {
    mockAuth('MANAGER', true)

    renderHub()

    expect(await screen.findByText('عهد الموظفين')).toBeInTheDocument()
    expect(screen.getAllByText('الموظف المحصل').length).toBeGreaterThan(0)
    await waitFor(() => {
      expect(mockedListSettlements).toHaveBeenCalledWith('nasr-club')
    })
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
  })

  it('shows the staff empty-custody state for NO_UNSETTLED_TRANSACTIONS', async () => {
    mockedGetSettlementPreview.mockRejectedValueOnce(
      new ApiClientError('No unsettled transactions', 404, {
        code: 'NO_UNSETTLED_TRANSACTIONS',
      }),
    )

    renderHub()

    expect(
      await screen.findByText('مفيش مبلغ غير مسوى عندك دلوقتي.'),
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

    expect(await screen.findByText('عهد الموظفين')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText('Current User')).not.toBeInTheDocument()
    })
    expect(screen.getAllByText('أحمد محمد').length).toBeGreaterThan(0)
  })
})
