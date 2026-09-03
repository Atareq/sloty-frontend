import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import { listCourts } from '../../courts/courtsApi'
import {
  getCurrentCustodySummary,
  getSettlementPreview,
  listSettlements,
} from '../settlementsApi'
import { SettlementHistoryPage } from './SettlementHistoryPage'

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
  getCurrentCustodySummary: vi.fn(),
  getSettlementPreview: vi.fn(),
  listSettlements: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetCurrentCustodySummary = vi.mocked(getCurrentCustodySummary)
const mockedGetSettlementPreview = vi.mocked(getSettlementPreview)
const mockedListClubUsers = vi.mocked(listClubUsers)
const mockedListCourts = vi.mocked(listCourts)
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
    mockedListCourts.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
    mockedGetCurrentCustodySummary.mockResolvedValue({
      results: [],
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
      expect(mockedGetCurrentCustodySummary).toHaveBeenCalledWith(
        'nasr-club',
        {},
      )
    })
  })

  it('shows own preview mode for managers without can_manage_settlements', async () => {
    mockAuth({ canManageSettlements: false })

    render(
      <MemoryRouter>
        <SettlementHistoryPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('لا توجد مبالغ مستحقة للتسليم حاليًا'),
    ).toBeInTheDocument()
    expect(screen.queryByText('المبالغ مع الموظفين')).not.toBeInTheDocument()
    expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {})
    expect(mockedGetCurrentCustodySummary).not.toHaveBeenCalled()
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
    expect(mockedGetCurrentCustodySummary).not.toHaveBeenCalled()
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
    expect(mockedListSettlements).not.toHaveBeenCalled()
  })
})
