import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { fetchCurrentUserProfile } from './authApi'
import { clearAuthTokens, getAccessToken } from './authStorage'
import { createDevAccessToken } from './devAuth'
import {
  clearSelectedClubSlug,
  getSelectedClubSlug,
  saveSelectedClubSlug,
} from './selectedClubStorage'
import { useAuth } from './useAuth'

vi.mock('./authApi', () => ({
  fetchCurrentUserProfile: vi.fn(),
}))

const mockedFetchCurrentUserProfile = vi.mocked(fetchCurrentUserProfile)

function AuthProviderHarness() {
  const {
    currentUser,
    login,
    logout,
    selectedClubSlug,
    selectedMembership,
  } = useAuth()

  return (
    <div>
      <p>{currentUser?.username ?? 'لا يوجد مستخدم'}</p>
      <p>{selectedClubSlug ?? 'لا يوجد نادي محدد'}</p>
      <p>{selectedMembership?.club.name ?? 'لا توجد عضوية محددة'}</p>
      <button
        onClick={() => login(createDevAccessToken('STAFF'), 'refresh-token')}
        type="button"
      >
        تسجيل دخول تجريبي
      </button>
      <button onClick={logout} type="button">
        خروج
      </button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    clearAuthTokens()
    clearSelectedClubSlug()
    vi.clearAllMocks()
  })

  const oneMembershipProfile = {
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
        role: 'STAFF' as const,
        club: {
          id: 1,
          slug: 'demo-football-club',
          name: 'Demo Football Club',
          is_active: true,
        },
        court: { id: 3, name: 'Court 1' },
      },
    ],
  }

  const manyMembershipsProfile = {
    ...oneMembershipProfile,
    requires_club_selection: true,
    memberships: [
      oneMembershipProfile.memberships[0],
      {
        id: 11,
        role: 'MANAGER' as const,
        club: {
          id: 2,
          slug: 'second-club',
          name: 'Second Club',
          is_active: true,
        },
        court: null,
      },
    ],
  }

  it('clears the current user profile on logout', async () => {
    const user = userEvent.setup()

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(oneMembershipProfile)

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    expect(await screen.findByText('staff-user')).toBeInTheDocument()
    expect(getAccessToken()).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'خروج' }))

    await waitFor(() => expect(getAccessToken()).toBeNull())
    expect(getSelectedClubSlug()).toBeNull()
    expect(screen.getByText('لا يوجد مستخدم')).toBeInTheDocument()
  })

  it('auto-selects the only membership club after profile hydration', async () => {
    const user = userEvent.setup()

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(oneMembershipProfile)

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    expect(await screen.findByText('demo-football-club')).toBeInTheDocument()
    expect(screen.getByText('Demo Football Club')).toBeInTheDocument()
    expect(getSelectedClubSlug()).toBe('demo-football-club')
  })

  it('keeps multi-club users unselected unless the stored slug is still valid', async () => {
    const user = userEvent.setup()

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(manyMembershipsProfile)

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    expect(await screen.findByText('staff-user')).toBeInTheDocument()
    expect(screen.getByText('لا يوجد نادي محدد')).toBeInTheDocument()
    expect(getSelectedClubSlug()).toBeNull()
  })

  it('clears a stale selected club slug when memberships no longer include it', async () => {
    const user = userEvent.setup()
    saveSelectedClubSlug('old-club')
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(manyMembershipsProfile)

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    await waitFor(() => expect(getSelectedClubSlug()).toBeNull())
    expect(screen.getByText('لا يوجد نادي محدد')).toBeInTheDocument()
  })
})
