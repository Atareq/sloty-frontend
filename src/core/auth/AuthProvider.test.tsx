import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  safelyClearScope,
  safelyClearUserOperationalData,
  safelyPersistOfflineContext,
  safelyReadOfflineContext,
} from '../../offline/security/offlineStorageSafety'
import { getClub, listClubs } from '../../features/clubs/clubsApi'
import { getCourt, listCourts } from '../../features/courts/courtsApi'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { ApiClientError } from '../api/apiClient'
import { AuthProvider } from './AuthProvider'
import { fetchCurrentUserProfile } from './authApi'
import {
  clearAuthTokens,
  getAccessToken,
  setAccessToken,
  setRefreshToken,
} from './authStorage'
import { canManageSettlements, type CurrentUserProfile } from './auth.types'
import { createDevAccessToken } from './devAuth'
import {
  clearSelectedClubSlug,
  getSelectedClubSlug,
  saveSelectedClubSlug,
} from './selectedClubStorage'
import {
  clearSelectedCourtId,
} from './selectedCourtStorage'
import { useAuth } from './useAuth'

function createExpiredAccessToken(): string {
  const claims = {
    user_id: 1,
    role: 'STAFF',
    name: 'مستخدم تجريبي',
    club_id: 1,
    court_id: 1,
    exp: Math.floor(Date.now() / 1000) - 3600,
  }
  const bytes = new TextEncoder().encode(JSON.stringify(claims))
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  const payload = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.${payload}.dev`
}

vi.mock('./authApi', () => ({
  fetchCurrentUserProfile: vi.fn(),
}))

vi.mock('../../features/clubs/clubsApi', () => ({
  listClubs: vi.fn(),
  getClub: vi.fn(),
  createClub: vi.fn(),
  updateClub: vi.fn(),
}))

vi.mock('../../features/courts/courtsApi', () => ({
  listCourts: vi.fn(),
  getCourt: vi.fn(),
  createCourt: vi.fn(),
  updateCourt: vi.fn(),
}))

vi.mock('../../offline/security/offlineStorageSafety', () => ({
  safelyClearScope: vi.fn(),
  safelyClearUserOperationalData: vi.fn(),
  safelyPersistOfflineContext: vi.fn(),
  safelyReadOfflineContext: vi.fn(),
  safelyReadLatestOfflineContextForClub: vi.fn(),
}))

const mockedFetchCurrentUserProfile = vi.mocked(fetchCurrentUserProfile)
const mockedListClubs = vi.mocked(listClubs)
const mockedGetClub = vi.mocked(getClub)
const mockedListCourts = vi.mocked(listCourts)
const mockedGetCourt = vi.mocked(getCourt)
const mockedClearScope = vi.mocked(safelyClearScope)
const mockedClearUserOperationalData = vi.mocked(
  safelyClearUserOperationalData,
)
const mockedPersistOfflineContext = vi.mocked(safelyPersistOfflineContext)
const mockedReadOfflineContext = vi.mocked(safelyReadOfflineContext)

function AuthProviderHarness() {
  const {
    currentUser,
    currentProfileId,
    login,
    logout,
    role,
    selectClub,
    selectedClubSlug,
    accessibleClubs,
    isOperational,
  } = useAuth()

  const activeClub = accessibleClubs.find((c) => c.slug === selectedClubSlug)

  return (
    <div>
      <p>{currentUser?.username ?? 'لا يوجد مستخدم'}</p>
      <p data-testid="user-id">{currentUser?.id ?? 'none'}</p>
      <p data-testid="profile-id">{currentProfileId ?? 'none'}</p>
      <p>{selectedClubSlug ?? 'لا يوجد نادي محدد'}</p>
      <p>{activeClub?.name ?? 'لا يوجد نادي محدد'}</p>
      <p>{role ?? 'لا يوجد دور محدد'}</p>
      <p data-testid="is-operational">{isOperational ? 'operational' : 'non-operational'}</p>
      <p>
        {canManageSettlements(role)
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
  function paginated<T>(results: T[]): PaginatedResponse<T> {
    return {
      count: results.length,
      next: null,
      previous: null,
      results,
    }
  }

  const mockClub1 = {
    id: 1,
    slug: 'demo-football-club',
    name: 'Demo Football Club',
    city: 'ASSIUT',
    is_active: true,
  }

  const mockClub2 = {
    id: 2,
    slug: 'second-club',
    name: 'Second Club',
    city: 'ASSIUT',
    is_active: true,
  }

  const mockCourtsClub1 = [
    {
      id: 3,
      name: 'Court 1',
      club: 1,
      sport_type: 'FOOTBALL' as const,
      minimum_deposit: '100.00',
      cancellation_refund_notice_days: 3,
      slot_duration_minutes: 60,
      is_active: true,
      requires_digital_payment_reference: false,
      internal_hold_expiry_hours: 2,
    },
  ]

  const staffProfile: CurrentUserProfile = {
    id: 1,
    username: 'staff-user',
    email: 'staff@example.com',
    first_name: 'أحمد',
    last_name: 'علي',
    phone_number: null,
    is_active: true,
    profile_role: 'STAFF',
    account_created_by: null,
  }

  const ownerProfile: CurrentUserProfile = {
    id: 1,
    username: 'owner-user',
    email: 'owner@example.com',
    first_name: 'سارة',
    last_name: 'محمد',
    phone_number: null,
    is_active: true,
    profile_role: 'OWNER',
    account_created_by: null,
  }

  beforeEach(() => {
    vi.unstubAllGlobals()
    clearAuthTokens()
    clearSelectedClubSlug()
    clearSelectedCourtId()
    vi.clearAllMocks()
    mockedClearScope.mockResolvedValue(true)
    mockedClearUserOperationalData.mockResolvedValue(true)
    mockedPersistOfflineContext.mockResolvedValue(true)
    mockedReadOfflineContext.mockResolvedValue(null)
    // Default: getClub(slug) returns mockClub1 — the direct-retrieve path.
    mockedGetClub.mockResolvedValue(mockClub1)
    // Default: listClubs returns page-1 with mockClub1 (fallback path).
    mockedListClubs.mockResolvedValue(paginated([mockClub1]))
    // Default: getCourt returns the first test court (direct-retrieve path).
    mockedGetCourt.mockResolvedValue(mockCourtsClub1[0])
    // Default: listCourts returns page-1 with mockCourtsClub1 (fallback path).
    mockedListCourts.mockResolvedValue(paginated(mockCourtsClub1))
  })


  it('clears the current user profile on logout', async () => {
    const user = userEvent.setup()

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(staffProfile)

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

  it('persists only the selected Backend-verified club context', async () => {
    const user = userEvent.setup()
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(staffProfile)

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
          role: 'STAFF',
          selectedClubSlug: 'demo-football-club',
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
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(staffProfile)

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

  it('auto-selects the only accessible club after profile hydration', async () => {
    const user = userEvent.setup()

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(staffProfile)
    mockedListClubs.mockResolvedValueOnce(paginated([mockClub1]))

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

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(ownerProfile)
    mockedListClubs.mockResolvedValueOnce(paginated([mockClub1, mockClub2]))

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    expect(await screen.findByText('owner-user')).toBeInTheDocument()
    expect(screen.getAllByText('لا يوجد نادي محدد')).toHaveLength(2)
    expect(getSelectedClubSlug()).toBeNull()
  })

  it('recalculates active club and context when selected club changes', async () => {
    const user = userEvent.setup()
    saveSelectedClubSlug('demo-football-club')
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(ownerProfile)
    mockedListClubs.mockResolvedValue(paginated([mockClub1, mockClub2]))

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    expect(await screen.findByText('Demo Football Club')).toBeInTheDocument()
    expect(screen.getByText('OWNER')).toBeInTheDocument()
    expect(screen.getByText('يمكن إدارة التسويات')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockedPersistOfflineContext).toHaveBeenLastCalledWith(
        expect.objectContaining({
          scope: { userId: 1, clubSlug: 'demo-football-club' },
        }),
      )
    })

    await user.click(screen.getByRole('button', { name: 'اختيار النادي الثاني' }))

    expect(screen.getByText('Second Club')).toBeInTheDocument()
    expect(screen.getByText('OWNER')).toBeInTheDocument()
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
    expect(screen.getByText('OWNER')).toBeInTheDocument()
    expect(screen.getByText('يمكن إدارة التسويات')).toBeInTheDocument()
  })

  it('clears a stale selected club slug when clubs no longer include it', async () => {
    const user = userEvent.setup()
    saveSelectedClubSlug('old-club')
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(ownerProfile)
    // getClub('old-club') → 404 (direct retrieve validates the persisted slug)
    mockedGetClub.mockRejectedValueOnce(
      new ApiClientError('النادي غير موجود', 404, { code: 'NOT_FOUND' }),
    )
    mockedListClubs.mockResolvedValueOnce(paginated([mockClub1, mockClub2]))

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    await waitFor(() => expect(getSelectedClubSlug()).toBeNull())
    expect(screen.getAllByText('لا يوجد نادي محدد')).toHaveLength(2)
  })

  it('preserves selected club when not on page 1 via direct retrieve', async () => {
    const user = userEvent.setup()
    saveSelectedClubSlug('club-35')
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(ownerProfile)
    // Direct retrieve GET /clubs/club-35/ succeeds with 200
    mockedGetClub.mockResolvedValueOnce({
      id: 35,
      slug: 'club-35',
      name: 'Club 35',
      governorate: 'ASSIUT',
      city: 'ASSIUT_CITY',
      address: 'Address 35',
      phone_number: '01012345678',
      is_active: true,
    })
    // Page 1 list only has mockClub1 and mockClub2 (club-35 is not on page 1)
    mockedListClubs.mockResolvedValueOnce(paginated([mockClub1, mockClub2]))

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    // Selection is preserved authoritatively via direct retrieve
    await waitFor(() => expect(mockedGetClub).toHaveBeenCalledWith('club-35'))
    expect(getSelectedClubSlug()).toBe('club-35')
  })

  it('clears selection when direct retrieve returns 403 CLUB_ACCESS_REVOKED', async () => {
    const user = userEvent.setup()
    saveSelectedClubSlug('revoked-club')
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(ownerProfile)
    mockedGetClub.mockRejectedValueOnce(
      new ApiClientError('تم إلغاء صلاحية الوصول', 403, {
        code: 'CLUB_ACCESS_REVOKED',
      }),
    )
    mockedListClubs.mockResolvedValueOnce(paginated([mockClub1, mockClub2]))

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    await waitFor(() => expect(getSelectedClubSlug()).toBeNull())
    expect(screen.getAllByText('لا يوجد نادي محدد')).toHaveLength(2)
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
      role: 'STAFF',
      selected_club_slug: 'demo-football-club',
      accessible_clubs: [mockClub1],
      accessible_courts: mockCourtsClub1,
      selected_court_id: 3,
      last_verified_at: '2026-09-04T10:00:00.000Z',
      schema_version: 5,
    })

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    expect(await screen.findByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('demo-football-club')).toBeInTheDocument()
    expect(screen.getByText('Demo Football Club')).toBeInTheDocument()
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
      new ApiClientError('تم حذف الحساب', 401, {
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
    expect(getAccessToken()).not.toBeNull()
    expect(getSelectedClubSlug()).toBeNull()
  })

  it('restores session on boot using refresh token when access token is expired', async () => {
    const expiredToken = createExpiredAccessToken()
    const nextAccess = createDevAccessToken('STAFF')
    setAccessToken(expiredToken)
    setRefreshToken('valid-refresh-token')

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(staffProfile)
    mockedListClubs.mockResolvedValue(paginated([mockClub1]))

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('auth/token/refresh/')) {
          return Promise.resolve(Response.json({ access: nextAccess }))
        }
        return Promise.resolve(Response.json({ ok: true }))
      }),
    )

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('staff-user')).toBeInTheDocument()
    })
    expect(getAccessToken()).toBe(nextAccess)
  })

  it('handles /me with profile_role null without clearing tokens or requesting clubs', async () => {
    const validAccess = createDevAccessToken('STAFF')
    setAccessToken(validAccess)
    setRefreshToken('valid-refresh-token')

    const nullRoleProfile: CurrentUserProfile = {
      id: 99,
      username: 'unassigned-user',
      email: 'unassigned@example.com',
      first_name: 'Unassigned',
      last_name: 'User',
      phone_number: null,
      is_active: true,
      profile_role: null,
      account_created_by: null,
    }
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(nullRoleProfile)
    mockedListClubs.mockResolvedValue(paginated([]))

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('unassigned-user')).toBeInTheDocument()
    })
    expect(screen.getByText('لا يوجد دور محدد')).toBeInTheDocument()
    expect(screen.getByTestId('is-operational')).toHaveTextContent('non-operational')
    expect(getAccessToken()).toBe(validAccess)
    expect(mockedListClubs).not.toHaveBeenCalled()
  })

  it('handles /me with profile_role PLAYER without clearing tokens or requesting clubs', async () => {
    const validAccess = createDevAccessToken('STAFF')
    setAccessToken(validAccess)
    setRefreshToken('valid-refresh-token')

    const playerProfile: CurrentUserProfile = {
      id: 101,
      username: 'player-user',
      email: 'player@example.com',
      first_name: 'Player',
      last_name: 'Customer',
      phone_number: '+201012345678',
      is_active: true,
      profile_role: 'PLAYER',
      account_created_by: null,
    }
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(playerProfile)

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('player-user')).toBeInTheDocument()
    })
    expect(screen.getByText('لا يوجد دور محدد')).toBeInTheDocument()
    expect(screen.getByTestId('is-operational')).toHaveTextContent('non-operational')
    expect(getAccessToken()).toBe(validAccess)
    expect(mockedListClubs).not.toHaveBeenCalled()
  })

  it('handles /me with unknown profile_role safely as nonOperational without crashing or STAFF fallback', async () => {
    const validAccess = createDevAccessToken('STAFF')
    setAccessToken(validAccess)
    setRefreshToken('valid-refresh-token')

    const unknownRoleProfile: CurrentUserProfile = {
      id: 102,
      username: 'future-role-user',
      email: 'future@example.com',
      first_name: 'Future',
      last_name: 'Role',
      phone_number: null,
      is_active: true,
      profile_role: 'SOMETHING_NEW' as unknown as CurrentUserProfile['profile_role'],
      account_created_by: null,
    }
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(unknownRoleProfile)

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('future-role-user')).toBeInTheDocument()
    })
    expect(screen.getByText('لا يوجد دور محدد')).toBeInTheDocument()
    expect(screen.getByTestId('is-operational')).toHaveTextContent('non-operational')
    expect(getAccessToken()).toBe(validAccess)
    expect(mockedListClubs).not.toHaveBeenCalled()
  })

  it.each(['OWNER', 'STAFF'] as const)(
    'continues operational bootstrap for %s and calls listClubs',
    async (role) => {
      const validAccess = createDevAccessToken(role)
      setAccessToken(validAccess)

      const profile: CurrentUserProfile = {
        id: 200,
        username: `${role.toLowerCase()}-user`,
        email: `${role.toLowerCase()}@example.com`,
        first_name: role,
        last_name: 'User',
        phone_number: null,
        is_active: true,
        profile_role: role,
        account_created_by: null,
      }
      mockedFetchCurrentUserProfile.mockResolvedValueOnce(profile)
      mockedListClubs.mockResolvedValueOnce(paginated([mockClub1]))

      render(
        <AuthProvider>
          <AuthProviderHarness />
        </AuthProvider>,
      )

      await waitFor(() => {
        expect(screen.getByText(`${role.toLowerCase()}-user`)).toBeInTheDocument()
      })
      expect(screen.getByTestId('is-operational')).toHaveTextContent('operational')
      expect(mockedListClubs).toHaveBeenCalled()
    },
  )

  it('continues operational bootstrap for ADMIN without calling listClubs', async () => {
    const validAccess = createDevAccessToken('ADMIN')
    setAccessToken(validAccess)

    const profile: CurrentUserProfile = {
      id: 200,
      username: 'admin-user',
      email: 'admin@example.com',
      first_name: 'ADMIN',
      last_name: 'User',
      phone_number: null,
      is_active: true,
      profile_role: 'ADMIN',
      account_created_by: null,
    }
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(profile)

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('admin-user')).toBeInTheDocument()
    })
    expect(screen.getByTestId('is-operational')).toHaveTextContent('operational')
    // ADMIN does not need to load clubs during startup.
    expect(mockedListClubs).not.toHaveBeenCalled()
  })

  it('hydrates session with userId = 50 and profileId = 12 when profile_id is provided by /me/', async () => {
    const validAccess = createDevAccessToken('STAFF')
    setAccessToken(validAccess)

    const profile: CurrentUserProfile = {
      id: 50,
      profile_id: 12,
      username: 'staff-with-profile',
      email: 'staff@example.com',
      first_name: 'Staff',
      last_name: 'Member',
      phone_number: null,
      is_active: true,
      profile_role: 'STAFF',
      account_created_by: null,
    }
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(profile)

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('staff-with-profile')).toBeInTheDocument()
    })
    expect(screen.getByTestId('user-id')).toHaveTextContent('50')
    expect(screen.getByTestId('profile-id')).toHaveTextContent('12')
  })

  it('hydrates session with userId = 50 and profileId = null when profile_id is not provided by /me/ (no guessing)', async () => {
    const validAccess = createDevAccessToken('STAFF')
    setAccessToken(validAccess)

    const profile: CurrentUserProfile = {
      id: 50,
      username: 'staff-without-profile',
      email: 'staff@example.com',
      first_name: 'Staff',
      last_name: 'Member',
      phone_number: null,
      is_active: true,
      profile_role: 'STAFF',
      account_created_by: null,
    }
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(profile)

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('staff-without-profile')).toBeInTheDocument()
    })
    expect(screen.getByTestId('user-id')).toHaveTextContent('50')
    // Crucial: profileId must be none (null), never guessing or copying 50 from userId!
    expect(screen.getByTestId('profile-id')).toHaveTextContent('none')
  })
})
