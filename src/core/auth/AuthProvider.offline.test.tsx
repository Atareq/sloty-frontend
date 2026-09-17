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
import type { CurrentUserProfile } from './auth.types'
import { listClubs } from '../../features/clubs/clubsApi'
import { listCourts } from '../../features/courts/courtsApi'
import { useAuth } from './useAuth'

vi.mock('./authApi', () => ({
  fetchCurrentUserProfile: vi.fn(),
}))

vi.mock('../../features/clubs/clubsApi', () => ({
  listClubs: vi.fn(),
}))

vi.mock('../../features/courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

const mockedFetchCurrentUserProfile = vi.mocked(fetchCurrentUserProfile)
const mockedListClubs = vi.mocked(listClubs)
const mockedListCourts = vi.mocked(listCourts)
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

const profile: CurrentUserProfile = {
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
    accessibleCourts,
  } = useAuth()

  return (
    <div>
      <p>{isAuthenticated ? 'operational' : 'anonymous'}</p>
      <p>{currentUser?.username ?? 'logged-out'}</p>
      <p>{selectedClubSlug ?? 'no-club'}</p>
      <p>{accessibleCourts[0]?.name ?? 'no-court'}</p>
      <p>{role ?? 'no-role'}</p>
    </div>
  )
}

describe('AuthProvider explicit logout IndexedDB integration', () => {
  beforeEach(async () => {
    clearAuthTokens()
    clearSelectedClubSlug()
    vi.clearAllMocks()
    mockedListCourts.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
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
    mockedListClubs.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          slug: 'demo-football-club',
          name: 'Demo Football Club',
          city: 'ASSIUT',
          is_active: true,
          created: '2026-08-01T00:00:00Z',
        },
      ],
    })
    mockedListCourts.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
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
      role: 'STAFF',
      selectedClubSlug: 'demo-football-club',
      accessibleClubs: [
        {
          id: 1,
          slug: 'demo-football-club',
          name: 'Demo Football Club',
          city: 'ASSIUT',
          is_active: true,
        },
      ],
      accessibleCourts: [
        {
          id: 3,
          club: 1,
          name: 'Court 1',
          sport_type: 'FOOTBALL',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 2,
        },
      ],
      selectedCourtId: 3,
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
