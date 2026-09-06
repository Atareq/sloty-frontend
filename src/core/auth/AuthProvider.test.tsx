import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  safelyClearScope,
  safelyClearUserOperationalData,
  safelyPersistOfflineContext,
  safelyReadOfflineContext,
} from '../../offline/security/offlineStorageSafety'
import { ApiClientError } from '../api/apiClient'
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
  safelyClearScope: vi.fn(),
  safelyClearUserOperationalData: vi.fn(),
  safelyPersistOfflineContext: vi.fn(),
  safelyReadOfflineContext: vi.fn(),
  safelyReadLatestOfflineContextForClub: vi.fn(),
}))

const mockedFetchCurrentUserProfile = vi.mocked(fetchCurrentUserProfile)
const mockedClearScope = vi.mocked(safelyClearScope)
const mockedClearUserOperationalData = vi.mocked(
  safelyClearUserOperationalData,
)
const mockedPersistOfflineContext = vi.mocked(safelyPersistOfflineContext)
const mockedReadOfflineContext = vi.mocked(safelyReadOfflineContext)

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
    mockedClearScope.mockResolvedValue(true)
    mockedClearUserOperationalData.mockResolvedValue(true)
    mockedPersistOfflineContext.mockResolvedValue(true)
    mockedReadOfflineContext.mockResolvedValue(null)
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

  it('hydrates the last verified scope when profile refresh cannot reach the backend', async () => {
    const user = userEvent.setup()
    saveSelectedClubSlug('demo-football-club')
    mockedFetchCurrentUserProfile.mockRejectedValueOnce(
      new ApiClientError('تعذر الاتصال بالخادم', 0, {
        code: 'NETWORK_ERROR',
      }),
    )
    mockedReadOfflineContext.mockResolvedValueOnce({
      scope_key: 'user:1:club:demo-football-club',
      user_id: 1,
      club_slug: 'demo-football-club',
      display_name: 'أحمد علي',
      is_platform_admin: false,
      selected_club_slug: 'demo-football-club',
      membership_id: 10,
      role: 'STAFF',
      assigned_court_id: 3,
      assigned_court_name: 'Court 1',
      last_verified_at: '2026-09-04T10:00:00.000Z',
      schema_version: 2,
    })

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    expect(await screen.findByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getAllByText('demo-football-club')).toHaveLength(2)
    expect(screen.getByText('STAFF')).toBeInTheDocument()
    expect(mockedReadOfflineContext).toHaveBeenCalledWith({
      userId: 1,
      clubSlug: 'demo-football-club',
    })
    expect(mockedPersistOfflineContext).not.toHaveBeenCalled()
  })

  it('requires login without deleting local storage for session-only auth failures', async () => {
    const user = userEvent.setup()
    saveSelectedClubSlug('demo-football-club')
    mockedFetchCurrentUserProfile.mockRejectedValueOnce(
      new ApiClientError('انتهت الجلسة', 401, {
        code: 'SESSION_EXPIRED',
      }),
    )

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    await waitFor(() => expect(getAccessToken()).toBeNull())
    expect(getSelectedClubSlug()).toBe('demo-football-club')
    expect(mockedClearUserOperationalData).not.toHaveBeenCalled()
    expect(mockedClearScope).not.toHaveBeenCalled()
    expect(screen.getByText('لا يوجد مستخدم')).toBeInTheDocument()
  })

  it('clears every owned local scope when the backend confirms the user is deleted', async () => {
    const user = userEvent.setup()
    saveSelectedClubSlug('demo-football-club')
    mockedFetchCurrentUserProfile.mockRejectedValueOnce(
      new ApiClientError('تم حذف الحساب', 403, {
        code: 'USER_DELETED',
      }),
    )

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    await waitFor(() =>
      expect(mockedClearUserOperationalData).toHaveBeenCalledWith(1),
    )
    expect(getAccessToken()).toBeNull()
    expect(getSelectedClubSlug()).toBeNull()
    expect(mockedClearScope).not.toHaveBeenCalled()
  })

  it('clears only the revoked Club scope when the backend provides club_slug', async () => {
    const user = userEvent.setup()
    saveSelectedClubSlug('demo-football-club')
    mockedFetchCurrentUserProfile.mockRejectedValueOnce(
      new ApiClientError('تم إلغاء صلاحية النادي', 403, {
        code: 'CLUB_ACCESS_REVOKED',
        details: { club_slug: 'demo-football-club' },
      }),
    )

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    await waitFor(() =>
      expect(mockedClearScope).toHaveBeenCalledWith({
        userId: 1,
        clubSlug: 'demo-football-club',
      }),
    )
    expect(mockedClearUserOperationalData).not.toHaveBeenCalled()
    expect(getAccessToken()).toBeNull()
    expect(getSelectedClubSlug()).toBeNull()
  })
})
