import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { listAuditLogs } from '../auditApi'
import { AuditLogsPage } from './AuditLogsPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../auditApi', () => ({
  listAuditLogs: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListAuditLogs = vi.mocked(listAuditLogs)

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

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
    mockedListAuditLogs.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          action: 'TRANSACTION_CANCELLED',
          actor: { id: 7, name: 'Owner Mahmoud' },
          target_type: 'Transaction',
          target_id: 101,
          message: 'تم إلغاء الدفع',
          metadata: {
            reason: 'Wrong amount entered',
          },
        },
      ],
    })
  })

  it('shows no selected club message', async () => {
    mockAuth('OWNER', null)

    render(<AuditLogsPage />)

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض سجل النشاط'),
    ).toBeInTheDocument()
    expect(mockedListAuditLogs).not.toHaveBeenCalled()
  })

  it('blocks staff users', async () => {
    mockAuth('STAFF')

    render(<AuditLogsPage />)

    expect(
      await screen.findByText('ليس لديك صلاحية عرض سجل النشاط'),
    ).toBeInTheDocument()
    expect(mockedListAuditLogs).not.toHaveBeenCalled()
  })

  it('renders audit log cards with clean metadata', async () => {
    render(<AuditLogsPage />)

    expect(await screen.findByText('تم إلغاء الدفع')).toBeInTheDocument()
    expect(screen.getByText('Owner Mahmoud')).toBeInTheDocument()
    expect(screen.getByText('reason')).toBeInTheDocument()
    expect(screen.getByText('Wrong amount entered')).toBeInTheDocument()
    expect(mockedListAuditLogs).toHaveBeenCalledWith('nasr-club', {})
  })
})
