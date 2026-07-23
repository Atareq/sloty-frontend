import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { SettingsHubPage } from './SettingsHubPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

function mockAuth(role: 'OWNER' | 'MANAGER' = 'OWNER') {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1, role },
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

describe('SettingsHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
  })

  it('links owners to court settings and users permissions', () => {
    render(
      <MemoryRouter>
        <SettingsHubPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('إدارة الملاعب')).toBeInTheDocument()
    expect(screen.getByText('المستخدمون والصلاحيات')).toBeInTheDocument()
    expect(screen.getByText('سجل النشاطات')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'إعدادات الملاعب' }))
      .toHaveAttribute('href', '/settings/courts')
    expect(
      screen.getByRole('link', { name: 'فتح المستخدمين والصلاحيات' }),
    ).toHaveAttribute('href', '/settings/users')
    expect(screen.getByRole('link', { name: 'عرض سجل النشاطات' }))
      .toHaveAttribute('href', '/audit-logs')
  })

  it('does not show owner-only permission link for non-owner rendering', () => {
    mockAuth('MANAGER')

    render(
      <MemoryRouter>
        <SettingsHubPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'إعدادات الملاعب' }))
      .toHaveAttribute('href', '/settings/courts')
    expect(
      screen.queryByRole('link', { name: 'فتح المستخدمين والصلاحيات' }),
    ).not.toBeInTheDocument()
  })
})
