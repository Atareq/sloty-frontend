import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError, apiRequest, resetSilentRefreshForTests } from '../api/apiClient'
import { AuthProvider } from './AuthProvider'
import { fetchCurrentUserProfile } from './authApi'
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from './authStorage'
import type { CurrentUserProfile } from './auth.types'
import { createDevAccessToken } from './devAuth'
import {
  clearSelectedClubSlug,
  getSelectedClubSlug,
  saveSelectedClubSlug,
} from './selectedClubStorage'
import {
  clearSelectedCourtId,
  getSelectedCourtId,
  saveSelectedCourtId,
} from './selectedCourtStorage'
import { getClub, listClubs } from '../../features/clubs/clubsApi'
import { getCourt, listCourts } from '../../features/courts/courtsApi'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { useAuth } from './useAuth'

vi.mock('./authApi', () => ({
  fetchCurrentUserProfile: vi.fn(),
  loginWithPassword: vi.fn(),
  refreshAccessToken: vi.fn(),
  changePassword: vi.fn(),
}))

vi.mock('../../features/clubs/clubsApi', () => ({
  getClub: vi.fn(),
  listClubs: vi.fn(),
}))

vi.mock('../../features/courts/courtsApi', () => ({
  getCourt: vi.fn(),
  listCourts: vi.fn(),
}))

const mockedFetchCurrentUserProfile = vi.mocked(fetchCurrentUserProfile)
const mockedGetClub = vi.mocked(getClub)
const mockedListClubs = vi.mocked(listClubs)
const mockedGetCourt = vi.mocked(getCourt)
const mockedListCourts = vi.mocked(listCourts)

function paginated<T>(results: T[]): PaginatedResponse<T> {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

function createExpiredToken(): string {
  const claims = {
    user_id: 1,
    role: 'STAFF',
    name: 'مستخدم تجريبي',
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

const mockStaffProfile: CurrentUserProfile = {
  id: 1,
  username: 'staff-user',
  email: 'staff@example.com',
  first_name: 'أحمد',
  last_name: 'علي',
  phone_number: '+201011223344',
  is_active: true,
  profile_role: 'STAFF',
  account_created_by: null,
}

const mockClub = {
  id: 10,
  slug: 'al-ahly',
  name: 'النادي الأهلي',
  city: 'ASSIUT',
  is_active: true,
}

const mockCourt = {
  id: 20,
  name: 'ملعب 1',
  club: 10,
  sport_type: 'FOOTBALL' as const,
  minimum_deposit: '50.00',
  cancellation_refund_notice_days: 2,
  slot_duration_minutes: 60,
  is_active: true,
  requires_digital_payment_reference: false,
  internal_hold_expiry_hours: 2,
}

function SessionRestorationHarness() {
  const {
    currentUser,
    isOperational,
    isLoadingSession,
    role,
    selectedClubSlug,
    selectedCourtId,
    sessionError,
    logout,
  } = useAuth()

  if (isLoadingSession) {
    return (
      <div>
        <p data-testid="restoring">جاري تحميل الجلسة...</p>
        <button onClick={() => void logout()} type="button">
          تسجيل الخروج
        </button>
      </div>
    )
  }

  return (
    <div>
      <p data-testid="username">{currentUser?.username ?? 'لا يوجد مستخدم'}</p>
      <p data-testid="session-error">{sessionError ?? 'لا يوجد خطأ'}</p>
      <p data-testid="role">{role ?? 'لا يوجد دور'}</p>
      <p data-testid="operational">{isOperational ? 'operational' : 'non-operational'}</p>
      <p data-testid="club-slug">{selectedClubSlug ?? 'لا يوجد نادي'}</p>
      <p data-testid="court-id">{selectedCourtId ? String(selectedCourtId) : 'لا يوجد ملعب'}</p>
      <button onClick={() => void logout()} type="button">
        تسجيل الخروج
      </button>
    </div>
  )
}

describe('Unified Session Restoration & Club/Court Recovery', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    resetSilentRefreshForTests()
    clearAuthTokens()
    clearSelectedClubSlug()
    clearSelectedCourtId()
    vi.clearAllMocks()

    mockedGetClub.mockResolvedValue(mockClub)
    mockedListClubs.mockResolvedValue(paginated([mockClub]))
    mockedGetCourt.mockResolvedValue(mockCourt)
    mockedListCourts.mockResolvedValue(paginated([mockCourt]))
  })

  // §24: TEST — VALID STARTUP
  it('restores valid session with direct Club and Court retrieve and no refresh', async () => {
    const validAccess = createDevAccessToken('STAFF')
    setAccessToken(validAccess)
    setRefreshToken('valid-refresh')
    saveSelectedClubSlug('al-ahly')
    saveSelectedCourtId(20)

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(mockStaffProfile)

    render(
      <AuthProvider>
        <SessionRestorationHarness />
      </AuthProvider>,
    )

    // Restoring state first
    expect(screen.getByTestId('restoring')).toBeInTheDocument()

    // Resolved operational app shown
    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('staff-user')
    })
    expect(screen.getByTestId('role')).toHaveTextContent('STAFF')
    expect(screen.getByTestId('operational')).toHaveTextContent('operational')
    expect(screen.getByTestId('club-slug')).toHaveTextContent('al-ahly')
    expect(screen.getByTestId('court-id')).toHaveTextContent('20')

    // Authoritative direct retrieve used
    expect(mockedGetClub).toHaveBeenCalledWith('al-ahly')
    expect(mockedGetCourt).toHaveBeenCalledWith('al-ahly', 20)
    expect(mockedFetchCurrentUserProfile).toHaveBeenCalledTimes(1)
  })

  // §25: TEST — EXPIRED ACCESS
  it('restores expired access via refresh and retries /me once', async () => {
    const expiredAccess = createExpiredToken()
    const newAccess = createDevAccessToken('STAFF')
    setAccessToken(expiredAccess)
    setRefreshToken('stored-refresh-token')

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('auth/token/refresh/')) {
          return Promise.resolve(Response.json({ access: newAccess }))
        }
        return Promise.resolve(Response.json({ ok: true }))
      }),
    )

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(mockStaffProfile)

    render(
      <AuthProvider>
        <SessionRestorationHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('staff-user')
    })
    expect(getAccessToken()).toBe(newAccess)
    expect(getRefreshToken()).toBe('stored-refresh-token')
  })

  // §26: TEST — CONCURRENT 401
  it('shares exactly one refresh across concurrent 401 requests', async () => {
    const newAccess = createDevAccessToken('STAFF')
    setAccessToken(createDevAccessToken('STAFF'))
    setRefreshToken('refresh-token')

    let refreshCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('token/refresh')) {
          refreshCalls += 1
          return Response.json({ access: newAccess })
        }
        return Response.json(
          { success: false, code: 'SESSION_EXPIRED', message: 'Token expired' },
          { status: 401 },
        )
      }),
    )

    // Fire 4 concurrent requests
    const p1 = apiRequest('/endpoint-1').catch((e) => e)
    const p2 = apiRequest('/endpoint-2').catch((e) => e)
    const p3 = apiRequest('/endpoint-3').catch((e) => e)
    const p4 = apiRequest('/endpoint-4').catch((e) => e)

    await Promise.all([p1, p2, p3, p4])
    expect(refreshCalls).toBe(1)
  })

  // §27: TEST — TERMINAL REFRESH
  it.each([
    'TOKEN_NOT_VALID',
    'PASSWORD_CHANGED',
    'USER_INACTIVE',
    'USER_DELETED',
  ])('terminates session and clears club/court on terminal %s', async (errorCode) => {
    setAccessToken(createDevAccessToken('STAFF'))
    setRefreshToken('refresh-token')
    saveSelectedClubSlug('al-ahly')
    saveSelectedCourtId(20)

    mockedFetchCurrentUserProfile.mockRejectedValueOnce(
      new ApiClientError('حساب غير صالح', 401, { code: errorCode }),
    )

    render(
      <AuthProvider>
        <SessionRestorationHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('لا يوجد مستخدم')
    })
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(getSelectedClubSlug()).toBeNull()
    expect(getSelectedCourtId()).toBeNull()
  })

  // §28: TEST — PLAYER / NULL
  it.each([null, 'PLAYER'] as const)(
    'handles non-operational role %s without calling clubs or courts',
    async (nonOperationalRole) => {
      setAccessToken(createDevAccessToken('STAFF'))
      setRefreshToken('refresh-token')

      const profile: CurrentUserProfile = {
        ...mockStaffProfile,
        profile_role: nonOperationalRole,
      }
      mockedFetchCurrentUserProfile.mockResolvedValueOnce(profile)

      render(
        <AuthProvider>
          <SessionRestorationHarness />
        </AuthProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('operational')).toHaveTextContent('non-operational')
      })
      expect(getAccessToken()).not.toBeNull()
      expect(getRefreshToken()).not.toBeNull()
      expect(mockedGetClub).not.toHaveBeenCalled()
      expect(mockedListClubs).not.toHaveBeenCalled()
      expect(mockedGetCourt).not.toHaveBeenCalled()
      expect(mockedListCourts).not.toHaveBeenCalled()
    },
  )

  // §29: TEST — REVOKED CLUB
  it('handles CLUB_ACCESS_REVOKED on stored club by clearing club/court and loading accessible clubs', async () => {
    setAccessToken(createDevAccessToken('STAFF'))
    setRefreshToken('refresh-token')
    saveSelectedClubSlug('revoked-club')
    saveSelectedCourtId(20)

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(mockStaffProfile)
    mockedGetClub.mockRejectedValueOnce(
      new ApiClientError('تم إلغاء صلاحية النادي', 403, {
        code: 'CLUB_ACCESS_REVOKED',
      }),
    )
    const mockClub2 = { ...mockClub, id: 11, slug: 'zamalek', name: 'الزمالك' }
    mockedListClubs.mockResolvedValueOnce(paginated([mockClub, mockClub2]))

    render(
      <AuthProvider>
        <SessionRestorationHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('staff-user')
    })
    // Authentication preserved
    expect(getAccessToken()).not.toBeNull()
    // Stale club and court cleared
    expect(getSelectedClubSlug()).toBeNull()
    expect(getSelectedCourtId()).toBeNull()
    // Accessible clubs loaded as fallback
    expect(mockedListClubs).toHaveBeenCalled()
  })

  // §30: TEST — CLUB 404
  it('clears club and court when stored club returns 404', async () => {
    setAccessToken(createDevAccessToken('STAFF'))
    setRefreshToken('refresh-token')
    saveSelectedClubSlug('non-existent-club')
    saveSelectedCourtId(20)

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(mockStaffProfile)
    mockedGetClub.mockRejectedValueOnce(
      new ApiClientError('النادي غير موجود', 404, { code: 'NOT_FOUND' }),
    )
    const mockClub2 = { ...mockClub, id: 11, slug: 'zamalek', name: 'الزمالك' }
    mockedListClubs.mockResolvedValueOnce(paginated([mockClub, mockClub2]))

    render(
      <AuthProvider>
        <SessionRestorationHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('staff-user')
    })
    expect(getAccessToken()).not.toBeNull()
    expect(getSelectedClubSlug()).toBeNull()
    expect(getSelectedCourtId()).toBeNull()
    expect(mockedListClubs).toHaveBeenCalled()
  })

  // §31: TEST — COURT 404
  it('clears court only and keeps club when stored court returns 404', async () => {
    setAccessToken(createDevAccessToken('STAFF'))
    setRefreshToken('refresh-token')
    saveSelectedClubSlug('al-ahly')
    saveSelectedCourtId(999)

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(mockStaffProfile)
    mockedGetCourt.mockRejectedValueOnce(
      new ApiClientError('الملعب غير موجود', 404, { code: 'NOT_FOUND' }),
    )
    mockedListCourts.mockResolvedValueOnce(paginated([]))

    render(
      <AuthProvider>
        <SessionRestorationHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('staff-user')
    })
    expect(getAccessToken()).not.toBeNull()
    expect(screen.getByTestId('club-slug')).toHaveTextContent('al-ahly')
    expect(screen.getByTestId('court-id')).toHaveTextContent('لا يوجد ملعب')
  })

  it('keeps the persisted court when court retrieve fails with a network error', async () => {
    setAccessToken(createDevAccessToken('STAFF'))
    setRefreshToken('refresh-token')
    saveSelectedClubSlug('al-ahly')
    saveSelectedCourtId(20)

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(mockStaffProfile)
    mockedGetCourt.mockRejectedValueOnce(
      new ApiClientError('تعذر الاتصال بالخادم', 0, { code: 'NETWORK_ERROR' }),
    )

    render(
      <AuthProvider>
        <SessionRestorationHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('staff-user')
    })
    expect(getAccessToken()).not.toBeNull()
    expect(getSelectedClubSlug()).toBe('al-ahly')
    expect(getSelectedCourtId()).toBe(20)
    expect(screen.getByTestId('court-id')).toHaveTextContent('20')
  })

  it('fails bootstrap with a retryable session error when club list fails and no club is stored', async () => {
    setAccessToken(createDevAccessToken('STAFF'))
    setRefreshToken('refresh-token')

    mockedFetchCurrentUserProfile.mockResolvedValueOnce(mockStaffProfile)
    mockedListClubs.mockRejectedValueOnce(
      new ApiClientError('تعذر تحميل النوادي', 500),
    )

    render(
      <AuthProvider>
        <SessionRestorationHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('لا يوجد مستخدم')
    })
    expect(getAccessToken()).not.toBeNull()
    expect(screen.getByTestId('session-error')).not.toHaveTextContent('لا يوجد خطأ')
  })

  // §32: TEST — OFFLINE STARTUP
  it('preserves tokens and does not force logout when network is unavailable on startup', async () => {
    setAccessToken(createDevAccessToken('STAFF'))
    setRefreshToken('refresh-token')
    saveSelectedClubSlug('al-ahly')

    mockedFetchCurrentUserProfile.mockRejectedValueOnce(
      new ApiClientError('تعذر الاتصال بالخادم', 0, { code: 'NETWORK_ERROR' }),
    )

    render(
      <AuthProvider>
        <SessionRestorationHarness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.queryByTestId('restoring')).not.toBeInTheDocument()
    })
    // Tokens preserved
    expect(getAccessToken()).not.toBeNull()
    expect(getRefreshToken()).toBe('refresh-token')
    expect(getSelectedClubSlug()).toBe('al-ahly')
  })

  // §33: TEST — LOGOUT RACE
  it('ensures explicit logout wins refresh race', async () => {
    const user = userEvent.setup()
    const nextAccess = createDevAccessToken('STAFF')
    setAccessToken(createExpiredToken())
    setRefreshToken('refresh-token')

    let resolveRefresh: (res: Response) => void = () => {}
    const refreshPromise = new Promise<Response>((resolve) => {
      resolveRefresh = resolve
    })

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('auth/token/refresh/')) {
          return refreshPromise
        }
        return Promise.resolve(Response.json({ ok: true }))
      }),
    )

    mockedFetchCurrentUserProfile.mockResolvedValue(mockStaffProfile)

    render(
      <AuthProvider>
        <SessionRestorationHarness />
      </AuthProvider>,
    )

    // User clicks logout while refresh is in flight
    await user.click(screen.getByRole('button', { name: 'تسجيل الخروج' }))

    // Now refresh resolves late
    resolveRefresh(Response.json({ access: nextAccess }))

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('لا يوجد مستخدم')
    })
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})
