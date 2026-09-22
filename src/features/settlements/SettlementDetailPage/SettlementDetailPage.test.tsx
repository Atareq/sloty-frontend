import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { getSettlement } from '../settlementsApi'
import { SettlementDetailPage } from './SettlementDetailPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../settlementsApi', () => ({
  getSettlement: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetSettlement = vi.mocked(getSettlement)
const refreshCurrentUser = vi.fn()

function mockAuth(role: 'OWNER' | 'STAFF' | 'ADMIN' | null = 'OWNER') {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: {
      id: 1,
      username: 'owner',
      email: 'owner@example.com',
      first_name: 'Owner',
      last_name: 'User',
      phone_number: null,
      is_active: true,
      profile_role: role ?? 'OWNER',
      account_created_by: null,
    },
    selectedClubSlug: 'nasr-club',
    accessibleClubs: [],
    accessibleCourts: [],
    selectedCourtId: null,
    selectCourt: vi.fn(),
    role,
    isAuthenticated: true,
    isOperational: true,
    isLoadingSession: false,
    isTokenExpired: false,
    sessionError: null,
    login: vi.fn(),
    logout: vi.fn(),
    selectClub: vi.fn(),
    clearSelectedClub: vi.fn(),
    refreshCurrentUser,
    setTokens: vi.fn(),
  })
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/settlements/9']}>
      <Routes>
        <Route
          element={<SettlementDetailPage />}
          path="/settlements/:settlementId"
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SettlementDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    refreshCurrentUser.mockReset()
    mockAuth()
    mockedGetSettlement.mockResolvedValue({
      id: 9,
      club: 1,
      collected_by: 5,
      collected_by_name: 'Ahmed Staff',
      total_amount: '2000.00',
      transaction_count: 8,
      totals_by_payment_method: {
        CASH: '1200.00',
        DIGITAL_WALLET: '500.00',
      },
      period_start: '2026-07-19T10:00:00Z',
      period_end: '2026-07-19T15:20:00Z',
      notes: 'Shift settlement',
      created_by: { id: 1, name: 'Owner User' },
      created: '2026-07-19T15:20:00Z',
      settled_by: 1,
      settled_by_name: 'Owner User',
      lines: [
        {
          id: 1,
          transaction: 101,
          amount: '500.00',
          payment_method: 'CASH',
        },
      ],
    })
  })

  it('renders collected-by settlement detail with display-only backend period and audit info', async () => {
    renderPage()

    expect(await screen.findByText('المحصل')).toBeInTheDocument()
    expect(screen.getAllByText('Ahmed Staff')).not.toHaveLength(0)
    expect(screen.getByText('2,000.00 جنيه')).toBeInTheDocument()
    expect(screen.getByText('Shift settlement')).toBeInTheDocument()
    expect(screen.getByText('Owner User')).toBeInTheDocument()
    expect(screen.queryByText('#101')).not.toBeInTheDocument()
    expect(mockedGetSettlement).toHaveBeenCalledWith('nasr-club', '9')
  })

  it('handles error when settlement loading fails', async () => {
    mockedGetSettlement.mockRejectedValueOnce(new Error('Network error'))

    renderPage()

    expect(
      await screen.findByText('تعذر تحميل تفاصيل التسوية'),
    ).toBeInTheDocument()
  })

  it('handles unauthorized access when role has no permission', async () => {
    mockAuth(null)

    renderPage()

    expect(
      await screen.findByText('ليس لديك صلاحية عرض التسويات'),
    ).toBeInTheDocument()
  })
})
