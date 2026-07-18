import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../core/auth/useAuth'
import { AppShell } from './AppShell'

vi.mock('../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const clearSelectedClub = vi.fn()

function getAuthValue(
  membershipCount = 2,
  options: { canManageSettlements?: boolean } = {},
) {
  const selectedMembership = {
    id: 10,
    role: 'MANAGER' as const,
    club: {
      id: 1,
      name: 'Demo Football Club',
      slug: 'demo-football-club',
      city: 'ASSIUT',
      is_active: true,
    },
    court: null,
    can_manage_settlements: options.canManageSettlements ?? false,
  }

  return {
    accessToken: 'token',
    claims: { user_id: 1, role: 'MANAGER' as const, name: 'Manager User' },
    currentUser: {
      id: 1,
      username: 'manager-user',
      email: 'manager@example.com',
      first_name: 'Manager',
      last_name: 'User',
      phone_number: null,
      is_active: true,
      is_platform_admin: false,
      requires_club_selection: membershipCount > 1,
      memberships: Array.from({ length: membershipCount }, (_, index) => ({
        ...selectedMembership,
        id: selectedMembership.id + index,
        club: {
          ...selectedMembership.club,
          id: selectedMembership.club.id + index,
          slug:
            index === 0
              ? selectedMembership.club.slug
              : `second-club-${index}`,
        },
      })),
    },
    selectedClubSlug: selectedMembership.club.slug,
    selectedMembership,
    role: 'MANAGER' as const,
    isAuthenticated: true,
    isLoadingSession: false,
    isTokenExpired: false,
    sessionError: null,
    login: vi.fn(),
    logout: vi.fn(),
    selectClub: vi.fn(),
    clearSelectedClub,
    refreshCurrentUser: vi.fn(),
    setTokens: vi.fn(),
  }
}

function renderAppShell(
  initialEntry:
    | string
    | { pathname: string; state?: Record<string, unknown> } = '/dashboard',
) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route element={<p>لوحة التحكم</p>} path="/dashboard" />
        </Route>
        <Route element={<p>اختيار النادي</p>} path="/select-club" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseAuth.mockReturnValue(getAuthValue())
  })

  it('shows the selected club name', () => {
    renderAppShell()

    expect(screen.getAllByText('النادي الحالي: Demo Football Club').length)
      .toBeGreaterThan(0)
  })

  it('shows change-club action only for multi-club users', () => {
    renderAppShell()

    expect(screen.getAllByRole('button', { name: 'تغيير النادي' }).length)
      .toBeGreaterThan(0)

    cleanup()
    mockedUseAuth.mockReturnValue(getAuthValue(1))

    renderAppShell()

    expect(screen.queryByRole('button', { name: 'تغيير النادي' }))
      .not.toBeInTheDocument()
  })

  it('clears selected club and navigates to club selection', async () => {
    const user = userEvent.setup()

    renderAppShell()

    await user.click(screen.getAllByRole('button', { name: 'تغيير النادي' })[0])

    expect(clearSelectedClub).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('اختيار النادي')).toBeInTheDocument()
  })

  it('shows settlement navigation only when the selected membership allows it', () => {
    renderAppShell()

    expect(screen.queryByText('التسويات')).not.toBeInTheDocument()

    cleanup()
    mockedUseAuth.mockReturnValue(
      getAuthValue(2, { canManageSettlements: true }),
    )

    renderAppShell()

    expect(screen.getAllByText('التسويات').length).toBeGreaterThan(0)
  })

  it('shows and dismisses a route-state flash message', async () => {
    const user = userEvent.setup()

    renderAppShell({
      pathname: '/dashboard',
      state: { flashMessage: 'تم تحديث مواعيد العمل بنجاح' },
    })

    expect(await screen.findByText('تم تحديث مواعيد العمل بنجاح'))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'إغلاق' }))

    expect(screen.queryByText('تم تحديث مواعيد العمل بنجاح'))
      .not.toBeInTheDocument()
  })
})
