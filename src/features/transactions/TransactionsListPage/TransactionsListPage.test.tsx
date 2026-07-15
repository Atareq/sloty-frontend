import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { listTransactions } from '../transactionsApi'
import { TransactionsListPage } from './TransactionsListPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../transactionsApi', () => ({
  listTransactions: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListTransactions = vi.mocked(listTransactions)

function paginatedResponse<T>(results: T[]) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

describe('TransactionsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseAuth.mockReturnValue({
      accessToken: 'token',
      claims: { user_id: 1 },
      currentUser: {
        id: 1,
        username: 'staff-user',
        email: 'staff@example.com',
        first_name: 'أحمد',
        last_name: 'علي',
        phone_number: null,
        is_active: true,
        is_platform_admin: false,
        requires_club_selection: false,
        memberships: [
          {
            id: 10,
            role: 'MANAGER',
            club: {
              id: 1,
              name: 'نادي النصر',
              slug: 'nasr-club',
              city: 'ASSIUT',
              is_active: true,
            },
            court: null,
          },
        ],
      },
      selectedClubSlug: 'nasr-club',
      selectedMembership: {
        id: 10,
        role: 'MANAGER',
        club: {
          id: 1,
          name: 'نادي النصر',
          slug: 'nasr-club',
          city: 'ASSIUT',
          is_active: true,
        },
        court: null,
      },
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
  })

  it('loads transactions for the selected club slug', async () => {
    mockedListTransactions.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 5,
          booking: 10,
          amount: '150.00',
          payment_method: 'DIGITAL_WALLET' as const,
          reference: 'REF-123',
          created: '2026-07-02T10:00:00Z',
        },
      ]),
    )

    render(<TransactionsListPage />)

    expect(await screen.findByText('150.00')).toBeInTheDocument()
    expect(screen.getByText('محفظة رقمية')).toBeInTheDocument()
    expect(screen.getByText('#10')).toBeInTheDocument()
    expect(screen.getByText('REF-123')).toBeInTheDocument()
    expect(mockedListTransactions).toHaveBeenCalledWith('nasr-club')
    expect(
      screen.getByText('سجل المدفوعات المسجلة داخل نادي النصر'),
    ).toBeInTheDocument()
  })

  it('shows an empty state when the selected club has no transactions', async () => {
    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    render(<TransactionsListPage />)

    expect(
      await screen.findByText('لا توجد معاملات مسجلة حتى الآن'),
    ).toBeInTheDocument()
  })

  it('does not load transactions without a selected club slug', async () => {
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      selectedClubSlug: null,
      selectedMembership: null,
    })

    render(<TransactionsListPage />)

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض المعاملات'),
    ).toBeInTheDocument()
    expect(mockedListTransactions).not.toHaveBeenCalled()
  })
})
