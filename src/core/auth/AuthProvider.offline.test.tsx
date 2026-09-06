import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { slotyLocalDatabase } from '../../offline/db/SlotyLocalDatabase'
import { offlineRepositories } from '../../offline/repositories/offlineRepositories'
import type { Booking } from '../../features/bookings/bookings.types'
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
const scope = { userId: 1, clubSlug: 'demo-football-club' }
const booking: Booking = {
  id: 1,
  court: 3,
  customer_name: 'عميل محلي',
  customer_phone: '+201000000000',
  start_time: '2026-08-30T18:00:00+03:00',
  end_time: '2026-08-30T19:00:00+03:00',
  status: 'CONFIRMED',
  is_recurring: false,
  recurrence_status: null,
  previous_recurring_booking_id: null,
  next_recurring_booking_id: null,
}

const profile = {
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

function LogoutHarness() {
  const { currentUser, login, logout } = useAuth()

  return (
    <div>
      <p>{currentUser?.username ?? 'logged-out'}</p>
      <button
        onClick={() => login(createDevAccessToken('STAFF'), 'refresh-token')}
        type="button"
      >
        login
      </button>
      <button
        onClick={() => {
          void logout()
        }}
        type="button"
      >
        logout
      </button>
    </div>
  )
}

function ColdStartHarness() {
  const {
    currentUser,
    isAuthenticated,
    role,
    selectedClubSlug,
    selectedMembership,
  } = useAuth()

  return (
    <div>
      <p>{isAuthenticated ? 'operational' : 'anonymous'}</p>
      <p>{currentUser?.username ?? 'logged-out'}</p>
      <p>{selectedClubSlug ?? 'no-club'}</p>
      <p>{selectedMembership?.court?.name ?? 'no-court'}</p>
      <p>{role ?? 'no-role'}</p>
    </div>
  )
}

describe('AuthProvider explicit logout IndexedDB integration', () => {
  beforeEach(async () => {
    clearAuthTokens()
    clearSelectedClubSlug()
    vi.clearAllMocks()
    slotyLocalDatabase.close()
    await slotyLocalDatabase.delete()
    await slotyLocalDatabase.open()
  })

  afterEach(async () => {
    slotyLocalDatabase.close()
    await slotyLocalDatabase.delete()
  })

  it('clears sensitive local rows before clearing auth and leaves no data for another user scope', async () => {
    const user = userEvent.setup()
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(profile)
    await offlineRepositories.replaceBookingsSnapshot(
      scope,
      [booking],
      '2026-08-30T12:00:00.000Z',
    )

    render(
      <AuthProvider>
        <LogoutHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'login' }))
    expect(await screen.findByText('staff-user')).toBeInTheDocument()
    await waitFor(async () => {
      expect(await offlineRepositories.readOfflineContext(scope)).toBeDefined()
    })

    await user.click(screen.getByRole('button', { name: 'logout' }))

    await waitFor(() => expect(getAccessToken()).toBeNull())
    expect(getSelectedClubSlug()).toBeNull()
    expect(await offlineRepositories.readCachedBookings(scope)).toEqual([])
    expect(await offlineRepositories.readOfflineContext(scope)).toBeUndefined()
    expect(
      await offlineRepositories.readCachedBookings({
        userId: 2,
        clubSlug: 'demo-football-club',
      }),
    ).toEqual([])
  })

  it('cold-starts into scoped offline operational access only from a verified selected-Club context', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    saveSelectedClubSlug('demo-football-club')
    await offlineRepositories.saveOfflineContext({
      scope,
      displayName: 'أحمد علي',
      isPlatformAdmin: false,
      membership: profile.memberships[0],
      lastVerifiedAt: '2026-09-04T10:00:00.000Z',
    })

    render(
      <AuthProvider>
        <ColdStartHarness />
      </AuthProvider>,
    )

    expect(await screen.findByText('operational')).toBeInTheDocument()
    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('demo-football-club')).toBeInTheDocument()
    expect(screen.getByText('Court 1')).toBeInTheDocument()
    expect(screen.getByText('STAFF')).toBeInTheDocument()
    expect(mockedFetchCurrentUserProfile).not.toHaveBeenCalled()
    onLine.mockRestore()
  })

  it('keeps anonymous offline users out when no verified selected-Club context exists', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    saveSelectedClubSlug('demo-football-club')

    render(
      <AuthProvider>
        <ColdStartHarness />
      </AuthProvider>,
    )

    expect(await screen.findByText('anonymous')).toBeInTheDocument()
    expect(screen.getByText('logged-out')).toBeInTheDocument()
    expect(mockedFetchCurrentUserProfile).not.toHaveBeenCalled()
    onLine.mockRestore()
  })
})
