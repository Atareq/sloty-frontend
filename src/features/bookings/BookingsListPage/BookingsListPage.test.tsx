import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { chooseAppSelectOption } from '../../../test/appSelectTestUtils'
import { listCourts } from '../../courts/courtsApi'
import {
  cancelBooking,
  completeBooking,
  previewBookingCancellation,
} from '../../schedule/scheduleApi'
import { createTransaction } from '../../transactions/transactionsApi'
import { listBookings } from '../bookingsApi'
import type { Booking } from '../bookings.types'
import { BookingsListPage } from './BookingsListPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../bookingsApi', () => ({
  listBookings: vi.fn(),
}))

vi.mock('../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

vi.mock('../../schedule/scheduleApi', () => ({
  cancelBooking: vi.fn(),
  completeBooking: vi.fn(),
  markBookingNoShow: vi.fn(),
  previewBookingCancellation: vi.fn(),
}))

vi.mock('../../transactions/transactionsApi', () => ({
  createTransaction: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListBookings = vi.mocked(listBookings)
const mockedListCourts = vi.mocked(listCourts)
const mockedCancelBooking = vi.mocked(cancelBooking)
const mockedCompleteBooking = vi.mocked(completeBooking)
const mockedPreviewBookingCancellation = vi.mocked(previewBookingCancellation)
const mockedCreateTransaction = vi.mocked(createTransaction)
function bookingFixture(
  booking: Omit<Booking, 'is_recurring' | 'recurrence_status' | 'previous_recurring_booking_id' | 'next_recurring_booking_id'>,
): Booking {
  return {
    is_recurring: false,
    recurrence_status: null,
    previous_recurring_booking_id: null,
    next_recurring_booking_id: null,
    ...booking,
  }
}

function paginatedResponse(
  results: Array<Parameters<typeof bookingFixture>[0]>,
) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results: results.map(bookingFixture),
  }
}

function renderBookingsPage(initialEntry = '/bookings') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <BookingsListPage />
    </MemoryRouter>,
  )
}

function mockAuth(
  selectedClubSlug: string | null = 'nasr-club',
  role: 'MANAGER' | 'STAFF' = 'MANAGER',
) {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: null,
    selectedClubSlug,
    selectedMembership: selectedClubSlug
      ? {
          id: 10,
          role,
          club: {
            id: 1,
            name: 'نادي النصر',
            slug: selectedClubSlug,
            city: 'ASSIUT',
            is_active: true,
          },
          court: role === 'STAFF' ? { id: 3, name: 'ملعب 1' } : null,
        }
      : null,
    role,
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
}

describe('BookingsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-07-21T10:00:00Z'))
    mockedListCourts.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 3,
          club: 1,
          name: 'ملعب 1',
          sport_type: 'football',
          default_price: '300.00',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 2,
        },
        {
          id: 4,
          club: 1,
          name: 'ملعب متوقف',
          sport_type: 'football',
          default_price: '300.00',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
          is_active: false,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 2,
        },
      ],
    })
    mockedPreviewBookingCancellation.mockResolvedValue({
      booking_id: 10,
      previewed_at: '2026-07-21T10:00:00Z',
      booking_start: '2026-07-21T18:00:00Z',
      paid_amount: '100.00',
      minimum_deposit: '100.00',
      refund_notice_days: 3,
      refund_deadline: '2026-07-18T18:00:00Z',
      full_refund: false,
      refund_amount: '0.00',
      retained_amount: '100.00',
      can_cancel: true,
    })
    mockAuth()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads unrestricted paginated history without a silent date default', async () => {
    mockedListBookings.mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage()

    expect(
      await screen.findByText('مفيش حجوزات لعرضها.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('تاريخ محدد')).not.toBeInTheDocument()
    expect(mockedListBookings).toHaveBeenCalledWith('nasr-club', {})
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'القادمة فقط' }))
      .not.toBeInTheDocument()
  })

  it('respects needs_action summary redirect filters', async () => {
    mockedListBookings.mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage('/bookings?needs_action=true')

    expect(
      await screen.findByRole('button', { name: 'إزالة فلتر تحتاج إجراء' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'تحتاج إجراء' })).toBeChecked()
    expect(mockedListBookings).toHaveBeenCalledWith('nasr-club', {
      needs_action: 'true',
    })
  })

  it('shows date and HOLD chips from URL filters', async () => {
    mockedListBookings.mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage('/bookings?date=2026-07-21&status=HOLD')

    expect(
      await screen.findByRole('button', {
        name: 'إزالة فلتر تاريخ 2026-07-21',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'إزالة فلتر بانتظار العربون' }),
    ).toBeInTheDocument()
    expect(mockedListBookings).toHaveBeenCalledWith('nasr-club', {
      date: '2026-07-21',
      status: 'HOLD',
    })
  })

  it('removes chips and reloads with remaining filters', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage('/bookings?date=2026-07-21&status=HOLD')

    await user.click(
      await screen.findByRole('button', { name: 'إزالة فلتر بانتظار العربون' }),
    )

    expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
      date: '2026-07-21',
    })
    expect(
      screen.queryByRole('button', { name: 'إزالة فلتر بانتظار العربون' }),
    ).not.toBeInTheDocument()
  })

  it('applies the primary review toggles immediately and preserves filters', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage()

    await screen.findByText('مفيش حجوزات لعرضها.')
    await user.click(screen.getByRole('checkbox', { name: 'تحتاج إجراء' }))

    expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
      needs_action: 'true',
    })
    await user.click(screen.getByRole('checkbox', { name: 'بها مبلغ متبقي' }))

    expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
      needs_action: 'true',
      has_remaining_amount: 'true',
    })
  })

  it('opens advanced filters in a filter sheet', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings.mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage()

    await user.click(await screen.findByRole('button', { name: 'فلاتر إضافية' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByLabelText('الملعب')).not.toHaveLength(0)
  })

  it('filters by court ID while displaying the court name', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage()

    await screen.findByText('مفيش حجوزات لعرضها.')
    await user.click(screen.getByRole('button', { name: 'فلاتر إضافية' }))
    await chooseAppSelectOption(user, screen.getByLabelText('الملعب'), 'ملعب 1')
    await user.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))

    expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
      court: '3',
    })
  })

  it('combines operational checkbox filters using the confirmed query contract', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings.mockResolvedValue(paginatedResponse([]))

    renderBookingsPage('/bookings?needs_action=true&has_remaining_amount=true')

    await screen.findByText('ملقيناش حجوزات مطابقة للفلاتر الحالية.')
    await user.click(screen.getByRole('button', { name: 'فلاتر إضافية' }))
    await user.click(screen.getByRole('checkbox', { name: 'متأخرة' }))
    await user.click(screen.getByRole('checkbox', { name: 'انتهى وقتها' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'انتظار قاربت على الانتهاء' }),
    )
    expect(screen.getByLabelText('الملعب')).toBeInTheDocument()
    expect(screen.getByLabelText('الحالة')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))

    expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
      ended: 'true',
      hold_expiring: 'true',
      needs_action: 'true',
      overdue: 'true',
      has_remaining_amount: 'true',
    })
  })

  it('removes only the selected operational filter chip', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage('/bookings?needs_action=true&overdue=true')

    await user.click(
      await screen.findByRole('button', { name: 'إزالة فلتر تحتاج إجراء' }),
    )

    expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
      overdue: 'true',
    })
    expect(screen.getByRole('button', { name: 'إزالة فلتر وقتها عدى' }))
      .toBeInTheDocument()
  })

  it('shows active court chips with loaded court names', async () => {
    mockedListBookings.mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage('/bookings?court=3')

    expect(
      await screen.findByRole('button', { name: 'إزالة فلتر ملعب 1' }),
    ).toBeInTheDocument()
    expect(mockedListBookings).toHaveBeenCalledWith('nasr-club', {
      court: '3',
    })
  })

  it('resets advanced filters while preserving primary review toggles', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage('/bookings?needs_action=true&status=HOLD&date=2026-07-21')

    await screen.findByText('ملقيناش حجوزات مطابقة للفلاتر الحالية.')
    await user.click(screen.getByRole('button', { name: 'فلاتر إضافية' }))
    await user.click(screen.getByRole('button', { name: 'إعادة ضبط' }))

    expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
      needs_action: 'true',
    })
  })

  it('keeps Staff Court scope backend-owned and ignores URL overrides', async () => {
    mockAuth('nasr-club', 'STAFF')
    mockedListBookings.mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage('/bookings?court=4&status=HOLD')

    await screen.findByText('ملقيناش حجوزات مطابقة للفلاتر الحالية.')
    expect(mockedListCourts).not.toHaveBeenCalled()
    expect(mockedListBookings).toHaveBeenCalledWith('nasr-club', {
      status: 'HOLD',
    })
    expect(screen.queryByRole('button', { name: /ملعب/ })).not.toBeInTheDocument()
  })

  it('preserves filters while navigating server-side pages', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    const booking = bookingFixture({
      id: 50,
      court: 3,
      customer_name: 'سارة محمد',
      start_time: '2026-07-21T18:00:00Z',
      end_time: '2026-07-21T19:00:00Z',
      status: 'CONFIRMED' as const,
    })
    mockedListBookings
      .mockResolvedValueOnce({
        count: 24,
        next: '/bookings?page=2',
        previous: null,
        results: [booking],
      })
      .mockResolvedValueOnce({
        count: 24,
        next: null,
        previous: '/bookings',
        results: [booking],
      })

    renderBookingsPage('/bookings?status=CONFIRMED')

    await user.click(await screen.findByRole('button', { name: 'التالي' }))

    expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
      page: '2',
      status: 'CONFIRMED',
    })
    expect(screen.getByText('صفحة 2 · 24 حجز')).toBeInTheDocument()
  })

  it('moves back one page when a paginated mutation result becomes empty', async () => {
    mockedListBookings
      .mockResolvedValueOnce({
        count: 20,
        next: null,
        previous: '/bookings?page=2',
        results: [],
      })
      .mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage('/bookings?status=HOLD&page=3')

    await waitFor(() => {
      expect(mockedListBookings).toHaveBeenCalledTimes(2)
      expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
        page: '2',
        status: 'HOLD',
      })
    })
    expect(await screen.findByText('ملقيناش حجوزات مطابقة للفلاتر الحالية.'))
      .toBeInTheDocument()
  })

  it('shows no selected club message', async () => {
    mockAuth(null)

    renderBookingsPage()

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض الحجوزات'),
    ).toBeInTheDocument()
    expect(mockedListBookings).not.toHaveBeenCalled()
  })

  it('renders booking details without normal action buttons', async () => {
    mockedListBookings.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 30,
          court: 3,
          customer_name: 'أحمد علي',
          customer_phone: '+201000000000',
          start_time: '2026-07-21T18:00:00Z',
          end_time: '2026-07-21T19:00:00Z',
          status: 'COMPLETED' as const,
          total_price: '300.00',
          paid_amount: '300.00',
          remaining_amount: '0.00',
        },
      ]),
    )

    renderBookingsPage()

    expect(await screen.findByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('+201000000000')).toBeInTheDocument()
    expect(screen.getAllByText('مكتمل')).not.toHaveLength(0)
    expect(
      screen.queryByRole('button', { name: 'إضافة دفع' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إكمال الحجز' }),
    ).not.toBeInTheDocument()
  })

  it('keeps financial details out of compact history cards', async () => {
    mockedListBookings.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 31,
          court: 3,
          customer_name: 'أحمد علي',
          start_time: '2026-07-21T18:00:00Z',
          end_time: '2026-07-21T19:00:00Z',
          status: 'COMPLETED' as const,
          paid_amount: '200.00',
          remaining_amount: '100.00',
        },
      ]),
    )

    renderBookingsPage()

    expect(await screen.findByText('أحمد علي')).toBeInTheDocument()
    expect(screen.queryByText('100.00')).not.toBeInTheDocument()
    expect(screen.queryByText('حجز مكتمل به مبلغ متبقي — يحتاج مراجعة'))
      .not.toBeInTheDocument()
  })

  it('opens the reusable action sheet from a confirmed booking card', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 32,
          court: 3,
          customer_name: 'ليلى حسن',
          start_time: '2026-07-21T18:00:00Z',
          end_time: '2026-07-21T19:00:00Z',
          status: 'CONFIRMED' as const,
          paid_amount: '100.00',
          remaining_amount: '200.00',
        },
      ]),
    )

    renderBookingsPage('/bookings?date=2026-07-21&status=CONFIRMED')

    await user.click(
      await screen.findByRole('button', { name: 'مراجعة حجز ليلى حسن' }),
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('متبقي 200.00 ج.م')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'حصّل 200.00 ج.م' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إكمال' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'عدم حضور' }))
      .not.toBeInTheDocument()
    await user.click(screen.getByText('••• خيارات أخرى'))
    await user.click(screen.getByRole('button', { name: 'إلغاء الحجز' }))
    expect(await screen.findByRole('heading', { name: 'إلغاء الحجز؟' }))
      .toBeInTheDocument()

    const cancelDialogs = screen.getAllByRole('dialog')
    await user.click(
      within(cancelDialogs.at(-1) as HTMLElement).getByRole('button', {
        name: 'إغلاق',
      }),
    )
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'ليلى حسن' }))
      .toBeInTheDocument()
  })

  it('opens the remaining-payment flow directly for unpaid bookings', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 36,
          court: 3,
          customer_name: 'ليلى حسن',
          start_time: '2026-07-21T18:00:00Z',
          end_time: '2026-07-21T19:00:00Z',
          status: 'CONFIRMED' as const,
          paid_amount: '100.00',
          remaining_amount: '200.00',
        },
      ]),
    )

    renderBookingsPage('/bookings?date=2026-07-21&status=CONFIRMED')

    await user.click(
      await screen.findByRole('button', { name: 'مراجعة حجز ليلى حسن' }),
    )
    await user.click(screen.getByRole('button', { name: 'حصّل 200.00 ج.م' }))

    expect(mockedCompleteBooking).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'تحصيل المبلغ المتبقي' }))
      .toBeInTheDocument()
    expect(screen.queryByText('حجز #36')).not.toBeInTheDocument()

    const paymentDialogs = screen.getAllByRole('dialog')
    await user.click(
      within(paymentDialogs.at(-1) as HTMLElement).getByRole('button', {
        name: 'إغلاق',
      }),
    )
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'ليلى حسن' }))
      .toBeInTheDocument()
  })

  it('completes fully paid bookings from the confirmation sheet', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings
      .mockResolvedValueOnce(
        paginatedResponse([
          {
            id: 37,
            court: 3,
            customer_name: 'ليلى حسن',
            start_time: '2026-07-21T08:00:00Z',
            end_time: '2026-07-21T09:00:00Z',
            status: 'CONFIRMED' as const,
            paid_amount: '300.00',
            remaining_amount: '0.00',
          },
        ]),
      )
      .mockResolvedValueOnce(paginatedResponse([]))
    mockedCompleteBooking.mockResolvedValueOnce(bookingFixture({
      id: 37,
      court: 3,
      customer_name: 'ليلى حسن',
      start_time: '2026-07-21T08:00:00Z',
      end_time: '2026-07-21T09:00:00Z',
      status: 'COMPLETED' as const,
    }))

    renderBookingsPage('/bookings?date=2026-07-21&status=CONFIRMED')

    await user.click(
      await screen.findByRole('button', { name: 'مراجعة حجز ليلى حسن' }),
    )
    await user.click(screen.getByRole('button', { name: 'إكمال' }))
    await user.click(
      screen.getByRole('button', { name: 'تأكيد إكمال الحجز' }),
    )

    await waitFor(() => {
      expect(mockedCompleteBooking).toHaveBeenCalledWith('nasr-club', 37)
    })
    await waitFor(() => {
      expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
        date: '2026-07-21',
        status: 'CONFIRMED',
      })
    })
  })

  it('uses backend full-payment errors to guide users to payment', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 38,
          court: 3,
          customer_name: 'ليلى حسن',
          start_time: '2026-07-21T08:00:00Z',
          end_time: '2026-07-21T09:00:00Z',
          status: 'CONFIRMED' as const,
          paid_amount: '300.00',
          remaining_amount: '0.00',
        },
      ]),
    )
    mockedCompleteBooking.mockRejectedValueOnce(
      new ApiClientError('يجب تسجيل المتبقي أولًا', 409, {
        code: 'BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT',
        details: { booking_id: 38, remaining_amount: '50.00' },
      }),
    )

    renderBookingsPage('/bookings?date=2026-07-21&status=CONFIRMED')

    await user.click(
      await screen.findByRole('button', { name: 'مراجعة حجز ليلى حسن' }),
    )
    await user.click(screen.getByRole('button', { name: 'إكمال' }))
    await user.click(
      screen.getByRole('button', { name: 'تأكيد إكمال الحجز' }),
    )

    expect(await screen.findByText('لازم تحصّل المبلغ المتبقي قبل إكمال الحجز.'))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تسجيل الدفعة' }))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

    expect(screen.getByRole('heading', { name: 'تحصيل المبلغ المتبقي' }))
      .toBeInTheDocument()
  })

  it('records a payment from the action sheet and reloads current filters', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings
      .mockResolvedValueOnce(
        paginatedResponse([
          {
            id: 33,
            court: 3,
            customer_name: 'ليلى حسن',
            start_time: '2026-07-21T18:00:00Z',
            end_time: '2026-07-21T19:00:00Z',
            status: 'CONFIRMED' as const,
            paid_amount: '100.00',
            remaining_amount: '200.00',
          },
        ]),
      )
      .mockResolvedValueOnce(paginatedResponse([]))
    mockedCreateTransaction.mockResolvedValueOnce({
      id: 900,
      booking: 33,
      amount: '50.00',
      payment_method: 'CASH',
      created: '2026-07-21T18:10:00Z',
      is_cancelled: false,
    })

    renderBookingsPage('/bookings?date=2026-07-21&status=CONFIRMED&page=3')

    await user.click(
      await screen.findByRole('button', { name: 'مراجعة حجز ليلى حسن' }),
    )
    await user.click(screen.getByRole('button', { name: 'حصّل 200.00 ج.م' }))
    await user.type(screen.getByLabelText('المبلغ'), '50')
    await user.click(screen.getByRole('button', { name: 'تسجيل التحصيل' }))

    await waitFor(() => {
      expect(mockedCreateTransaction).toHaveBeenCalledWith('nasr-club', {
        booking: 33,
        amount: '50',
        payment_method: 'CASH',
      })
    })
    await waitFor(() => {
      expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
        date: '2026-07-21',
        page: '3',
        status: 'CONFIRMED',
      })
    })
    expect(await screen.findByText('تم تسجيل التحصيل بنجاح')).toBeInTheDocument()
  })

  it('keeps completed booking cards clickable but read-only', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 34,
          court: 3,
          customer_name: 'أحمد علي',
          start_time: '2026-07-21T18:00:00Z',
          end_time: '2026-07-21T19:00:00Z',
          status: 'COMPLETED' as const,
          paid_amount: '300.00',
          remaining_amount: '0.00',
        },
      ]),
    )

    renderBookingsPage('/bookings?date=2026-07-21&status=COMPLETED')

    await user.click(
      await screen.findByRole('button', { name: 'مراجعة حجز أحمد علي' }),
    )

    expect(within(screen.getByRole('dialog')).getByText('مكتمل'))
      .toBeInTheDocument()
    expect(screen.queryByText('عرض التفاصيل فقط')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إضافة دفعة' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('إضافة حجز')).not.toBeInTheDocument()
  })

  it('frees a HOLD booking from the action sheet and reloads current filters', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings
      .mockResolvedValueOnce(
        paginatedResponse([
          {
            id: 35,
            court: 3,
            customer_name: 'مروان سمير',
            start_time: '2026-07-21T18:00:00Z',
            end_time: '2026-07-21T19:00:00Z',
            status: 'HOLD' as const,
            paid_amount: '0.00',
            remaining_amount: '300.00',
          },
        ]),
      )
      .mockResolvedValueOnce(paginatedResponse([]))
    mockedCancelBooking.mockResolvedValueOnce(bookingFixture({
      id: 35,
      court: 3,
      customer_name: 'مروان سمير',
      start_time: '2026-07-21T18:00:00Z',
      end_time: '2026-07-21T19:00:00Z',
      status: 'CANCELLED' as const,
    }))

    renderBookingsPage('/bookings?date=2026-07-21&status=HOLD')

    await user.click(
      await screen.findByRole('button', { name: 'مراجعة حجز مروان سمير' }),
    )
    await user.click(screen.getByText('••• خيارات أخرى'))
    await user.click(screen.getByRole('button', { name: 'إلغاء الحجز' }))

    await waitFor(() => {
      expect(mockedCancelBooking).toHaveBeenCalledWith('nasr-club', 35, {
        reason: 'إلغاء الحجز المؤقت',
        notes: 'تم إلغاء الحجز من سجل الحجوزات',
      })
    })
    await waitFor(() => {
      expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
        date: '2026-07-21',
        status: 'HOLD',
      })
    })
    expect(await screen.findByText('تم إلغاء الحجز بنجاح')).toBeInTheDocument()
  })
})
