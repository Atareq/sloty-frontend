import { render, screen, waitFor } from '@testing-library/react'
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
const defaultFilters = {
  date: '2026-07-21',
}

function paginatedResponse<T>(results: T[]) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

function renderBookingsPage(initialEntry = '/bookings') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <BookingsListPage />
    </MemoryRouter>,
  )
}

function mockAuth(selectedClubSlug: string | null = 'nasr-club') {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: null,
    selectedClubSlug,
    selectedMembership: selectedClubSlug
      ? {
          id: 10,
          role: 'MANAGER',
          club: {
            id: 1,
            name: 'نادي النصر',
            slug: selectedClubSlug,
            city: 'ASSIUT',
            is_active: true,
          },
          court: null,
        }
      : null,
    role: 'MANAGER',
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

  it('defaults to today when no query filters exist', async () => {
    mockedListBookings.mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage()

    expect(
      await screen.findByText('لا توجد حجوزات مطابقة للفلاتر الحالية'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('تاريخ محدد')).toHaveValue('2026-07-21')
    expect(mockedListBookings).toHaveBeenCalledWith(
      'nasr-club',
      defaultFilters,
    )
  })

  it('respects needs_action summary redirect filters', async () => {
    mockedListBookings.mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage('/bookings?needs_action=true')

    expect(
      await screen.findByRole('button', { name: 'إزالة فلتر تحتاج إجراء' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('تاريخ محدد')).toHaveValue('')
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

  it('applies the needs-closing quick filter for today', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage()

    await user.click(
      await screen.findByRole('button', { name: 'تحتاج إغلاق' }),
    )

    expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
      date: '2026-07-21',
      needs_action: 'true',
    })
  })

  it('applies the HOLD quick filter for today', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage()

    await user.click(await screen.findByRole('button', { name: 'بانتظار العربون' }))

    expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
      date: '2026-07-21',
      status: 'HOLD',
    })
  })

  it('opens advanced filters in a filter sheet', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings.mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage()

    await user.click(await screen.findByRole('button', { name: 'فلترة' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('فلترة الحجوزات')).toBeInTheDocument()
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

    await screen.findByText('لا توجد حجوزات مطابقة للفلاتر الحالية')

    await chooseAppSelectOption(user, screen.getByLabelText('الملعب'), 'ملعب 1')
    await user.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))

    expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
      court: '3',
      date: '2026-07-21',
    })
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

  it('resets filters to today', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage('/bookings?needs_action=true')

    await screen.findByText('لا توجد حجوزات مطابقة للفلاتر الحالية')
    await user.click(screen.getByRole('button', { name: 'إعادة ضبط' }))

    expect(screen.getByLabelText('تاريخ محدد')).toHaveValue('2026-07-21')
    expect(mockedListBookings).toHaveBeenLastCalledWith(
      'nasr-club',
      defaultFilters,
    )
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

    expect(await screen.findByText('#30')).toBeInTheDocument()
    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('+201000000000')).toBeInTheDocument()
    expect(screen.getAllByText('مكتمل')).not.toHaveLength(0)
    expect(
      screen.queryByRole('button', { name: 'إضافة دفع' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إكمال الحجز' }),
    ).not.toBeInTheDocument()
  })

  it('shows a financial warning for completed bookings with remaining amount', async () => {
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

    expect(
      await screen.findByText('حجز مكتمل به مبلغ متبقي — يحتاج مراجعة'),
    ).toBeInTheDocument()
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
      await screen.findByRole('button', { name: 'مراجعة الحجز #32' }),
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('حجز مؤكد')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إضافة دفعة' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إكمال الحجز' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تسجيل عدم حضور' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إلغاء الحجز' })).toBeInTheDocument()
  })

  it('opens payment flow instead of completing unpaid bookings', async () => {
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
      await screen.findByRole('button', { name: 'مراجعة الحجز #36' }),
    )
    await user.click(screen.getByRole('button', { name: 'إكمال الحجز' }))

    expect(
      screen.getByText(
        'يوجد مبلغ متبقي على هذا الحجز. يجب تسجيل الدفعة أولًا قبل إكمال الحجز.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تسجيل الدفعة' }))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

    expect(mockedCompleteBooking).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'إضافة دفعة' }))
      .toBeInTheDocument()
    expect(screen.getByText('حجز #36')).toBeInTheDocument()
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
            start_time: '2026-07-21T18:00:00Z',
            end_time: '2026-07-21T19:00:00Z',
            status: 'CONFIRMED' as const,
            paid_amount: '300.00',
            remaining_amount: '0.00',
          },
        ]),
      )
      .mockResolvedValueOnce(paginatedResponse([]))
    mockedCompleteBooking.mockResolvedValueOnce({
      id: 37,
      court: 3,
      customer_name: 'ليلى حسن',
      start_time: '2026-07-21T18:00:00Z',
      end_time: '2026-07-21T19:00:00Z',
      status: 'COMPLETED' as const,
    })

    renderBookingsPage('/bookings?date=2026-07-21&status=CONFIRMED')

    await user.click(
      await screen.findByRole('button', { name: 'مراجعة الحجز #37' }),
    )
    await user.click(screen.getByRole('button', { name: 'إكمال الحجز' }))
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
          start_time: '2026-07-21T18:00:00Z',
          end_time: '2026-07-21T19:00:00Z',
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
      await screen.findByRole('button', { name: 'مراجعة الحجز #38' }),
    )
    await user.click(screen.getByRole('button', { name: 'إكمال الحجز' }))
    await user.click(
      screen.getByRole('button', { name: 'تأكيد إكمال الحجز' }),
    )

    expect(await screen.findByText('يجب تسجيل المتبقي أولًا'))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تسجيل الدفعة' }))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

    expect(screen.getByRole('heading', { name: 'إضافة دفعة' }))
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

    renderBookingsPage('/bookings?date=2026-07-21&status=CONFIRMED')

    await user.click(
      await screen.findByRole('button', { name: 'مراجعة الحجز #33' }),
    )
    await user.click(screen.getByRole('button', { name: 'إضافة دفعة' }))
    await user.type(screen.getByLabelText('المبلغ'), '50')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

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
        status: 'CONFIRMED',
      })
    })
    expect(await screen.findByText('تم تسجيل الدفعة بنجاح')).toBeInTheDocument()
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

    expect(await screen.findByText('للعرض فقط')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'مراجعة الحجز #34' }))

    expect(
      screen.getByText('هذا الحجز مكتمل ومغلق للعرض فقط'),
    ).toBeInTheDocument()
    expect(screen.getByText('عرض التفاصيل فقط')).toBeInTheDocument()
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
    mockedCancelBooking.mockResolvedValueOnce({
      id: 35,
      court: 3,
      customer_name: 'مروان سمير',
      start_time: '2026-07-21T18:00:00Z',
      end_time: '2026-07-21T19:00:00Z',
      status: 'CANCELLED' as const,
    })

    renderBookingsPage('/bookings?date=2026-07-21&status=HOLD')

    await user.click(
      await screen.findByRole('button', { name: 'مراجعة الحجز #35' }),
    )
    await user.click(screen.getByRole('button', { name: 'تحرير الموعد' }))

    await waitFor(() => {
      expect(mockedCancelBooking).toHaveBeenCalledWith('nasr-club', 35, {
        reason: 'تحرير الحجز المؤقت',
        notes: 'تم تحرير الموعد من سجل الحجوزات',
      })
    })
    await waitFor(() => {
      expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
        date: '2026-07-21',
        status: 'HOLD',
      })
    })
    expect(await screen.findByText('تم تحرير الموعد بنجاح')).toBeInTheDocument()
  })
})
