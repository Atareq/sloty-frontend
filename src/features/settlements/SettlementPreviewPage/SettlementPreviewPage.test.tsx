import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import { listCourts } from '../../courts/courtsApi'
import {
  confirmUserSettlement,
  reviewUserSettlement,
} from '../settlementsApi'
import { SettlementPreviewPage } from './SettlementPreviewPage'

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
  confirmUserSettlement: vi.fn(),
  reviewUserSettlement: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListClubUsers = vi.mocked(listClubUsers)
const mockedListCourts = vi.mocked(listCourts)
const mockedReviewUserSettlement = vi.mocked(reviewUserSettlement)
const mockedConfirmUserSettlement = vi.mocked(confirmUserSettlement)

const clubUser = {
  id: 5,
  membership_id: 50,
  username: 'staff_ahmed',
  first_name: 'Ahmed',
  last_name: 'Staff',
  phone_number: '+201000000000',
  role: 'STAFF' as const,
  court: 3,
  court_name: 'Court A',
  membership_is_active: true,
}

function paginatedResponse<T>(results: T[]) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

function mockAuth(role: 'OWNER' | 'MANAGER' | 'STAFF' = 'OWNER') {
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
    mockedListClubUsers.mockResolvedValue(paginatedResponse([clubUser]))
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
    mockedReviewUserSettlement.mockResolvedValue({
      club: 1,
      collected_by: 5,
      collected_by_name: 'Ahmed Staff',
      transaction_count: 1,
      total_amount: '2000.00',
      totals_by_payment_method: {
        CASH: '1200.00',
        DIGITAL_WALLET: '500.00',
        BANK_TRANSFER: '300.00',
        OTHER: '0.00',
      },
      transactions: [
        {
          id: 10,
          booking: 55,
          court: 3,
          court_name: 'Court A',
          amount: '300.00',
          payment_method: 'CASH',
          payment_reference: '',
          created: '2026-07-19T10:00:00Z',
        },
      ],
    })
    mockedConfirmUserSettlement.mockResolvedValue({ id: 99 })
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
    expect(mockedListClubUsers).not.toHaveBeenCalled()
    expect(mockedReviewUserSettlement).not.toHaveBeenCalled()
  })

  it('blocks managers without the settlement permission flag', async () => {
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
    expect(mockedListClubUsers).not.toHaveBeenCalled()
  })

  it('renders user cards and sends role/search/active filters', async () => {
    const user = userEvent.setup()

    renderPage()

    expect(await screen.findByText('Ahmed Staff')).toBeInTheDocument()

    await user.type(screen.getByLabelText('بحث عن مستخدم'), 'ahmed')
    await user.selectOptions(screen.getByLabelText('الدور'), 'STAFF')
    await user.selectOptions(screen.getByLabelText('حالة العضوية'), 'true')
    await user.click(screen.getByRole('button', { name: 'تحديث المستخدمين' }))

    await waitFor(() => {
      expect(mockedListClubUsers).toHaveBeenLastCalledWith('nasr-club', {
        search: 'ahmed',
        role: 'STAFF',
        is_active: 'true',
      })
    })
  })

  it('requires explicit review before rendering backend review totals', async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(await screen.findByRole('button', {
      name: 'اختيار للتسوية',
    }))

    expect(mockedReviewUserSettlement).not.toHaveBeenCalled()
    expect(
      await screen.findByRole('button', { name: 'مراجعة التسوية' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'مراجعة التسوية' }))

    expect(mockedReviewUserSettlement).toHaveBeenCalledWith('nasr-club', {
      collected_by: 5,
      dry_run: true,
    })
    expect(await screen.findByText('2000.00')).toBeInTheDocument()
    expect(screen.getByText('عدد المعاملات: 1')).toBeInTheDocument()
    expect(screen.getByText('1200.00')).toBeInTheDocument()
    expect(screen.getAllByText('300.00')).toHaveLength(2)
  })

  it('does not show confirm action when selected user has no unsettled transactions', async () => {
    const user = userEvent.setup()
    mockedReviewUserSettlement.mockResolvedValueOnce({
      club: 1,
      collected_by: 5,
      collected_by_name: 'Ahmed Staff',
      transaction_count: 0,
      total_amount: '0.00',
      totals_by_payment_method: {},
      transactions: [],
    })

    renderPage()

    await user.click(await screen.findByRole('button', {
      name: 'اختيار للتسوية',
    }))
    await user.click(screen.getByRole('button', { name: 'مراجعة التسوية' }))

    expect(
      await screen.findAllByText('لا توجد معاملات غير مسواة لهذا المستخدم.'),
    ).toHaveLength(2)
    expect(
      screen.queryByRole('button', { name: 'تأكيد التسوية' }),
    ).not.toBeInTheDocument()
  })

  it('shows backend no-unsettled settlement error message', async () => {
    const user = userEvent.setup()

    mockedReviewUserSettlement.mockRejectedValueOnce(
      new ApiClientError('لا توجد معاملات غير مسواة لهذا المستخدم.', 400, {
        code: 'NO_UNSETTLED_TRANSACTIONS',
      }),
    )

    renderPage()

    await user.click(await screen.findByRole('button', {
      name: 'اختيار للتسوية',
    }))
    await user.click(screen.getByRole('button', { name: 'مراجعة التسوية' }))

    expect(
      await screen.findByText('لا توجد معاملات غير مسواة لهذا المستخدم.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'تأكيد التسوية' }),
    ).not.toBeInTheDocument()
  })

  it('confirms a reviewed settlement with selected user, dry_run false, and notes only', async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(await screen.findByRole('button', {
      name: 'اختيار للتسوية',
    }))
    await user.click(screen.getByRole('button', { name: 'مراجعة التسوية' }))
    await screen.findByText('2000.00')
    await user.click(screen.getByRole('button', { name: 'تأكيد التسوية' }))
    await user.type(screen.getByLabelText('ملاحظات'), 'Shift settlement')
    await user.click(screen.getByRole('button', { name: 'تأكيد التسوية' }))

    await waitFor(() => {
      expect(mockedConfirmUserSettlement).toHaveBeenCalledWith('nasr-club', {
        collected_by: 5,
        dry_run: false,
        notes: 'Shift settlement',
      })
    })
  })
})
