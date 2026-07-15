import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import {
  createSettlement,
  getSettlementPreview,
} from '../settlementsApi'
import { SettlementPreviewPage } from './SettlementPreviewPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../settlementsApi', () => ({
  createSettlement: vi.fn(),
  getSettlementPreview: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetSettlementPreview = vi.mocked(getSettlementPreview)
const mockedCreateSettlement = vi.mocked(createSettlement)

function mockAuth(role: 'OWNER' | 'MANAGER' | 'STAFF' = 'OWNER') {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: {
      id: 1,
      username: 'owner-user',
      email: 'owner@example.com',
      first_name: 'أحمد',
      last_name: 'علي',
      phone_number: null,
      is_active: true,
      is_platform_admin: false,
      requires_club_selection: false,
      memberships: [
        {
          id: 10,
          role,
          club: {
            id: 1,
            name: 'نادي النصر',
            slug: 'nasr-club',
            city: 'ASSIUT',
            is_active: true,
          },
          court: null,
          can_manage_settlements: role === 'MANAGER',
        },
      ],
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
      court: null,
      can_manage_settlements: role === 'MANAGER',
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

function renderPage() {
  return render(
    <MemoryRouter>
      <SettlementPreviewPage />
    </MemoryRouter>,
  )
}

describe('SettlementPreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
    mockedGetSettlementPreview.mockResolvedValue({
      staff: { id: 5, name: 'Ahmed Staff' },
      date_from: '2026-07-01',
      date_to: '2026-07-15',
      totals: {
        cash: '1200.00',
        digital_wallet: '500.00',
        bank_transfer: '300.00',
        other: '0.00',
        total: '2000.00',
      },
      transactions: [
        {
          id: 10,
          booking: 55,
          amount: '300.00',
          payment_method: 'CASH',
          created_by: { id: 5, name: 'Ahmed Staff' },
          is_settled: false,
        },
      ],
    })
    mockedCreateSettlement.mockResolvedValue({ id: 99 })
  })

  it('shows no selected club message', async () => {
    mockAuth()
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      selectedClubSlug: null,
      selectedMembership: null,
    })

    renderPage()

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض التسويات'),
    ).toBeInTheDocument()
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
  })

  it('blocks staff users in the settlement page UX', async () => {
    mockAuth('STAFF')

    renderPage()

    expect(
      await screen.findByText('ليس لديك صلاحية إدارة التسويات'),
    ).toBeInTheDocument()
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
  })

  it('blocks managers without the settlement flag', async () => {
    mockAuth('MANAGER')
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      selectedMembership: {
        ...mockedUseAuth().selectedMembership!,
        can_manage_settlements: false,
      },
    })

    renderPage()

    expect(
      await screen.findByText('ليس لديك صلاحية إدارة التسويات'),
    ).toBeInTheDocument()
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
  })

  it('renders backend totals and transactions', async () => {
    renderPage()

    expect(await screen.findByText('2000.00')).toBeInTheDocument()
    expect(screen.getByText('1200.00')).toBeInTheDocument()
    expect(screen.getAllByText('300.00')).toHaveLength(2)
    expect(screen.getByText('Ahmed Staff')).toBeInTheDocument()
    expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {})
  })

  it('does not show confirm action when preview has no transactions', async () => {
    mockedGetSettlementPreview.mockResolvedValueOnce({
      totals: {
        cash: '0.00',
        digital_wallet: '0.00',
        bank_transfer: '0.00',
        other: '0.00',
        total: '0.00',
      },
      transactions: [],
    })

    renderPage()

    expect(
      await screen.findByText('لا توجد مبالغ غير مسواة لهذه البيانات'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'تأكيد التسوية' }),
    ).not.toBeInTheDocument()
  })

  it('creates settlement with selected club slug and payload', async () => {
    const user = userEvent.setup()

    renderPage()

    await screen.findByText('2000.00')
    await user.type(screen.getByLabelText('رقم الموظف'), '5')
    await user.click(screen.getByRole('button', { name: 'تأكيد التسوية' }))
    await user.type(screen.getByLabelText('ملاحظات'), 'Shift settlement')
    await user.click(screen.getByRole('button', { name: 'تأكيد التسوية' }))

    await waitFor(() => {
      expect(mockedCreateSettlement).toHaveBeenCalledWith('nasr-club', {
        staff: '5',
        notes: 'Shift settlement',
      })
    })
  })
})
