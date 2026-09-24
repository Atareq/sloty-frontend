import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicSchedulePage } from './PublicSchedulePage/PublicSchedulePage'
import { SchedulePage } from '../schedule/SchedulePage/SchedulePage'
import { getPublicCourtAvailability } from './publicScheduleApi'
import { listBookingSlots } from '../schedule/scheduleApi'
import { listCourts } from '../courts/courtsApi'
import { useAuth } from '../../core/auth/useAuth'
import { useOfflineSync } from '../../offline/sync/offlineSyncContext'
import { PageHeaderActionContext } from '../../shared/components/PageHeader/pageHeaderActionContext'
import { publicScheduleVisitorCopy } from '../../shared/copy/appCopy'
import type { PublicCourtAvailabilityResponse } from './publicSchedule.types'
import type { BookingSlotsResponse } from '../schedule/scheduleApi.types'

vi.mock('./publicScheduleApi', () => ({
  getPublicCourtAvailability: vi.fn(),
}))

vi.mock('../schedule/scheduleApi', () => ({
  listBookingSlots: vi.fn(),
  listBookingsForCourtDay: vi.fn().mockResolvedValue([]),
  createBooking: vi.fn(),
  getBooking: vi.fn(),
  cancelBooking: vi.fn(),
  completeBooking: vi.fn(),
  markBookingNoShow: vi.fn(),
  endBookingRecurrence: vi.fn(),
  previewBookingCancellation: vi.fn(),
}))

vi.mock('../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

vi.mock('../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../offline/sync/offlineSyncContext', async () => {
  const { createContext } = await import('react')
  return {
    useOfflineSync: vi.fn(),
    OfflineSyncContext: createContext(null),
  }
})

vi.mock('../../offline/repositories/offlineRepositories', () => ({
  offlineRepositories: {
    getBookingIntentsForCourts: vi.fn().mockResolvedValue([]),
    readScheduleDay: vi.fn().mockResolvedValue(null),
    replaceScheduleDay: vi.fn().mockResolvedValue(undefined),
    saveBookingDetail: vi.fn().mockResolvedValue(undefined),
    saveBookingIntent: vi.fn().mockResolvedValue(undefined),
    updateBookingIntent: vi.fn().mockResolvedValue(undefined),
    updateBookingIntentStatus: vi.fn().mockResolvedValue(undefined),
  },
}))

const mockedGetPublicCourtAvailability = vi.mocked(getPublicCourtAvailability)
const mockedListBookingSlots = vi.mocked(listBookingSlots)
const mockedListCourts = vi.mocked(listCourts)
const mockedUseAuth = vi.mocked(useAuth)
const mockedUseOfflineSync = vi.mocked(useOfflineSync)

const mockPublicAvailability: PublicCourtAvailabilityResponse = {
  club: { id: 1, slug: 'al-ahly', name: 'النادي الأهلي' },
  court: { id: 5, name: 'ملعب النجوم' },
  date: '2026-09-10',
  is_closed: false,
  opens_at: '09:00',
  closes_at: '23:00',
  slot_duration_minutes: 60,
  slots: [
    {
      start_time: '18:00:00',
      end_time: '19:00:00',
      availability: 'AVAILABLE',
    },
    {
      start_time: '19:00:00',
      end_time: '20:00:00',
      availability: 'UNAVAILABLE',
    },
  ],
}

import { getEgyptDateValue } from '../schedule/scheduleBoard.helpers'

const today = getEgyptDateValue()

const mockAuthenticatedSlots: BookingSlotsResponse = {
  court: 5,
  court_name: 'ملعب النجوم',
  date_from: today,
  date_to: today,
  slot_duration_minutes: 60,
  message: null,
  slots: [
    {
      date: today,
      start_time: '09:00',
      end_time: '10:00',
      slot_status: 'FREE',
      is_available: true,
      booking: null,
      label: 'متاح',
      slot_price: '150.00',
      recurring_anchor_booking_id: null,
      recurring_context: null,
      can_start_recurring: null,
      recurring_blocked_reason: null,
      first_recurring_conflict_start: null,
    },
  ],
}

describe('Public vs Authenticated Schedule Independent Acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.HTMLElement.prototype.scrollIntoView = vi.fn()

    mockedUseOfflineSync.mockReturnValue({
      connectivity: {
        browserNetwork: 'likely_online',
        backendReachability: 'reachable',
        lastConnectivityChangeAt: null,
        lastBrowserEvent: null,
        eventVersion: 0,
      },
      freshness: {
        ageMs: 60 * 60 * 1000,
        canCreateNewOfflineRequest: true,
        dataAgeSeconds: 3600,
        isFresh: true,
        lastSyncTimestamp: '2026-07-20T01:00:00.000Z',
        maxOfflineCreateWindowSeconds: 24 * 60 * 60,
      },
      sync: {
        activeSyncPromise: null,
        currentStep: 'idle',
        failedAttempts: 0,
        hasNeedsReviewMutations: false,
        hasPendingMutations: false,
        isSyncing: false,
        lastSyncError: null,
        needsReviewCount: 0,
        pendingCount: 0,
      },
      isOnline: true,
      isSyncing: false,
      hasPendingMutations: false,
      hasNeedsReviewMutations: false,
      lastSyncTimestamp: '2026-07-20T01:00:00.000Z',
      requestSync: vi.fn().mockResolvedValue({
        status: 'idle' as const,
        completedAt: null,
        error: null,
        syncedBookings: 0,
        failedBookings: 0,
      }),
      pendingCount: 0,
      needsReviewCount: 0,
      syncError: null,
      failedAttempts: 0,
      currentStep: 'idle',
      scheduleSyncStatus: 'idle',
      lastScheduleSyncTimestamp: '2026-07-20T01:00:00.000Z',
      triggerScheduleSync: vi.fn(),
    } as unknown as ReturnType<typeof useOfflineSync>)

    mockedUseAuth.mockReturnValue({
      currentUser: {
        id: 1,
        full_name: 'موظف النادي',
        email: 'staff@sloty.app',
        profile_role: 'STAFF',
        assigned_court: 5,
        memberships: [
          {
            club_slug: 'al-ahly',
            club_name: 'النادي الأهلي',
            role: 'STAFF',
            can_change_pricing: false,
            can_manage_working_hours: false,
            can_manage_settlements: false,
          },
        ],
      },
      selectedClubSlug: 'al-ahly',
      selectedCourtId: 5,
      accessibleCourts: [
        {
          id: 5,
          club: 1,
          name: 'ملعب النجوم',
          is_active: true,
        },
      ],
      role: 'STAFF',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      switchClub: vi.fn(),
      token: 'mock-token',
    } as unknown as ReturnType<typeof useAuth>)

    mockedListCourts.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 5,
          name: 'ملعب النجوم',
          club: 1,
          pricing_mode: 'HOURLY',
          slot_duration_minutes: 60,
          is_active: true,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ],
    } as unknown as Awaited<ReturnType<typeof listCourts>>)
  })

  it('verifies Guest Public Schedule path: mobile Login + Share icons, slot click opens Visitor Guidance Popup with no booking flow', async () => {
    const user = userEvent.setup()
    mockedGetPublicCourtAvailability.mockResolvedValue(mockPublicAvailability)

    render(
      <MemoryRouter initialEntries={['/public/al-ahly/courts/5/schedule']}>
        <Routes>
          <Route
            element={<PublicSchedulePage />}
            path="/public/:clubSlug/courts/:courtId/schedule"
          />
        </Routes>
      </MemoryRouter>,
    )

    // 1. Verify mobile Login + Share icons in header
    const loginButton = await screen.findByTestId('public-schedule-login-button')
    expect(loginButton).toBeInTheDocument()
    expect(loginButton).toHaveClass('w-11')
    expect(loginButton).toHaveAttribute('aria-label', 'تسجيل الدخول لفريق العمل')
    expect(loginButton.querySelector('span.hidden.sm\\:inline')).toHaveTextContent('تسجيل الدخول')

    const shareButton = screen.getByRole('button', { name: 'مشاركة الجدول' })
    expect(shareButton).toBeInTheDocument()
    expect(shareButton).toHaveClass('w-11')

    // 2. Click an available slot
    const availableSlot = screen.getByRole('button', { name: /(?<!غير )متاح$/ })
    expect(availableSlot).toBeEnabled()

    await user.click(availableSlot)

    // 3. Verifies Visitor Guidance Popup opens with exact Arabic copy
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: publicScheduleVisitorCopy.title.trim().replace(/\s+/g, ' '),
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(publicScheduleVisitorCopy.bodyPlayer),
    ).toBeInTheDocument()
    expect(
      screen.getByText(publicScheduleVisitorCopy.stayTuned),
    ).toBeInTheDocument()
    expect(
      screen.getByText(publicScheduleVisitorCopy.bodyStaff),
    ).toBeInTheDocument()

    // 4. Verifies no page scroll, no login ring, no login focus
    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled()
    expect(loginButton).not.toHaveClass('ring-4')
    expect(loginButton).not.toHaveFocus()

    // 5. Verifies NO Booking flow
    expect(screen.queryByText('حجز جديد')).not.toBeInTheDocument()

    // 6. Dismiss popup using 'استمرار'
    const continueButton = screen.getByRole('button', {
      name: publicScheduleVisitorCopy.continueAction,
    })
    await user.click(continueButton)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('verifies Authenticated Schedule path: standard Share presentation, slot click opens Add Booking flow', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockedListBookingSlots.mockResolvedValue(mockAuthenticatedSlots)

    const capturedActionRef = {
      current: null as React.ReactElement<{ mobileIconOnly?: boolean }> | null,
    }
    const setHeaderAction = vi.fn((action: React.ReactNode) => {
      if (action && typeof action === 'object' && 'props' in action) {
        capturedActionRef.current = action as React.ReactElement<{
          mobileIconOnly?: boolean
        }>
      }
    })

    render(
      <PageHeaderActionContext.Provider value={setHeaderAction}>
        <MemoryRouter initialEntries={['/schedule']}>
          <Routes>
            <Route element={<SchedulePage />} path="/schedule" />
          </Routes>
        </MemoryRouter>
      </PageHeaderActionContext.Provider>,
    )

    // 1. Verify operational schedule loads
    expect(await screen.findByRole('heading', { name: 'اختار اليوم' })).toBeInTheDocument()

    // 2. Verify authenticated share presentation (NOT guest mobile icon layout)
    expect(setHeaderAction).toHaveBeenCalled()
    expect(capturedActionRef.current).not.toBeNull()
    expect(capturedActionRef.current?.props.mobileIconOnly).toBeFalsy()

    // 3. Click FREE available slot
    const freeSlot = await screen.findByRole('button', { name: /9:00 ص متاح/ })
    expect(freeSlot).toBeInTheDocument()

    await user.click(freeSlot)

    // 4. Verifies existing Booking flow opens
    expect(await screen.findByRole('heading', { name: 'حجز جديد' })).toBeInTheDocument()

    vi.useRealTimers()
  })
})
