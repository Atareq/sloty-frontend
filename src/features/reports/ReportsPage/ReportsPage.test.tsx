import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { getReports } from '../reportsApi'
import { ReportsPage } from './ReportsPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../reportsApi', () => ({
  getReports: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetReports = vi.mocked(getReports)

function mockAuth(
  role: 'OWNER' | 'STAFF' = 'OWNER',
  selectedClubSlug: string | null = 'nasr-club',
) {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: null,
    selectedClubSlug,
    selectedMembership: selectedClubSlug
      ? {
          id: 10,
          role,
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

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
    mockedGetReports.mockResolvedValue({
      totals: {
        bookings_count: 75,
        completed_count: 50,
        cancelled_count: 8,
        no_show_count: 3,
        gross_amount: '10000.00',
        paid_amount: '8500.00',
        remaining_amount: '1500.00',
        cancelled_payment_amount: '500.00',
      },
      by_payment_method: {
        cash: '5000.00',
        digital_wallet: '2000.00',
        bank_transfer: '1000.00',
        other: '500.00',
      },
      by_court: [
        {
          court: 1,
          court_name: 'Court A',
          bookings_count: 25,
          paid_amount: '3500.00',
        },
      ],
      by_staff: [
        {
          staff: 5,
          staff_name: 'Ahmed Staff',
          transactions_count: 10,
          paid_amount: '2000.00',
        },
      ],
    })
  })

  it('shows no selected club message', async () => {
    mockAuth('OWNER', null)

    render(<ReportsPage />)

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض التقارير'),
    ).toBeInTheDocument()
    expect(mockedGetReports).not.toHaveBeenCalled()
  })

  it('blocks staff users', async () => {
    mockAuth('STAFF')

    render(<ReportsPage />)

    expect(
      await screen.findByText('ليس لديك صلاحية عرض التقارير'),
    ).toBeInTheDocument()
    expect(mockedGetReports).not.toHaveBeenCalled()
  })

  it('renders backend totals and report breakdowns', async () => {
    render(<ReportsPage />)

    expect(await screen.findByText('10000.00')).toBeInTheDocument()
    expect(screen.getAllByText('5000.00')).toHaveLength(1)
    expect(screen.getByText('Court A')).toBeInTheDocument()
    expect(screen.getByText('Ahmed Staff')).toBeInTheDocument()
    expect(mockedGetReports).toHaveBeenCalledWith('nasr-club', {})
  })
})
