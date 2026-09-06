import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { useOfflineSync } from '../../../offline/sync/offlineSyncContext'
import { offlineRepositories } from '../../../offline/repositories/offlineRepositories'
import type { BookingIntentRecord } from '../../../offline/offline.types'
import { chooseAppSelectOption } from '../../../test/appSelectTestUtils'
import { listCourts } from '../../courts/courtsApi'
import { createTransaction } from '../../transactions/transactionsApi'
import {
  cancelBooking,
  completeBooking,
  createBooking,
  endBookingRecurrence,
  getBooking,
  listBookingSlots,
  listBookingsForCourtDay,
  markBookingNoShow,
  previewBookingCancellation,
} from '../scheduleApi'
import type {
  BackendBookingStatus,
  BookingListItem,
  BookingSlot,
  BookingSlotsResponse,
} from '../scheduleApi.types'
import { getEgyptDateValue } from '../scheduleBoard.helpers'
import { SchedulePage } from './SchedulePage'

interface Deferred<TValue> {
  promise: Promise<TValue>
  reject: (reason?: unknown) => void
  resolve: (value: TValue | PromiseLike<TValue>) => void
}

function createDeferred<TValue>(): Deferred<TValue> {
  let resolve!: Deferred<TValue>['resolve']
  let reject!: Deferred<TValue>['reject']
  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../../offline/sync/offlineSyncContext', () => ({
  useOfflineSync: vi.fn(),
}))

vi.mock('../../../offline/repositories/offlineRepositories', () => ({
  offlineRepositories: {
    getBookingIntentsForCourts: vi.fn(),
    readScheduleDay: vi.fn(),
    replaceScheduleDay: vi.fn(),
    saveBookingDetail: vi.fn(),
    saveBookingIntent: vi.fn(),
    updateBookingIntent: vi.fn(),
    updateBookingIntentStatus: vi.fn(),
  },
}))

vi.mock('../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

vi.mock('../scheduleApi', () => ({
  cancelBooking: vi.fn(),
  completeBooking: vi.fn(),
  createBooking: vi.fn(),
  endBookingRecurrence: vi.fn(),
  getBooking: vi.fn(),
  getBookingRecurrenceNext: vi.fn(),
  listBookingSlots: vi.fn(),
  listBookingsForCourtDay: vi.fn(),
  markBookingNoShow: vi.fn(),
  previewBookingCancellation: vi.fn(),
  rescheduleBooking: vi.fn(),
  updateBookingCustomer: vi.fn(),
}))

vi.mock('../../transactions/transactionsApi', () => ({
  createTransaction: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseOfflineSync = vi.mocked(useOfflineSync)
const mockedOfflineRepositories = vi.mocked(offlineRepositories)
const mockedListCourts = vi.mocked(listCourts)
const mockedListBookingSlots = vi.mocked(listBookingSlots)
const mockedListBookingsForCourtDay = vi.mocked(listBookingsForCourtDay)
const mockedCreateBooking = vi.mocked(createBooking)
const mockedEndBookingRecurrence = vi.mocked(endBookingRecurrence)
const mockedGetBooking = vi.mocked(getBooking)
const mockedCancelBooking = vi.mocked(cancelBooking)
const mockedCompleteBooking = vi.mocked(completeBooking)
const mockedMarkBookingNoShow = vi.mocked(markBookingNoShow)
const mockedPreviewBookingCancellation = vi.mocked(previewBookingCancellation)
const mockedCreateTransaction = vi.mocked(createTransaction)
const scrollIntoViewMock = vi.fn()

function paginatedResponse<T>(results: T[]) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

function bookingFixture(
  booking: Omit<BookingListItem, 'is_recurring' | 'recurrence_status' | 'previous_recurring_booking_id' | 'next_recurring_booking_id'>,
): BookingListItem {
  return {
    is_recurring: false,
    recurrence_status: null,
    previous_recurring_booking_id: null,
    next_recurring_booking_id: null,
    ...booking,
  }
}

function makeSlot(
  overrides: Partial<BookingSlot> & Pick<BookingSlot, 'start_time' | 'end_time'>,
): BookingSlot {
  const date = getEgyptDateValue()
  const slotStatus = overrides.slot_status ?? 'FREE'
  const bookingStatus = slotStatus === 'FREE' ? 'CONFIRMED' : slotStatus
  const shouldCreateBooking =
    slotStatus !== 'FREE' &&
    slotStatus !== 'UNAVAILABLE' &&
    slotStatus !== 'RECURRING_RESERVED'
  const bookingIdByStartTime: Record<string, number> = {
    '06:00': 12,
    '07:00': 10,
    '12:00': 13,
    '13:00': 14,
  }
  const label = Object.prototype.hasOwnProperty.call(overrides, 'label')
    ? overrides.label ?? null
    : slotStatus === 'FREE'
      ? 'متاح'
      : slotStatus === 'RECURRING_RESERVED'
        ? 'محجوز'
        : 'مؤكد'

  return {
    date: overrides.date ?? date,
    start_time: overrides.start_time,
    end_time: overrides.end_time,
    slot_status: slotStatus,
    is_available: overrides.is_available ?? slotStatus === 'FREE',
    booking: Object.prototype.hasOwnProperty.call(overrides, 'booking')
      ? overrides.booking ?? null
      : !shouldCreateBooking
        ? null
        : {
            id: bookingIdByStartTime[overrides.start_time] ?? 10,
            status: bookingStatus as BackendBookingStatus,
            status_label: label ?? 'مؤكد',
            customer_name:
              slotStatus === 'HOLD' ? 'عميل حجز مؤقت' : 'أحمد علي',
            customer_phone:
              slotStatus === 'HOLD' ? '+201012345678' : '+201000000000',
            total_booking_value: '250.00',
            total_paid_amount: slotStatus === 'CONFIRMED' ? '250.00' : '100.00',
            remaining_amount: slotStatus === 'CONFIRMED' ? '0.00' : '150.00',
            is_recurring: false,
            recurrence_status: null,
          },
    label,
    slot_price: overrides.slot_price ?? null,
    recurring_anchor_booking_id: overrides.recurring_anchor_booking_id ?? null,
    recurring_context: Object.prototype.hasOwnProperty.call(
      overrides,
      'recurring_context',
    )
      ? overrides.recurring_context ?? null
      : null,
    can_start_recurring: overrides.can_start_recurring ?? null,
    recurring_blocked_reason: overrides.recurring_blocked_reason ?? null,
    first_recurring_conflict_start:
      overrides.first_recurring_conflict_start ?? null,
  }
}

function makeSlotsResponse(slots: BookingSlot[]): BookingSlotsResponse {
  const today = getEgyptDateValue()

  return {
    court: 7,
    court_name: 'ملعب 1',
    date_from: today,
    date_to: today,
    slot_duration_minutes: 60,
    message: null,
    slots,
  }
}

function defaultSlots(): BookingSlot[] {
  return [
    makeSlot({
      start_time: '06:00',
      end_time: '07:00',
      slot_status: 'HOLD',
      is_available: false,
      label: 'بانتظار العربون',
    }),
    makeSlot({
      start_time: '07:00',
      end_time: '08:00',
      slot_status: 'CONFIRMED',
      is_available: false,
      label: 'مؤكد',
    }),
    makeSlot({
      start_time: '09:00',
      end_time: '10:00',
      slot_status: 'FREE',
      is_available: true,
      label: 'متاح',
    }),
    makeSlot({
      start_time: '12:00',
      end_time: '13:00',
      slot_status: 'NO_SHOW',
      is_available: false,
      label: 'عدم حضور',
    }),
    makeSlot({
      start_time: '13:00',
      end_time: '14:00',
      slot_status: 'COMPLETED',
      is_available: false,
      label: 'مكتمل',
    }),
  ]
}

function makeBookingIntent(
  overrides: Partial<BookingIntentRecord> = {},
): BookingIntentRecord {
  const today = getEgyptDateValue()

  return {
    scope_key: 'user:1:club:nasr-club',
    user_id: 1,
    club_slug: 'nasr-club',
    local_id: 'intent-1',
    court_id: 7,
    requested_date: today,
    requested_start: `${today}T09:00:00`,
    requested_end: `${today}T10:00:00`,
    customer_name: 'عميل محفوظ',
    customer_phone: '+201012345678',
    notes: null,
    requested_recurring: false,
    original_slot_snapshot: makeSlot({
      start_time: '09:00',
      end_time: '10:00',
      slot_status: 'FREE',
      is_available: true,
      label: 'متاح',
    }),
    status: 'PENDING_SYNC',
    review_reason: null,
    created_at: `${today}T08:30:00.000Z`,
    updated_at: `${today}T08:30:00.000Z`,
    client_request_id: 'client-request-1',
    last_attempt_at: null,
    resolved_booking_id: null,
    ...overrides,
  }
}

function mockScheduleApiData(): void {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: {
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
          role: 'STAFF',
          club: {
            id: 1,
            name: 'نادي النصر',
            slug: 'nasr-club',
            city: 'ASSIUT',
            is_active: true,
          },
          court: { id: 7, name: 'ملعب 1' },
        },
      ],
    },
    selectedClubSlug: 'nasr-club',
    selectedMembership: {
      id: 10,
      role: 'STAFF',
      club: {
        id: 1,
        name: 'نادي النصر',
        slug: 'nasr-club',
        city: 'ASSIUT',
        is_active: true,
      },
      court: { id: 7, name: 'ملعب 1' },
    },
    role: 'STAFF',
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
  mockedListCourts.mockResolvedValue(
    paginatedResponse([
      {
        id: 7,
        club: 1,
        name: 'ملعب 1',
        sport_type: 'FOOTBALL',
        default_price: '250.00',
        minimum_deposit: '100.00',
        cancellation_refund_notice_days: 3,
        slot_duration_minutes: 60,
        is_active: true,
        requires_digital_payment_reference: false,
        internal_hold_expiry_hours: 12,
      },
    ]),
  )
  mockedListBookingSlots.mockResolvedValue(makeSlotsResponse(defaultSlots()))
  mockedOfflineRepositories.getBookingIntentsForCourts.mockResolvedValue([])
  mockedOfflineRepositories.readScheduleDay.mockResolvedValue(undefined)
  mockedOfflineRepositories.replaceScheduleDay.mockResolvedValue(undefined)
  mockedOfflineRepositories.saveBookingDetail.mockResolvedValue(undefined)
  mockedOfflineRepositories.saveBookingIntent.mockResolvedValue(undefined)
  mockedOfflineRepositories.updateBookingIntent.mockResolvedValue(undefined)
  mockedOfflineRepositories.updateBookingIntentStatus.mockResolvedValue(
    undefined,
  )
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
      isLoading: false,
      lastSuccessfulOperationalSyncAt: '2026-07-20T01:00:00.000Z',
      level: 'fresh',
      warningText: null,
    },
    requestSync: vi.fn(async () => ({
      scopeKey: 'user:1:club:nasr-club',
      trigger: 'manual' as const,
      status: 'success' as const,
      datasets: {
        schedule: {
          dataset: 'schedule' as const,
          status: 'success' as const,
          committedAt: '2026-07-20T02:00:00.000Z',
        },
        bookings: {
          dataset: 'bookings' as const,
          status: 'skipped' as const,
          reason: 'not_implemented_until_later_task',
        },
        transactions: {
          dataset: 'transactions' as const,
          status: 'skipped' as const,
          reason: 'not_implemented_until_later_task',
        },
        current_custody: {
          dataset: 'current_custody' as const,
          status: 'skipped' as const,
          reason: 'not_implemented_until_later_task',
        },
      },
      startedAt: '2026-07-20T02:00:00.000Z',
      completedAt: '2026-07-20T02:00:00.000Z',
    })),
    sync: {
      status: 'idle',
      activeScopeKey: null,
      activeDataset: null,
      lastRunStartedAt: null,
      lastRunCompletedAt: null,
      lastRunResult: null,
      backendReachability: 'reachable',
    },
  })
  mockedCreateBooking.mockResolvedValue(bookingFixture({
    id: 20,
    court: 7,
    customer_name: 'أحمد علي',
    customer_phone: '01000000000',
    start_time: `${getEgyptDateValue()}T09:00:00`,
    end_time: `${getEgyptDateValue()}T10:00:00`,
    status: 'CONFIRMED',
  }))
  mockedCancelBooking.mockResolvedValue(bookingFixture({
    id: 10,
    court: 7,
    customer_name: 'أحمد علي',
    start_time: '07:00',
    end_time: '08:00',
    status: 'CANCELLED',
  }))
  mockedCompleteBooking.mockResolvedValue(bookingFixture({
    id: 10,
    court: 7,
    customer_name: 'أحمد علي',
    start_time: '07:00',
    end_time: '08:00',
    status: 'COMPLETED',
  }))
  mockedMarkBookingNoShow.mockResolvedValue(bookingFixture({
    id: 10,
    court: 7,
    customer_name: 'أحمد علي',
    start_time: '07:00',
    end_time: '08:00',
    status: 'NO_SHOW',
  }))
  mockedCreateTransaction.mockResolvedValue({
    id: 30,
    booking: 10,
    amount: '150',
    payment_method: 'CASH',
  })
  mockedPreviewBookingCancellation.mockResolvedValue({
    booking_id: 10,
    previewed_at: '2026-07-20T10:00:00Z',
    booking_start: '2026-07-20T07:00:00Z',
    paid_amount: '100.00',
    minimum_deposit: '100.00',
    refund_notice_days: 3,
    refund_deadline: '2026-07-17T07:00:00Z',
    full_refund: false,
    refund_amount: '0.00',
    retained_amount: '100.00',
    can_cancel: true,
  })
}

describe('SchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.scrollIntoView = scrollIntoViewMock
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-07-20T02:00:00Z'))
    mockScheduleApiData()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the daily board from backend booking slots', async () => {
    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'اختار اليوم' }))
      .toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'اختار المعاد' }))
      .toBeInTheDocument()
    expect(screen.queryByText('لوحة الحجز')).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'اختر فترة متاحة لإضافة حجز، أو فترة مشغولة لعرض الإجراء المناسب',
      ),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('جدول اليوم')).not.toBeInTheDocument()
    expect(screen.queryByText('مستخدم سلوتي')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    const summary = screen.getByRole('region', { name: 'ملخص فترات الحجز' })
    expect(within(summary).getByText('إجمالي الفترات')).toBeInTheDocument()
    expect(within(summary).getByText('5')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '6:00 ص بانتظار العربون' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: '9:00 ص متاح' }))
      .toBeInTheDocument()
    await waitFor(() => {
      expect(mockedListBookingSlots).toHaveBeenCalledWith('nasr-club', {
        court: 7,
        date: getEgyptDateValue(),
      })
    })
    expect(mockedListCourts).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('الملعب')).not.toBeInTheDocument()
    expect(mockedListBookingsForCourtDay).not.toHaveBeenCalled()
    expect(scrollIntoViewMock).not.toHaveBeenCalled()
  })

  it('renders a cached Schedule day before any online refresh resolves', async () => {
    mockedOfflineRepositories.readScheduleDay.mockResolvedValue({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      court_id: 7,
      date: getEgyptDateValue(),
      message: null,
      slots: defaultSlots(),
      synced_at: '2026-07-20T01:00:00.000Z',
    })

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: '9:00 ص متاح' }))
      .toBeInTheDocument()
    expect(screen.queryByText('جاري تحميل المواعيد...')).not.toBeInTheDocument()
    expect(mockedListBookingSlots).not.toHaveBeenCalled()
    expect(screen.getByText(/آخر تحديث/)).toBeInTheDocument()
  })

  it('distinguishes a synchronized empty cached day from a no-cache offline day', async () => {
    mockedOfflineRepositories.readScheduleDay.mockResolvedValueOnce({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      court_id: 7,
      date: getEgyptDateValue(),
      message: 'الملعب مغلق في هذا اليوم.',
      slots: [],
      synced_at: '2026-07-20T01:00:00.000Z',
    })
    mockedUseOfflineSync.mockReturnValue({
      ...mockedUseOfflineSync(),
      connectivity: {
        ...mockedUseOfflineSync().connectivity,
        browserNetwork: 'offline',
        backendReachability: 'unreachable',
      },
    })
    const { unmount } = render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('الملعب مغلق في هذا اليوم.'))
      .toBeInTheDocument()
    expect(screen.queryByText('محتاج اتصال بالإنترنت أول مرة'))
      .not.toBeInTheDocument()

    unmount()
    mockedOfflineRepositories.readScheduleDay.mockResolvedValue(undefined)
    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/محتاج اتصال بالإنترنت أول مرة/))
      .toBeInTheDocument()
    expect(screen.queryByText('مفيش مواعيد متاحة في اليوم ده.'))
      .not.toBeInTheDocument()
  })

  it('does not fetch slots without a selected club slug', async () => {
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      selectedClubSlug: null,
      selectedMembership: null,
    })

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('اختر ناديًا أولًا لعرض الجدول'))
        .toBeInTheDocument()
    })
    expect(mockedListCourts).not.toHaveBeenCalled()
    expect(mockedListBookingSlots).not.toHaveBeenCalled()
  })

  it('shows backend closed-day messages without treating them as errors', async () => {
    mockedListBookingSlots.mockResolvedValueOnce({
      ...makeSlotsResponse([]),
      message: 'الملعب مغلق في هذا اليوم.',
    })

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('الملعب مغلق في هذا اليوم.'))
      .toBeInTheDocument()
  })

  it('shows fallback empty and error states for slots', async () => {
    mockedListBookingSlots.mockResolvedValueOnce(makeSlotsResponse([]))
    const { unmount } = render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('مفيش مواعيد متاحة في اليوم ده.'))
      .toBeInTheDocument()

    unmount()
    mockedListBookingSlots.mockRejectedValueOnce(new Error('network'))
    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('تعذر تحميل مواعيد اليوم'))
      .toBeInTheDocument()
  })

  it('uses localized backend errors for slot loading when available', async () => {
    mockedListBookingSlots.mockRejectedValueOnce(
      new ApiClientError('تعذر تحميل المواعيد من الخادم', 400),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('تعذر تحميل المواعيد من الخادم'))
      .toBeInTheDocument()
  })

  it('shows the slot loading state', async () => {
    mockedListBookingSlots.mockImplementationOnce(
      () => new Promise(() => undefined),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('جاري تحميل المواعيد...'))
      .toBeInTheDocument()
  })

  it('scrolls to slots once only after an explicit date load settles', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    let resolveDateSlots!: (response: BookingSlotsResponse) => void

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await screen.findByRole('button', { name: '9:00 ص متاح' })
    expect(scrollIntoViewMock).not.toHaveBeenCalled()

    mockedListBookingSlots.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDateSlots = resolve
        }),
    )

    await user.click(
      screen.getByRole('button', { name: /الثلاثاء، ٢١ يوليو ٢٠٢٦/ }),
    )

    expect(screen.getByText('جاري تحميل المواعيد...')).toBeInTheDocument()
    expect(scrollIntoViewMock).not.toHaveBeenCalled()

    await act(async () => {
      resolveDateSlots(makeSlotsResponse(defaultSlots()))
    })

    await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledOnce())
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })

  it('does not repeat the requested scroll when a date load fails', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )
    await screen.findByRole('button', { name: '9:00 ص متاح' })
    mockedListBookingSlots.mockRejectedValueOnce(new Error('network'))

    await user.click(
      screen.getByRole('button', { name: /الثلاثاء، ٢١ يوليو ٢٠٢٦/ }),
    )

    expect(await screen.findByText('تعذر تحميل مواعيد اليوم'))
      .toBeInTheDocument()
    await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledOnce())
    await act(async () => Promise.resolve())
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1)
  })

  it('opens Add Booking only for FREE slots with is_available true', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '9:00 ص متاح' }))
    expect(screen.getByRole('heading', { name: 'حجز جديد' }))
      .toBeInTheDocument()
  })

  it('saves a local BookingIntent from the existing form while offline without creating a Booking', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const today = getEgyptDateValue()
    const cachedDay = {
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      court_id: 7,
      date: today,
      message: null,
      slots: defaultSlots(),
      synced_at: '2026-07-20T01:00:00.000Z',
    }
    const baseSync = mockedUseOfflineSync()
    mockedUseOfflineSync.mockReturnValue({
      ...baseSync,
      connectivity: {
        ...baseSync.connectivity,
        browserNetwork: 'offline',
        backendReachability: 'unreachable',
      },
    })
    mockedOfflineRepositories.readScheduleDay.mockResolvedValue(cachedDay)

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '9:00 ص متاح' }))
    expect(screen.getByRole('button', { name: 'احفظ طلب الحجز' }))
      .toBeInTheDocument()
    expect(
      screen.getByText('هنحاول نأكد الحجز تلقائيًا أول ما الإنترنت يرجع.'),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('اسم العميل'), 'عميل أوفلاين')
    await user.type(screen.getByLabelText('رقم الموبايل'), '01012345678')
    await user.click(screen.getByRole('button', { name: 'احفظ طلب الحجز' }))

    await waitFor(() => {
      expect(mockedOfflineRepositories.saveBookingIntent).toHaveBeenCalledWith(
        { userId: 1, clubSlug: 'nasr-club' },
        expect.objectContaining({
          court_id: 7,
          requested_date: today,
          requested_start: `${today}T09:00:00`,
          requested_end: `${today}T10:00:00`,
          customer_name: 'عميل أوفلاين',
          customer_phone: '+201012345678',
          notes: null,
          requested_recurring: false,
          status: 'PENDING_SYNC',
          resolved_booking_id: null,
        }),
      )
    })
    expect(mockedCreateBooking).not.toHaveBeenCalled()
    expect(await screen.findByText('✓ تم حفظ طلب الحجز')).toBeInTheDocument()
    expect(screen.queryByText('✓ تم حجز الموعد بنجاح')).not.toBeInTheDocument()
  })

  it('saves requested weekly recurrence in a local Booking Request when offline eligibility is true', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const today = getEgyptDateValue()
    const baseSync = mockedUseOfflineSync()
    mockedUseOfflineSync.mockReturnValue({
      ...baseSync,
      connectivity: {
        ...baseSync.connectivity,
        browserNetwork: 'offline',
        backendReachability: 'unreachable',
      },
    })
    mockedListBookingSlots.mockResolvedValueOnce(
      makeSlotsResponse([
        makeSlot({
          start_time: '09:00',
          end_time: '10:00',
          can_start_recurring: true,
        }),
      ]),
    )
    mockedOfflineRepositories.readScheduleDay.mockResolvedValue({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      court_id: 7,
      date: today,
      message: null,
      slots: [
        makeSlot({
          start_time: '09:00',
          end_time: '10:00',
          can_start_recurring: true,
        }),
      ],
      synced_at: '2026-07-20T01:00:00.000Z',
    })

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(
      await screen.findByRole('button', {
        name: '9:00 ص متاح متاح للتثبيت أسبوعيًا',
      }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: /ثبّت نفس الموعد كل أسبوع/ }),
    )
    await user.type(screen.getByLabelText('اسم العميل'), 'عميل أسبوعي')
    await user.type(screen.getByLabelText('رقم الموبايل'), '01012345678')
    await user.click(screen.getByRole('button', { name: 'احفظ طلب الحجز' }))

    await waitFor(() => {
      expect(mockedOfflineRepositories.saveBookingIntent).toHaveBeenCalledWith(
        { userId: 1, clubSlug: 'nasr-club' },
        expect.objectContaining({
          requested_recurring: true,
          status: 'PENDING_SYNC',
        }),
      )
    })
    expect(mockedCreateBooking).not.toHaveBeenCalled()
  })

  it('waits for the BookingIntent IndexedDB write before showing offline save success', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const today = getEgyptDateValue()
    const saveIntent = createDeferred<void>()
    const baseSync = mockedUseOfflineSync()
    mockedUseOfflineSync.mockReturnValue({
      ...baseSync,
      connectivity: {
        ...baseSync.connectivity,
        browserNetwork: 'offline',
        backendReachability: 'unreachable',
      },
    })
    mockedOfflineRepositories.readScheduleDay.mockResolvedValue({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      court_id: 7,
      date: today,
      message: null,
      slots: defaultSlots(),
      synced_at: '2026-07-20T01:00:00.000Z',
    })
    mockedOfflineRepositories.saveBookingIntent.mockReturnValueOnce(
      saveIntent.promise,
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '9:00 ص متاح' }))
    await user.type(screen.getByLabelText('اسم العميل'), 'عميل أوفلاين')
    await user.type(screen.getByLabelText('رقم الموبايل'), '01012345678')
    await user.click(screen.getByRole('button', { name: 'احفظ طلب الحجز' }))

    expect(screen.queryByText('✓ تم حفظ طلب الحجز')).not.toBeInTheDocument()

    saveIntent.resolve()
    expect(await screen.findByText('✓ تم حفظ طلب الحجز')).toBeInTheDocument()
  })

  it('keeps the offline request form open with customer input when IndexedDB save fails', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const today = getEgyptDateValue()
    const baseSync = mockedUseOfflineSync()
    mockedUseOfflineSync.mockReturnValue({
      ...baseSync,
      connectivity: {
        ...baseSync.connectivity,
        browserNetwork: 'offline',
        backendReachability: 'unreachable',
      },
    })
    mockedOfflineRepositories.readScheduleDay.mockResolvedValue({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      court_id: 7,
      date: today,
      message: null,
      slots: defaultSlots(),
      synced_at: '2026-07-20T01:00:00.000Z',
    })
    mockedOfflineRepositories.saveBookingIntent.mockRejectedValueOnce(
      new DOMException('quota exceeded', 'QuotaExceededError'),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '9:00 ص متاح' }))
    await user.type(screen.getByLabelText('اسم العميل'), 'عميل أوفلاين')
    await user.type(screen.getByLabelText('رقم الموبايل'), '01012345678')
    await user.click(screen.getByRole('button', { name: 'احفظ طلب الحجز' }))

    expect(await screen.findByText(/تعذر إنشاء الحجز/)).toBeInTheDocument()
    expect(screen.queryByText('✓ تم حفظ طلب الحجز')).not.toBeInTheDocument()
    expect(screen.getByLabelText('اسم العميل')).toHaveValue('عميل أوفلاين')
  })

  it('blocks only new local offline BookingIntent creation when freshness is older than 72 hours', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const today = getEgyptDateValue()
    const baseSync = mockedUseOfflineSync()
    mockedUseOfflineSync.mockReturnValue({
      ...baseSync,
      connectivity: {
        ...baseSync.connectivity,
        browserNetwork: 'offline',
        backendReachability: 'unreachable',
      },
      freshness: {
        ageMs: 73 * 60 * 60 * 1000,
        canCreateNewOfflineRequest: false,
        isLoading: false,
        lastSuccessfulOperationalSyncAt: '2026-07-16T01:00:00.000Z',
        level: 'creation_restricted',
        warningText:
          'آخر اتصال بـ Sloty كان من أكتر من 3 أيام.\nتقدر تشوف البيانات المحفوظة، لكن لازم تتصل بالإنترنت قبل تسجيل طلبات حجز جديدة.',
      },
    })
    mockedOfflineRepositories.readScheduleDay.mockResolvedValue({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      court_id: 7,
      date: today,
      message: null,
      slots: defaultSlots(),
      synced_at: '2026-07-20T01:00:00.000Z',
    })

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '9:00 ص متاح' }))
    await user.type(screen.getByLabelText('اسم العميل'), 'عميل أوفلاين')
    await user.type(screen.getByLabelText('رقم الموبايل'), '01012345678')
    await user.click(screen.getByRole('button', { name: 'احفظ طلب الحجز' }))

    expect(
      await screen.findByText(/آخر اتصال بـ Sloty كان من أكتر من 3 أيام/),
    ).toBeInTheDocument()
    expect(mockedOfflineRepositories.saveBookingIntent).not.toHaveBeenCalled()
    expect(screen.getByLabelText('اسم العميل')).toHaveValue('عميل أوفلاين')
  })

  it('keeps a pending Booking Request visible without auto-syncing or manual booking in Task 4', async () => {
    const intent = makeBookingIntent({
      local_id: 'intent-pending',
      status: 'PENDING_SYNC',
      customer_name: 'عميل جاهز',
      customer_phone: '+201055555555',
      notes: 'ملاحظة محفوظة',
    })
    mockedOfflineRepositories.getBookingIntentsForCourts.mockResolvedValue([
      intent,
    ])
    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('عميل جاهز')).toBeInTheDocument()
    expect(screen.getByText('بانتظار التأكيد')).toBeInTheDocument()
    expect(screen.getByText('الطلب محفوظ وبانتظار التأكيد عند رجوع الاتصال.'))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'احجز الآن' }))
      .not.toBeInTheDocument()
    expect(mockedCreateBooking).not.toHaveBeenCalled()
    expect(mockedOfflineRepositories.updateBookingIntentStatus)
      .not.toHaveBeenCalled()
  })

  it('edits Booking Request customer data without changing request identity or recurrence', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const intent = makeBookingIntent({
      local_id: 'intent-edit',
      client_request_id: 'stable-request-id',
      requested_recurring: true,
      status: 'NEEDS_REVIEW',
      review_reason: 'INVALID_CUSTOMER_DATA',
      customer_name: 'عميل قديم',
      customer_phone: '+201012345678',
      notes: 'ملاحظة قديمة',
    })
    mockedOfflineRepositories.getBookingIntentsForCourts.mockResolvedValue([
      intent,
    ])

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('بيانات العميل محتاجة تعديل'))
      .toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'تعديل البيانات' }))
    await user.clear(screen.getByLabelText('اسم العميل'))
    await user.type(screen.getByLabelText('اسم العميل'), 'عميل معدل')
    await user.clear(screen.getByLabelText('ملاحظات'))
    await user.type(screen.getByLabelText('ملاحظات'), 'ملاحظة معدلة')
    await user.click(screen.getByRole('button', { name: 'حفظ التعديل' }))

    await waitFor(() => {
      expect(mockedOfflineRepositories.updateBookingIntent).toHaveBeenCalledWith(
        { userId: 1, clubSlug: 'nasr-club' },
        'intent-edit',
        {
          customer_name: 'عميل معدل',
          customer_phone: '+201012345678',
          notes: 'ملاحظة معدلة',
          status: 'PENDING_SYNC',
          review_reason: null,
        },
      )
    })
    expect(mockedCreateBooking).not.toHaveBeenCalled()
  })

  it('renders reason-specific Needs Review actions and converts recurring requests to one-time locally', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const slotIntent = makeBookingIntent({
      local_id: 'intent-slot',
      status: 'NEEDS_REVIEW',
      review_reason: 'SLOT_UNAVAILABLE',
      customer_name: 'عميل تعارض',
    })
    const recurringIntent = makeBookingIntent({
      local_id: 'intent-recurring',
      status: 'NEEDS_REVIEW',
      review_reason: 'RECURRING_UNAVAILABLE',
      requested_recurring: true,
      customer_name: 'عميل أسبوعي',
    })
    mockedOfflineRepositories.getBookingIntentsForCourts.mockResolvedValue([
      slotIntent,
      recurringIntent,
    ])

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('المعاد مبقاش متاح')).toBeInTheDocument()
    expect(
      screen.getByText(
        'المعاد لسه متاح، لكن التثبيت الأسبوعي مبقاش متاح.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('↻ تثبيت أسبوعي')).toBeInTheDocument()

    const recurringCard = screen
      .getByText('عميل أسبوعي')
      .closest('div[class*="rounded-2xl"]')
    expect(recurringCard).not.toBeNull()
    await user.click(
      within(recurringCard as HTMLElement).getByRole('button', {
        name: 'احجز مرة واحدة',
      }),
    )

    expect(mockedOfflineRepositories.updateBookingIntent).toHaveBeenCalledWith(
      { userId: 1, clubSlug: 'nasr-club' },
      'intent-recurring',
      {
        requested_recurring: false,
        status: 'PENDING_SYNC',
        review_reason: null,
      },
    )
    expect(mockedCreateBooking).not.toHaveBeenCalled()
  })

  it('locks SYNCING Booking Requests from edit, alternative slot, and dismissal actions', async () => {
    mockedOfflineRepositories.getBookingIntentsForCourts.mockResolvedValue([
      makeBookingIntent({
        local_id: 'intent-syncing',
        status: 'SYNCING',
        customer_name: 'عميل جاري',
      }),
    ])

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findAllByText('جاري التأكيد...')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'تعديل البيانات' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'اختار معاد تاني' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تجاهل الطلب' }))
      .not.toBeInTheDocument()
  })

  it('updates an alternative slot with the latest snapshot while preserving client request id', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const today = getEgyptDateValue()
    const intent = makeBookingIntent({
      local_id: 'intent-alt',
      client_request_id: 'client-request-stable',
      status: 'NEEDS_REVIEW',
      review_reason: 'SLOT_UNAVAILABLE',
      requested_recurring: false,
    })
    const alternativeSlot = makeSlot({
      start_time: '10:00',
      end_time: '11:00',
      slot_status: 'FREE',
      is_available: true,
      slot_price: '400.00',
      can_start_recurring: true,
    })
    mockedOfflineRepositories.getBookingIntentsForCourts.mockResolvedValue([
      intent,
    ])
    mockedOfflineRepositories.readScheduleDay.mockResolvedValue({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      court_id: 7,
      date: today,
      message: null,
      slots: [
        makeSlot({
          start_time: '09:00',
          end_time: '10:00',
          slot_status: 'CONFIRMED',
          is_available: false,
        }),
        alternativeSlot,
      ],
      synced_at: '2026-07-20T01:00:00.000Z',
    })

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'اختار معاد تاني' }))
    await user.click(screen.getAllByRole('button', { name: /10:00 ص/ }).at(-1)!)

    expect(mockedOfflineRepositories.updateBookingIntent).toHaveBeenCalledWith(
      { userId: 1, clubSlug: 'nasr-club' },
      'intent-alt',
      expect.objectContaining({
        court_id: 7,
        requested_date: today,
        requested_start: `${today}T10:00:00`,
        requested_end: `${today}T11:00:00`,
        original_slot_snapshot: alternativeSlot,
        status: 'PENDING_SYNC',
        review_reason: null,
      }),
    )
  })

  it('keeps recurring intent under review when the chosen alternative cannot start recurrence', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const today = getEgyptDateValue()
    const intent = makeBookingIntent({
      local_id: 'intent-recurring-alt',
      status: 'NEEDS_REVIEW',
      review_reason: 'SLOT_UNAVAILABLE',
      requested_recurring: true,
    })
    const alternativeSlot = makeSlot({
      start_time: '10:00',
      end_time: '11:00',
      slot_status: 'FREE',
      is_available: true,
      can_start_recurring: false,
    })
    mockedOfflineRepositories.getBookingIntentsForCourts.mockResolvedValue([
      intent,
    ])
    mockedOfflineRepositories.readScheduleDay.mockResolvedValue({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      court_id: 7,
      date: today,
      message: null,
      slots: [
        makeSlot({
          start_time: '09:00',
          end_time: '10:00',
          slot_status: 'CONFIRMED',
          is_available: false,
        }),
        alternativeSlot,
      ],
      synced_at: '2026-07-20T01:00:00.000Z',
    })

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'اختار معاد تاني' }))
    await user.click(screen.getAllByRole('button', { name: /10:00 ص/ }).at(-1)!)

    const updateCall = mockedOfflineRepositories.updateBookingIntent.mock.calls
      .find(([, localId]) => localId === 'intent-recurring-alt')
    expect(updateCall).toBeDefined()
    expect(updateCall?.[2]).toEqual(
      expect.objectContaining({
        requested_start: `${today}T10:00:00`,
        requested_end: `${today}T11:00:00`,
        status: 'NEEDS_REVIEW',
        review_reason: 'RECURRING_UNAVAILABLE',
      }),
    )
    expect(updateCall?.[2]).not.toHaveProperty('requested_recurring')
  })

  it('shows selected slot price in Add Booking without submitting price', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const today = getEgyptDateValue()

    mockedListBookingSlots.mockResolvedValueOnce(
      makeSlotsResponse([
        makeSlot({
          start_time: '09:00',
          end_time: '10:00',
          slot_status: 'FREE',
          is_available: true,
          label: 'متاح',
          slot_price: '350.00',
        }),
      ]),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '9:00 ص متاح' }))
    expect(screen.getByText('السعر 350.00 جنيه')).toBeInTheDocument()

    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد علي')
    await user.type(screen.getByLabelText('رقم الموبايل'), '01000000000')
    await user.click(screen.getByRole('button', { name: 'تأكيد الحجز' }))

    await waitFor(() => {
      expect(mockedCreateBooking).toHaveBeenCalledWith('nasr-club', {
        court: 7,
        customer_name: 'أحمد علي',
        customer_phone: '+201000000000',
        start_time: `${today}T09:00:00`,
        end_time: `${today}T10:00:00`,
        is_recurring: false,
      })
    })
    expect(await screen.findByText('✓ تم حجز الموعد بنجاح'))
      .toBeInTheDocument()
  })

  it('does not allow FREE slots when is_available is false', async () => {
    mockedListBookingSlots.mockResolvedValueOnce(
      makeSlotsResponse([
        makeSlot({
          start_time: '09:00',
          end_time: '10:00',
          slot_status: 'FREE',
          is_available: false,
          label: 'متاح',
        }),
      ]),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: '9:00 ص متاح' }))
      .toBeDisabled()
  })

  it('keeps UNAVAILABLE slots disabled and outside Add Booking', async () => {
    mockedListBookingSlots.mockResolvedValueOnce(
      makeSlotsResponse([
        makeSlot({
          start_time: '10:00',
          end_time: '11:00',
          slot_status: 'UNAVAILABLE',
          is_available: false,
          label: null,
        }),
      ]),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: '10:00 ص غير متاح' }))
      .toBeDisabled()
    expect(screen.queryByRole('heading', { name: 'حجز جديد' }))
      .not.toBeInTheDocument()
  })

  it('opens existing booking flows for HOLD and CONFIRMED slots', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '6:00 ص بانتظار العربون' }))
    expect(within(screen.getByRole('dialog')).getByText('بانتظار العربون'))
      .toBeInTheDocument()
    expect(screen.getByText('+201012345678')).toBeInTheDocument()
    expect(screen.queryByText('غير متوفر')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'إغلاق' }))

    await user.click(screen.getByRole('button', { name: '7:00 ص العربون مدفوع' }))
    expect(within(screen.getByRole('dialog')).getByText('العربون مدفوع'))
      .toBeInTheDocument()
  })

  it('keeps COMPLETED and NO_SHOW non-bookable while allowing read-only details', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '1:00 م تم اللعب' }))
    expect(within(screen.getByRole('dialog')).getByText('تم اللعب'))
      .toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'حجز جديد' }))
      .not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'إغلاق' }))

    await user.click(screen.getByRole('button', { name: '12:00 م عدم حضور' }))
    expect(within(screen.getByRole('dialog')).getByText('عدم حضور'))
      .toBeInTheDocument()
  })

  it('renders AM slots before noon and PM slots from noon onward', async () => {
    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await screen.findByText('مواعيد الصباح')
    expect(screen.getByText('مواعيد المساء')).toBeInTheDocument()
    expect(screen.queryByText(/الفترة الصباحية/)).not.toBeInTheDocument()
    expect(screen.queryByText(/الفترة المسائية/)).not.toBeInTheDocument()
    expect(screen.queryByText('مواعيد ص')).not.toBeInTheDocument()
    expect(screen.queryByText('مواعيد م')).not.toBeInTheDocument()

    expect(within(screen.getByTestId('schedule-period-am'))
      .getByRole('button', { name: '9:00 ص متاح' })).toBeInTheDocument()
    expect(within(screen.getByTestId('schedule-period-pm'))
      .getByRole('button', { name: '12:00 م عدم حضور' })).toBeInTheDocument()
  })

  it('uses distinct period container treatments without changing period labels', async () => {
    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    const morningPeriod = await screen.findByTestId('schedule-period-am')
    const eveningPeriod = screen.getByTestId('schedule-period-pm')

    expect(morningPeriod).toHaveClass('bg-white/[0.18]', 'border-amber-100/70')
    expect(screen.getByTestId('schedule-period-am-warmth')).toHaveClass(
      'pointer-events-none',
      'bg-[linear-gradient(135deg,rgba(255,249,232,0.26)_0%,rgba(255,243,196,0.13)_46%,rgba(253,244,215,0.07)_68%,transparent_100%)]',
    )
    expect(eveningPeriod).toHaveClass('bg-slate-900/54', 'border-slate-300/35')
    expect(screen.getByTestId('schedule-period-pm-ambient-light')).toHaveClass(
      'pointer-events-none',
      'bg-[linear-gradient(135deg,rgba(224,242,254,0.13)_0%,rgba(226,232,240,0.08)_44%,rgba(148,163,184,0.05)_70%,transparent_100%)]',
    )
    expect(morningPeriod).not.toHaveClass('bg-slate-900/72')
    expect(eveningPeriod).not.toHaveClass('bg-white/[0.18]')
    expect(within(morningPeriod).getByText('مواعيد الصباح')).toBeInTheDocument()
    expect(within(eveningPeriod).getByText('مواعيد المساء')).toBeInTheDocument()
  })

  it('keeps identical slot statuses styled the same across morning and evening periods', async () => {
    mockedListBookingSlots.mockResolvedValueOnce(
      makeSlotsResponse([
        makeSlot({
          start_time: '09:00',
          end_time: '10:00',
          slot_status: 'FREE',
          is_available: true,
          label: 'متاح',
        }),
        makeSlot({
          start_time: '18:00',
          end_time: '19:00',
          slot_status: 'FREE',
          is_available: true,
          label: 'متاح',
        }),
        makeSlot({
          start_time: '10:00',
          end_time: '11:00',
          slot_status: 'HOLD',
          is_available: false,
          label: 'بانتظار العربون',
        }),
        makeSlot({
          start_time: '19:00',
          end_time: '20:00',
          slot_status: 'HOLD',
          is_available: false,
          label: 'بانتظار العربون',
        }),
      ]),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    const morningPeriod = await screen.findByTestId('schedule-period-am')
    const eveningPeriod = screen.getByTestId('schedule-period-pm')
    const morningFree = within(morningPeriod).getByRole('button', {
      name: '9:00 ص متاح',
    })
    const eveningFree = within(eveningPeriod).getByRole('button', {
      name: '6:00 م متاح',
    })
    const morningHold = within(morningPeriod).getByRole('button', {
      name: '10:00 ص بانتظار العربون',
    })
    const eveningHold = within(eveningPeriod).getByRole('button', {
      name: '7:00 م بانتظار العربون',
    })

    expect(morningFree).toHaveClass('border-[#22C55E]', 'bg-white')
    expect(eveningFree).toHaveClass('border-[#22C55E]', 'bg-white')
    expect(morningHold).toHaveClass('border-amber-400', 'bg-amber-100')
    expect(eveningHold).toHaveClass('border-amber-400', 'bg-amber-100')
  })

  it('keeps the closing section from backend slot booking summaries and excludes FREE', async () => {
    mockedListBookingSlots.mockResolvedValueOnce(
      makeSlotsResponse([
        makeSlot({ start_time: '03:00', end_time: '04:00' }),
        makeSlot({
          start_time: '04:00',
          end_time: '05:00',
          slot_status: 'CONFIRMED',
          is_available: false,
          label: 'مؤكد',
          booking: {
            id: 40,
            status: 'CONFIRMED',
            status_label: 'مؤكد',
            customer_name: 'عميل يحتاج إغلاق',
            customer_phone: '+201055555555',
            total_booking_value: '250.00',
            total_paid_amount: '100.00',
            remaining_amount: '150.00',
            is_recurring: false,
            recurrence_status: null,
          },
        }),
      ]),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('حجوزات تحتاج إغلاق')).toBeInTheDocument()
    expect(screen.getByText('عميل يحتاج إغلاق')).toBeInTheDocument()
    expect(screen.queryByText('عميل بدون اسم')).not.toBeInTheDocument()
  })

  it('reloads backend slots after creating a booking', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const today = getEgyptDateValue()

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '9:00 ص متاح' }))
    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد علي')
    await user.type(screen.getByLabelText('رقم الموبايل'), '01000000000')
    await user.click(screen.getByRole('button', { name: 'تأكيد الحجز' }))

    await waitFor(() => {
      expect(mockedCreateBooking).toHaveBeenCalledWith('nasr-club', {
        court: 7,
        customer_name: 'أحمد علي',
        customer_phone: '+201000000000',
        start_time: `${today}T09:00:00`,
        end_time: `${today}T10:00:00`,
        is_recurring: false,
      })
    })
    await waitFor(() => {
      expect(mockedListBookingSlots).toHaveBeenCalledTimes(2)
    })
  })

  it('closes creation after a HOLD response and uses the standard success message', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const today = getEgyptDateValue()
    mockedCreateBooking.mockResolvedValueOnce(bookingFixture({
      id: 21,
      court: 7,
      customer_name: 'عميل جديد',
      customer_phone: '+201012345678',
      start_time: `${today}T09:00:00`,
      end_time: `${today}T10:00:00`,
      status: 'HOLD',
    }))

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '9:00 ص متاح' }))
    await user.type(screen.getByLabelText('اسم العميل'), 'عميل جديد')
    await user.type(screen.getByLabelText('رقم الموبايل'), '01012345678')
    await user.click(screen.getByRole('button', { name: 'تأكيد الحجز' }))

    expect(await screen.findByText('✓ تم حجز الموعد بنجاح'))
      .toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('creates weekly recurrence through the booking endpoint', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const today = getEgyptDateValue()
    mockedListBookingSlots.mockResolvedValueOnce(makeSlotsResponse([
      makeSlot({
        start_time: '09:00',
        end_time: '10:00',
        can_start_recurring: true,
      }),
    ]))

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(
      await screen.findByRole('button', {
        name: '9:00 ص متاح متاح للتثبيت أسبوعيًا',
      }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: /ثبّت نفس الموعد كل أسبوع/ }),
    )
    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد علي')
    await user.type(screen.getByLabelText('رقم الموبايل'), '01000000000')
    await user.click(screen.getByRole('button', { name: 'تأكيد الحجز' }))

    await waitFor(() => {
      expect(mockedCreateBooking).toHaveBeenCalledWith(
        'nasr-club',
        {
          court: 7,
          customer_name: 'أحمد علي',
          customer_phone: '+201000000000',
          start_time: `${today}T09:00:00`,
          end_time: `${today}T10:00:00`,
          is_recurring: true,
        },
      )
    })
    await waitFor(() => {
      expect(mockedListBookingSlots).toHaveBeenCalledTimes(2)
    })
  })

  it('uses the stable slot-unavailable code and refreshes the scoped board', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockedCreateBooking.mockRejectedValueOnce(
      new ApiClientError('409 Conflict', 409, {
        code: 'BOOKING_SLOT_UNAVAILABLE',
      }),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '9:00 ص متاح' }))
    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد علي')
    await user.type(screen.getByLabelText('رقم الموبايل'), '01000000000')
    await user.click(screen.getByRole('button', { name: 'تأكيد الحجز' }))

    expect(
      await screen.findByText('المعاد مبقاش متاح. اختار ميعاد تاني.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('409 Conflict')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(mockedListBookingSlots).toHaveBeenCalledTimes(2)
      expect(mockedListBookingSlots).toHaveBeenLastCalledWith('nasr-club', {
        court: 7,
        date: getEgyptDateValue(),
      })
    })
  })

  it('disables weekly recurrence when Backend eligibility is false', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockedListBookingSlots.mockResolvedValueOnce(makeSlotsResponse([
      makeSlot({
        start_time: '09:00',
        end_time: '10:00',
        can_start_recurring: false,
        recurring_blocked_reason: 'FUTURE_CONFLICT',
        first_recurring_conflict_start: '2026-07-27T09:00:00Z',
      }),
    ]))

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '9:00 ص متاح' }))
    expect(screen.getByRole('checkbox', { name: /ثبّت نفس الموعد كل أسبوع/ }))
      .toBeDisabled()
    expect(screen.getByText(/فيه حجز آخر يوم/)).toBeInTheDocument()
    expect(screen.queryByText('FUTURE_CONFLICT')).not.toBeInTheDocument()
  })

  it('opens virtual recurring slot details without fetching the anchor booking', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const futureDate = '2026-09-01'
    mockedListBookingSlots.mockResolvedValueOnce(
      makeSlotsResponse([
        makeSlot({
          date: futureDate,
          start_time: '20:00',
          end_time: '21:00',
          slot_status: 'RECURRING_RESERVED',
          is_available: false,
          booking: null,
          slot_price: '350.00',
          recurring_anchor_booking_id: 120,
          recurring_context: {
            anchor_booking_id: 120,
            customer_name: 'أحمد محمد',
            customer_phone: '+201012345678',
            recurrence_status: 'ACTIVE',
          },
        }),
      ]),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(
      await screen.findByRole('button', { name: '8:00 م محجوز' }),
    )

    const dialog = await screen.findByRole('dialog', { name: 'تفاصيل المعاد' })
    expect(mockedGetBooking).not.toHaveBeenCalled()
    expect(within(dialog).getByText('تفاصيل المعاد')).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'أحمد محمد' }))
      .toBeInTheDocument()
    expect(within(dialog).getByText('+201012345678')).toBeInTheDocument()
    expect(within(dialog).getByText(/سبتمبر/)).toBeInTheDocument()
    expect(within(dialog).getByText('8:00 م – 9:00 م')).toBeInTheDocument()
    expect(within(dialog).getByText('ملعب 1')).toBeInTheDocument()
    expect(within(dialog).getByText('↻ محجوز أسبوعيًا')).toBeInTheDocument()
    expect(within(dialog).getByText('السعر الحالي')).toBeInTheDocument()
    expect(within(dialog).getByText('350.00 ج.م')).toBeInTheDocument()
    expect(within(dialog).queryByText('العربون مدفوع')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('تم اللعب')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('إجمالي الحجز')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('المدفوع')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('المتبقي')).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole('button', { name: 'سجّل العربون وأكّد الحجز' }),
    ).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'تم اللعب' }))
      .not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'عدم حضور' }))
      .not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'إلغاء الحجز' }))
      .not.toBeInTheDocument()
    expect(within(dialog).queryByText('تعديل')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('استرداد')).not.toBeInTheDocument()
    expect(screen.queryByText('120')).not.toBeInTheDocument()
  })

  it('ends virtual recurrence with the anchor id and refreshes schedule', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockedListBookingSlots
      .mockResolvedValueOnce(
        makeSlotsResponse([
          makeSlot({
            date: '2026-09-01',
            start_time: '20:00',
            end_time: '21:00',
            slot_status: 'RECURRING_RESERVED',
            is_available: false,
            booking: null,
            recurring_anchor_booking_id: 120,
            recurring_context: {
              anchor_booking_id: 120,
              customer_name: 'أحمد محمد',
              customer_phone: '+201012345678',
              recurrence_status: 'ACTIVE',
            },
          }),
        ]),
      )
      .mockResolvedValueOnce(
        makeSlotsResponse([
          makeSlot({
            date: '2026-09-01',
            start_time: '20:00',
            end_time: '21:00',
            slot_status: 'FREE',
            is_available: true,
            can_start_recurring: true,
          }),
        ]),
      )
    mockedEndBookingRecurrence.mockResolvedValueOnce(
      bookingFixture({
        id: 120,
        court: 7,
        start_time: '2026-08-25T20:00:00',
        end_time: '2026-08-25T21:00:00',
        status: 'CONFIRMED',
      }),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )
    await user.click(
      await screen.findByRole('button', { name: '8:00 م محجوز' }),
    )

    const dialog = await screen.findByRole('dialog', { name: 'تفاصيل المعاد' })
    await user.click(
      within(dialog).getByRole('button', { name: 'إيقاف الحجز الأسبوعي' }),
    )

    const confirmDialog = await screen.findByRole('dialog', {
      name: 'إيقاف الحجز الأسبوعي؟',
    })
    expect(
      within(confirmDialog).getByText(
        'الحجز الحالي هيفضل زي ما هو، لكن المعاد مش هيتحجز تلقائيًا في الأسابيع الجاية.',
      ),
    ).toBeInTheDocument()
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'إيقاف الحجز الأسبوعي' }),
    )

    await waitFor(() => {
      expect(mockedEndBookingRecurrence).toHaveBeenCalledWith(
        'nasr-club',
        120,
      )
    })
    await waitFor(() => {
      expect(mockedListBookingSlots).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByText('تم إيقاف الحجز الأسبوعي'))
      .toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'تفاصيل المعاد' }))
      .not.toBeInTheDocument()
  })

  it('refreshes safely when ending a stale virtual recurrence fails', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockedListBookingSlots
      .mockResolvedValueOnce(
        makeSlotsResponse([
          makeSlot({
            date: '2026-09-01',
            start_time: '20:00',
            end_time: '21:00',
            slot_status: 'RECURRING_RESERVED',
            is_available: false,
            booking: null,
            recurring_anchor_booking_id: 120,
            recurring_context: {
              anchor_booking_id: 120,
              customer_name: 'أحمد محمد',
              customer_phone: '+201012345678',
              recurrence_status: 'ACTIVE',
            },
          }),
        ]),
      )
      .mockResolvedValueOnce(
        makeSlotsResponse([
          makeSlot({
            date: '2026-09-01',
            start_time: '20:00',
            end_time: '21:00',
            slot_status: 'FREE',
            is_available: true,
          }),
        ]),
      )
    mockedEndBookingRecurrence.mockRejectedValueOnce(
      new ApiClientError('التكرار الأسبوعي للحجز ده مش نشط.', 400, {
        code: 'BOOKING_RECURRENCE_NOT_ACTIVE',
        requestId: 'req-1',
      }),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )
    await user.click(
      await screen.findByRole('button', { name: '8:00 م محجوز' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'تفاصيل المعاد' })
    await user.click(
      within(dialog).getByRole('button', { name: 'إيقاف الحجز الأسبوعي' }),
    )
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'إيقاف الحجز الأسبوعي؟',
    })
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'إيقاف الحجز الأسبوعي' }),
    )

    await waitFor(() => {
      expect(mockedListBookingSlots).toHaveBeenCalledTimes(2)
    })
    expect(
      await screen.findByText('التكرار الأسبوعي للحجز ده مش نشط.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'تفاصيل المعاد' }))
      .not.toBeInTheDocument()
  })

  it('keeps FREE recurrence-capable slots distinct from RECURRING_RESERVED', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockedListBookingSlots.mockResolvedValueOnce(
      makeSlotsResponse([
        makeSlot({
          start_time: '09:00',
          end_time: '10:00',
          can_start_recurring: true,
        }),
      ]),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )
    await user.click(
      await screen.findByRole('button', {
        name: '9:00 ص متاح متاح للتثبيت أسبوعيًا',
      }),
    )

    expect(screen.getByRole('dialog', { name: 'حجز جديد' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'تفاصيل المعاد' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /ثبّت نفس الموعد كل أسبوع/ }))
      .not.toBeDisabled()
  })

  it('opens BookingActionSheet for an actual recurring Booking row', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockedListBookingSlots.mockResolvedValueOnce(
      makeSlotsResponse([
        makeSlot({
          start_time: '09:00',
          end_time: '10:00',
          slot_status: 'CONFIRMED',
          is_available: false,
          booking: {
            id: 77,
            status: 'CONFIRMED',
            status_label: 'مؤكد',
            customer_name: 'عميل الموعد الأسبوعي',
            customer_phone: '+201000000077',
            total_booking_value: '250.00',
            total_paid_amount: '250.00',
            remaining_amount: '0.00',
            is_recurring: true,
            recurrence_status: 'ACTIVE',
          },
          label: 'مؤكد',
        }),
      ]),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )
    await user.click(
      await screen.findByRole('button', { name: '9:00 ص العربون مدفوع حجز متكرر' }),
    )

    expect(mockedGetBooking).not.toHaveBeenCalled()
    expect(
      await screen.findByRole('heading', { name: 'عميل الموعد الأسبوعي' }),
    ).toBeInTheDocument()
    expect(screen.getByText('↻ حجز أسبوعي')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'تفاصيل المعاد' }))
      .not.toBeInTheDocument()
  })

  it('ends recurrence through the booking action endpoint', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockedListBookingSlots.mockResolvedValueOnce(
      makeSlotsResponse([
        makeSlot({
          start_time: '09:00',
          end_time: '10:00',
          slot_status: 'CONFIRMED',
          is_available: false,
          booking: {
            id: 77,
            status: 'CONFIRMED',
            status_label: 'مؤكد',
            customer_name: 'عميل الموعد الأسبوعي',
            customer_phone: '+201000000077',
            total_booking_value: '250.00',
            total_paid_amount: '250.00',
            remaining_amount: '0.00',
            is_recurring: true,
            recurrence_status: 'ACTIVE',
          },
          label: 'مؤكد',
        }),
      ]),
    )
    mockedEndBookingRecurrence.mockResolvedValueOnce(
      bookingFixture({
        id: 77,
        court: 7,
        start_time: `${getEgyptDateValue()}T09:00:00`,
        end_time: `${getEgyptDateValue()}T10:00:00`,
        status: 'CONFIRMED',
      }),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(
      await screen.findByRole('button', {
        name: '9:00 ص العربون مدفوع حجز متكرر',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'إيقاف الحجز الأسبوعي' }))
    const stopButtons = screen.getAllByRole('button', {
      name: 'إيقاف الحجز الأسبوعي',
    })
    await user.click(stopButtons.at(-1)!)

    await waitFor(() => {
      expect(mockedEndBookingRecurrence).toHaveBeenCalledWith('nasr-club', 77)
    })
  })

  it('reloads backend slots after payment and hold release actions', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '6:00 ص بانتظار العربون' }))
    await user.click(
      screen.getByRole('button', { name: 'سجّل العربون وأكّد الحجز' }),
    )
    await user.type(screen.getByLabelText('المبلغ'), '100')
    await user.click(screen.getByRole('button', { name: 'تسجيل العربون' }))

    await waitFor(() => {
      expect(mockedCreateTransaction).toHaveBeenCalled()
      expect(mockedListBookingSlots).toHaveBeenCalledTimes(2)
    })

    await user.click(await screen.findByRole('button', { name: '6:00 ص بانتظار العربون' }))
    await user.click(screen.getByText('••• خيارات أخرى'))
    await user.click(screen.getByRole('button', { name: 'إلغاء الحجز' }))

    await waitFor(() => {
      expect(mockedCancelBooking).toHaveBeenCalledWith('nasr-club', 12, {
        reason: 'إلغاء الحجز المؤقت',
        notes: 'تم إلغاء الحجز من لوحة الحجز',
      })
      expect(mockedListBookingSlots).toHaveBeenCalledTimes(3)
    })
  })

  it('reloads backend slots after cancel, complete, and no-show actions', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockedListBookingSlots.mockResolvedValue(
      makeSlotsResponse([
        makeSlot({
          start_time: '01:00',
          end_time: '02:00',
          slot_status: 'CONFIRMED',
          is_available: false,
          label: 'مؤكد',
        }),
      ]),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '1:00 ص العربون مدفوع' }))
    await user.click(screen.getByText('••• خيارات أخرى'))
    await user.click(screen.getByRole('button', { name: 'إلغاء الحجز' }))
    await chooseAppSelectOption(
      user,
      screen.getByLabelText('سبب الإلغاء'),
      'العميل ألغى',
    )
    await user.click(screen.getByRole('button', { name: 'إلغاء الحجز' }))
    await waitFor(() => expect(mockedListBookingSlots).toHaveBeenCalledTimes(2))

    await user.click(await screen.findByRole('button', { name: '1:00 ص العربون مدفوع' }))
    await user.click(screen.getByRole('button', { name: 'تم اللعب' }))
    await user.click(screen.getByRole('button', { name: 'تأكيد إكمال الحجز' }))
    await waitFor(() => expect(mockedListBookingSlots).toHaveBeenCalledTimes(3))

    await user.click(await screen.findByRole('button', { name: '1:00 ص العربون مدفوع' }))
    await user.click(screen.getByText('••• خيارات أخرى'))
    await user.click(screen.getByRole('button', { name: 'عدم حضور' }))
    await chooseAppSelectOption(
      user,
      screen.getByLabelText('سبب عدم الحضور'),
      'لم يحضر العميل',
    )
    await user.click(screen.getByRole('button', { name: 'تأكيد عدم الحضور' }))
    await waitFor(() => expect(mockedListBookingSlots).toHaveBeenCalledTimes(4))

    expect(mockedCancelBooking).toHaveBeenCalled()
    expect(mockedCompleteBooking).toHaveBeenCalled()
    expect(mockedMarkBookingNoShow).toHaveBeenCalled()
  })

  it('reloads slots when date or court changes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      currentUser: null,
      selectedMembership: {
        id: 10,
        role: 'OWNER',
        club: {
          id: 1,
          name: 'نادي النصر',
          slug: 'nasr-club',
          city: 'ASSIUT',
          is_active: true,
        },
        court: null,
      },
      role: 'OWNER',
    })
    mockedListCourts.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 7,
          club: 1,
          name: 'ملعب 1',
          sport_type: 'FOOTBALL',
          default_price: '250.00',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 12,
        },
        {
          id: 8,
          club: 1,
          name: 'ملعب 2',
          sport_type: 'FOOTBALL',
          default_price: '250.00',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 12,
        },
      ]),
    )

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    )

    await user.click(
      screen.getByRole('button', { name: /الثلاثاء، ٢١ يوليو ٢٠٢٦/ }),
    )

    await waitFor(() => {
      expect(mockedListBookingSlots).toHaveBeenCalledWith('nasr-club', {
        court: 7,
        date: '2026-07-21',
      })
    })

    await chooseAppSelectOption(user, screen.getByLabelText('الملعب'), 'ملعب 2')

    await waitFor(() => {
      expect(mockedListBookingSlots).toHaveBeenCalledWith('nasr-club', {
        court: 8,
        date: '2026-07-21',
      })
    })
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1)
  })
})
