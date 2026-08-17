import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    currentUser: null,
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
      transaction_count: 1,
      total_amount: '150.00',
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
      await screen.findByText('المبلغ الحالي غير المسوى'),
    ).toBeInTheDocument()
    expect(await screen.findByText('أحمد علي')).toBeInTheDocument()
    expect(screen.queryByText('مراجعة دفعات موظف')).not.toBeInTheDocument()
    expect(screen.queryByText('تأكيد التسوية')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {})
    })
    expect(mockedListSettlements).toHaveBeenCalledWith('nasr-club')
    expect(mockedListClubUsers).not.toHaveBeenCalled()
  })

  it('preserves management mode for authorized manager', async () => {
    mockAuth('MANAGER', true)

    renderHub()

    expect(await screen.findByText('مراجعة دفعات موظف')).toBeInTheDocument()
    expect(screen.getAllByText('الموظف المحصل').length).toBeGreaterThan(0)
    await waitFor(() => {
      expect(mockedListSettlements).toHaveBeenCalledWith('nasr-club')
    })
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
  })
})
