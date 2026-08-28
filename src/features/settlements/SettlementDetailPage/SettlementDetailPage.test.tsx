import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import {
  getSettlement,
  markSettlementSettled,
} from '../settlementsApi'
import { SettlementDetailPage } from './SettlementDetailPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../settlementsApi', () => ({
  getSettlement: vi.fn(),
  markSettlementSettled: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetSettlement = vi.mocked(getSettlement)
const mockedMarkSettlementSettled = vi.mocked(markSettlementSettled)
const refreshCurrentUser = vi.fn()

function mockAuth() {
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
      is_platform_admin: false,
      account_created_by: null,
      requires_club_selection: false,
      memberships: [],
    },
    selectedClubSlug: 'nasr-club',
    selectedMembership: {
      id: 10,
      role: 'OWNER',
      club: {
        id: 1,
        name: 'نادي النصر',
        slug: 'nasr-club',
        city: 'ASSIUT',
        is_active: true,
      },
      court: null,
    },
    role: 'OWNER',
    isAuthenticated: true,
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
      status: 'PENDING',
      notes: 'Shift settlement',
      created_by: { id: 1, name: 'Owner User' },
      created: '2026-07-19T15:20:00Z',
      settled_by: null,
      settled_at: null,
      lines: [
        {
          id: 1,
          transaction: 101,
          amount: '500.00',
          payment_method: 'CASH',
        },
      ],
    })
    mockedMarkSettlementSettled.mockResolvedValue({
      id: 9,
      collected_by: 5,
      collected_by_name: 'Ahmed Staff',
      total_amount: '2000.00',
      transaction_count: 8,
      status: 'SETTLED',
    })
  })

  it('renders collected-by settlement detail with display-only backend period', async () => {
    renderPage()

    expect(await screen.findByText('الموظف')).toBeInTheDocument()
    expect(screen.getAllByText('Ahmed Staff')).not.toHaveLength(0)
    expect(screen.getByText('2,000.00 جنيه')).toBeInTheDocument()
    expect(screen.getByText('Shift settlement')).toBeInTheDocument()
    expect(screen.queryByText('#101')).not.toBeInTheDocument()
    expect(mockedGetSettlement).toHaveBeenCalledWith('nasr-club', '9')
  })

  it('marks pending settlement as settled and reloads displayed state from response', async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(await screen.findByRole('button', {
      name: 'تأكيد استلام المبلغ',
    }))
    await user.click(screen.getAllByRole('button', {
      name: 'تأكيد استلام المبلغ',
    })[1])

    await waitFor(() => {
      expect(mockedMarkSettlementSettled).toHaveBeenCalledWith('nasr-club', '9')
    })
    expect(await screen.findByText('تم استلام المبلغ بنجاح')).toBeInTheDocument()
    expect(screen.getByText('تم الاستلام')).toBeInTheDocument()
  })

  it('shows 403 mark-settled error, refreshes current user, and does not retry', async () => {
    const user = userEvent.setup()

    mockedMarkSettlementSettled.mockRejectedValueOnce(
      new ApiClientError('ليس لديك صلاحية لهذا الإجراء.', 403),
    )

    renderPage()

    await user.click(await screen.findByRole('button', {
      name: 'تأكيد استلام المبلغ',
    }))
    await user.click(screen.getAllByRole('button', {
      name: 'تأكيد استلام المبلغ',
    })[1])

    expect(
      await screen.findByText('ليس لديك صلاحية لهذا الإجراء.'),
    ).toBeInTheDocument()
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1)
    expect(mockedMarkSettlementSettled).toHaveBeenCalledTimes(1)
  })

  it('does not let the collector mark their own settlement as settled', async () => {
    mockedGetSettlement.mockResolvedValueOnce({
      id: 9,
      collected_by: 1,
      collected_by_name: 'Owner User',
      total_amount: '2000.00',
      transaction_count: 8,
      status: 'PENDING',
    })

    renderPage()

    expect((await screen.findAllByText('Owner User')).length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('button', { name: 'تأكيد استلام المبلغ' }),
    ).not.toBeInTheDocument()
    expect(mockedMarkSettlementSettled).not.toHaveBeenCalled()
  })
})
