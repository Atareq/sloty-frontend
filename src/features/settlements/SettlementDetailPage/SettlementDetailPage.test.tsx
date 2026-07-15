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
    mockAuth()
    mockedGetSettlement.mockResolvedValue({
      id: 9,
      staff: { id: 5, name: 'Ahmed Staff' },
      totals: {
        cash: '1200.00',
        digital_wallet: '500.00',
        bank_transfer: '300.00',
        other: '0.00',
        total: '2000.00',
      },
      notes: 'Shift settlement',
      settled_by: { id: 1, name: 'Owner User' },
      settled_at: '2026-07-15T10:00:00Z',
      transactions: [
        {
          id: 10,
          booking: 55,
          amount: '300.00',
          payment_method: 'CASH',
          is_settled: true,
        },
      ],
    })
  })

  it('renders locked settlement details', async () => {
    renderPage()

    expect(
      await screen.findByText('هذه التسوية مقفلة ولا يمكن تعديل معاملاتها'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ahmed Staff')).toBeInTheDocument()
    expect(screen.getByText('2000.00')).toBeInTheDocument()
    expect(screen.getByText('Shift settlement')).toBeInTheDocument()
    expect(screen.getByText('معاملة مقفلة')).toBeInTheDocument()
    expect(mockedGetSettlement).toHaveBeenCalledWith('nasr-club', '9')
  })
})
