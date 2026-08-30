import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  safelyClearUserOperationalData,
  safelyPersistOfflineContext,
} from '../../offline/security/offlineStorageSafety'
import { AuthProvider } from './AuthProvider'
import { fetchCurrentUserProfile } from './authApi'
import { clearAuthTokens, getAccessToken } from './authStorage'
import { canManageSettlements } from './auth.types'
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

vi.mock('../../offline/security/offlineStorageSafety', () => ({
  safelyClearUserOperationalData: vi.fn(),
  safelyPersistOfflineContext: vi.fn(),
}))

const mockedFetchCurrentUserProfile = vi.mocked(fetchCurrentUserProfile)
const mockedClearUserOperationalData = vi.mocked(
  safelyClearUserOperationalData,
)
const mockedPersistOfflineContext = vi.mocked(safelyPersistOfflineContext)

function AuthProviderHarness() {
  const {
    currentUser,
    login,
    logout,
    role,
    selectClub,
    selectedClubSlug,
    selectedMembership,
  } = useAuth()

  return (
    <div>
      <p>{currentUser?.username ?? 'لا يوجد مستخدم'}</p>
      <p>{selectedClubSlug ?? 'لا يوجد نادي محدد'}</p>
      <p>{selectedMembership?.club.name ?? 'لا توجد عضوية محددة'}</p>
      <p>{role ?? 'لا يوجد دور محدد'}</p>
      <p>
        {canManageSettlements(selectedMembership, role)
          ? 'يمكن إدارة التسويات'
          : 'لا يمكن إدارة التسويات'}
      </p>
      <button
        onClick={() => login(createDevAccessToken('STAFF'), 'refresh-token')}
        type="button"
      >
        تسجيل دخول تجريبي
      </button>
      <button onClick={logout} type="button">
        خروج
      </button>
      <button onClick={() => selectClub('demo-football-club')} type="button">
        اختيار النادي الأول
      </button>
      <button onClick={() => selectClub('second-club')} type="button">
        اختيار النادي الثاني
      </button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    clearAuthTokens()
    clearSelectedClubSlug()
    vi.clearAllMocks()
    mockedClearUserOperationalData.mockResolvedValue(true)
    mockedPersistOfflineContext.mockResolvedValue(true)
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
    account_created_by: null,
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
        permissions: {
          can_change_pricing: false,
          can_manage_working_hours: false,
          can_manage_settlements: true,
        },
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
    expect(mockedClearUserOperationalData).toHaveBeenCalledWith(1)
    expect(getSelectedClubSlug()).toBeNull()
    expect(screen.getByText('لا يوجد مستخدم')).toBeInTheDocument()
  })

  it('persists only the selected Backend-verified membership context', async () => {
    const user = userEvent.setup()
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(oneMembershipProfile)

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    await waitFor(() => {
      expect(mockedPersistOfflineContext).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: { userId: 1, clubSlug: 'demo-football-club' },
          displayName: 'أحمد علي',
          isPlatformAdmin: false,
          membership: oneMembershipProfile.memberships[0],
        }),
      )
    })
  })

  it('waits for a pending context write and cleanup before releasing auth state', async () => {
    const user = userEvent.setup()
    let finishContextWrite: (() => void) | undefined
    mockedPersistOfflineContext.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finishContextWrite = () => resolve(true)
        }),
    )
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(oneMembershipProfile)

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))
    expect(await screen.findByText('staff-user')).toBeInTheDocument()
    await waitFor(() => expect(finishContextWrite).toBeTypeOf('function'))

    await user.click(screen.getByRole('button', { name: 'خروج' }))

    expect(getAccessToken()).not.toBeNull()
    expect(mockedClearUserOperationalData).not.toHaveBeenCalled()
    finishContextWrite?.()

    await waitFor(() => expect(mockedClearUserOperationalData).toHaveBeenCalledWith(1))
    await waitFor(() => expect(getAccessToken()).toBeNull())
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

  it('recalculates active membership, role, and permissions when selected club changes', async () => {
    const user = userEvent.setup()
    saveSelectedClubSlug('demo-football-club')
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(manyMembershipsProfile)

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    expect(await screen.findByText('Demo Football Club')).toBeInTheDocument()
    expect(screen.getByText('STAFF')).toBeInTheDocument()
    expect(screen.getByText('لا يمكن إدارة التسويات')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockedPersistOfflineContext).toHaveBeenLastCalledWith(
        expect.objectContaining({
          scope: { userId: 1, clubSlug: 'demo-football-club' },
        }),
      )
    })

    await user.click(screen.getByRole('button', { name: 'اختيار النادي الثاني' }))

    expect(screen.getByText('Second Club')).toBeInTheDocument()
    expect(screen.getByText('MANAGER')).toBeInTheDocument()
    expect(screen.getByText('يمكن إدارة التسويات')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockedPersistOfflineContext).toHaveBeenLastCalledWith(
        expect.objectContaining({
          scope: { userId: 1, clubSlug: 'second-club' },
        }),
      )
    })

    await user.click(screen.getByRole('button', { name: 'اختيار النادي الأول' }))

    expect(screen.getByText('Demo Football Club')).toBeInTheDocument()
    expect(screen.getByText('STAFF')).toBeInTheDocument()
    expect(screen.getByText('لا يمكن إدارة التسويات')).toBeInTheDocument()
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
