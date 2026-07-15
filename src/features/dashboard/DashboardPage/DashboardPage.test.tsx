import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { getDashboardSummary } from '../dashboardApi'
import { DashboardPage } from './DashboardPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../dashboardApi', () => ({
  getDashboardSummary: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetDashboardSummary = vi.mocked(getDashboardSummary)

function mockAuth(
  selectedClubSlug: string | null = 'nasr-club',
  role: 'OWNER' | 'STAFF' = 'OWNER',
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

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
    mockedGetDashboardSummary.mockResolvedValue({
      bookings: {
        today: 12,
        week: 61,
        confirmed: 20,
        completed: 31,
        cancelled: 5,
        no_show: 2,
      },
      payments: {
        paid_amount: '8500.00',
        remaining_amount: '1200.00',
        cancelled_amount: '500.00',
      },
      settlements: {
        unsettled_amount: '2300.00',
        settled_amount: '6200.00',
      },
      courts: [
        {
          id: 1,
          name: 'Court A',
          bookings_count: 20,
          revenue: '3000.00',
        },
      ],
      recent_activity: [
        {
          id: 1,
          action: 'BOOKING_CREATED',
          message: 'تم إنشاء حجز جديد',
          actor: { id: 5, name: 'Ahmed Staff' },
        },
      ],
    })
  })

  it('shows no selected club message', async () => {
    mockAuth(null)

    render(<DashboardPage />)

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض لوحة التحكم'),
    ).toBeInTheDocument()
    expect(mockedGetDashboardSummary).not.toHaveBeenCalled()
  })

  it('renders backend booking payment settlement metrics and activity', async () => {
    render(<DashboardPage />)

    expect(await screen.findByText('8500.00')).toBeInTheDocument()
    expect(screen.getByText('1200.00')).toBeInTheDocument()
    expect(screen.getByText('2300.00')).toBeInTheDocument()
    expect(screen.getByText('Court A')).toBeInTheDocument()
    expect(screen.getByText('تم إنشاء حجز جديد')).toBeInTheDocument()
    expect(mockedGetDashboardSummary).toHaveBeenCalledWith('nasr-club', {})
  })

  it('blocks staff from financial dashboard metrics', async () => {
    mockAuth('nasr-club', 'STAFF')

    render(<DashboardPage />)

    expect(
      await screen.findByText('ليس لديك صلاحية عرض لوحة التحكم'),
    ).toBeInTheDocument()
    expect(mockedGetDashboardSummary).not.toHaveBeenCalled()
  })

  it('shows missing backend fields as dashes', async () => {
    mockedGetDashboardSummary.mockResolvedValueOnce({})

    render(<DashboardPage />)

    expect(await screen.findAllByText('-')).not.toHaveLength(0)
  })
})
