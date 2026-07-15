import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { listSettlements } from '../settlementsApi'
import { SettlementHistoryPage } from './SettlementHistoryPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../settlementsApi', () => ({
  listSettlements: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListSettlements = vi.mocked(listSettlements)

function paginatedResponse<T>(results: T[]) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

function mockAuth() {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: null,
    selectedClubSlug: 'nasr-club',
    selectedMembership: null,
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

describe('SettlementHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
  })

  it('renders settlement cards from history', async () => {
    mockedListSettlements.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 9,
          staff: { id: 5, name: 'Ahmed Staff' },
          total_amount: '2000.00',
          date_from: '2026-07-01',
          date_to: '2026-07-15',
          settled_at: '2026-07-15T10:00:00Z',
        },
      ]),
    )

    render(
      <MemoryRouter>
        <SettlementHistoryPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('#9')).toBeInTheDocument()
    expect(screen.getByText('Ahmed Staff')).toBeInTheDocument()
    expect(screen.getByText('2000.00')).toBeInTheDocument()
    expect(mockedListSettlements).toHaveBeenCalledWith('nasr-club')
  })
})
