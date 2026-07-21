import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import { listCourts } from '../../courts/courtsApi'
import { listSettlements } from '../settlementsApi'
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
  listSettlements: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListClubUsers = vi.mocked(listClubUsers)
const mockedListCourts = vi.mocked(listCourts)
const mockedListSettlements = vi.mocked(listSettlements)

function paginatedResponse<T>(results: T[]) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

function mockAuth(options: {
  canManageSettlements?: boolean
  selectedClubSlug?: string | null
} = {}) {
  const selectedClubSlug =
    'selectedClubSlug' in options ? options.selectedClubSlug ?? null : 'nasr-club'

  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: null,
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
    mockedListClubUsers.mockResolvedValue([
      {
        id: 5,
        membership_id: 50,
        username: 'staff_ahmed',
        first_name: 'Ahmed',
        last_name: 'Staff',
        role: 'STAFF',
      },
    ])
    mockedListCourts.mockResolvedValue(
      paginatedResponse([
        {
          id: 3,
          club: 1,
          name: 'Court A',
          sport_type: 'FOOTBALL',
          default_price: '300.00',
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 12,
        },
      ]),
    )
    mockedListSettlements.mockResolvedValue(
      paginatedResponse([
        {
          id: 9,
          collected_by: 5,
          collected_by_name: 'Ahmed Staff',
          total_amount: '2000.00',
          transaction_count: 8,
          period_start: '2026-07-19T10:00:00Z',
          period_end: '2026-07-19T15:20:00Z',
          status: 'PENDING',
          created_by: { id: 1, name: 'Owner User' },
          created: '2026-07-19T15:20:00Z',
        },
      ]),
    )
  })

  it('renders settlement cards with collected-by and backend-generated period', async () => {
    render(
      <MemoryRouter>
        <SettlementHistoryPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('#9')).toBeInTheDocument()
    expect(screen.getByText('التسويات المالية والجرد')).toBeInTheDocument()
    expect(screen.getByText('مراجعة دفعات موظف')).toBeInTheDocument()
    expect(screen.getAllByText('Ahmed Staff').length).toBeGreaterThan(0)
    expect(screen.getByText('2000.00')).toBeInTheDocument()
    expect(screen.getByText('عدد المعاملات')).toBeInTheDocument()
    expect(mockedListSettlements).toHaveBeenCalledWith('nasr-club')
    expect(screen.getByRole('link', { name: 'عرض التفاصيل' })).toHaveAttribute(
      'href',
      '/settlements/9',
    )
    expect(screen.queryByText(/dry_run/i)).not.toBeInTheDocument()
    expect(screen.queryByText('تجربة')).not.toBeInTheDocument()
    expect(screen.queryByText(/pending settlement draft/i)).not.toBeInTheDocument()
  })

  it('submits collected_by/status/court filters', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <SettlementHistoryPage />
      </MemoryRouter>,
    )

    await screen.findByText('#9')
    await user.selectOptions(screen.getAllByLabelText('الموظف المحصل')[1], '5')
    await user.selectOptions(screen.getByLabelText('الحالة'), 'PENDING')
    await user.selectOptions(screen.getByLabelText('الملعب'), '3')
    await user.click(screen.getByRole('button', { name: 'تحديث السجل' }))

    await waitFor(() => {
      expect(mockedListSettlements).toHaveBeenLastCalledWith('nasr-club', {
        collected_by: '5',
        status: 'PENDING',
        court: '3',
      })
    })
  })

  it('blocks managers without can_manage_settlements', async () => {
    mockAuth({ canManageSettlements: false })

    render(
      <MemoryRouter>
        <SettlementHistoryPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('ليس لديك صلاحية إدارة التسويات.'),
    ).toBeInTheDocument()
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
      await screen.findByText('اختر ناديًا أولًا لعرض التسويات.'),
    ).toBeInTheDocument()
    expect(mockedListSettlements).not.toHaveBeenCalled()
  })

  it('renders helpful empty state actions', async () => {
    mockedListSettlements.mockResolvedValueOnce(paginatedResponse([]))

    render(
      <MemoryRouter>
        <SettlementHistoryPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('لا توجد تسويات مسجلة حتى الآن'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('عند تأكيد تسوية موظف ستظهر هنا كسجل مالي مغلق.'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'عرض لوحة التحكم' })[0])
      .toHaveAttribute('href', '/dashboard')
    expect(screen.getAllByRole('link', { name: 'عرض الدفعات غير المسواة' })[0])
      .toHaveAttribute(
        'href',
        '/transactions?settlement_status=unsettled&is_cancelled=false',
      )
  })
})
