import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { chooseAppSelectOption } from '../../../test/appSelectTestUtils'
import { listCopy } from '../../../shared/copy/appCopy'
import { listCourts } from '../../courts/courtsApi'
import {
  cancelBooking,
  completeBooking,
  endBookingRecurrence,
  getBooking,
  getBookingRecurrenceNext,
  listBookingSlots,
  previewBookingCancellation,
  rescheduleBooking,
  updateBookingCustomer,
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
  endBookingRecurrence: vi.fn(),
  getBooking: vi.fn(),
  getBookingRecurrenceNext: vi.fn(),
  listBookingSlots: vi.fn(),
  markBookingNoShow: vi.fn(),
  previewBookingCancellation: vi.fn(),
  rescheduleBooking: vi.fn(),
  updateBookingCustomer: vi.fn(),
}))

vi.mock('../../transactions/transactionsApi', () => ({
  createTransaction: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListBookings = vi.mocked(listBookings)
const mockedListCourts = vi.mocked(listCourts)
const mockedCancelBooking = vi.mocked(cancelBooking)
const mockedCompleteBooking = vi.mocked(completeBooking)
const mockedEndBookingRecurrence = vi.mocked(endBookingRecurrence)
const mockedGetBooking = vi.mocked(getBooking)
const mockedGetBookingRecurrenceNext = vi.mocked(getBookingRecurrenceNext)
const mockedListBookingSlots = vi.mocked(listBookingSlots)
const mockedPreviewBookingCancellation = vi.mocked(previewBookingCancellation)
const mockedRescheduleBooking = vi.mocked(rescheduleBooking)
const mockedUpdateBookingCustomer = vi.mocked(updateBookingCustomer)
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

async function expandQuickShortcuts(
  user?: { click: (element: HTMLElement) => Promise<unknown> },
) {
  const toggle = await screen.findByRole('button', {
    name: 'اختصارات البحث السريع',
  })

  if (toggle.getAttribute('aria-expanded') === 'true') {
    return
  }

  if (user) {
    await user.click(toggle)
    return
  }

  fireEvent.click(toggle)
}

async function openHistoryCard(user: { click: (element: HTMLElement) => Promise<unknown> }, name: string) {
  await user.click(await screen.findByRole('button', { name }))
  expect(await screen.findByRole('dialog', { name: 'تفاصيل الحجز' })).toBeInTheDocument()
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
    mockedGetBooking.mockImplementation(async (_clubSlug, bookingId) => {
      const id = Number(bookingId)

      for (
        let index = mockedListBookings.mock.results.length - 1;
        index >= 0;
        index -= 1
      ) {
        const result = mockedListBookings.mock.results[index]

        if (result.type !== 'return') {
          continue
        }

        const response = await result.value
        const match = response?.results?.find(
          (booking: Booking) => booking.id === id,
        )

        if (match) {
          return match
        }
      }

      return bookingFixture({
        id,
        court: 3,
        customer_name: 'عميل',
        start_time: '2026-07-21T18:00:00Z',
        end_time: '2026-07-21T19:00:00Z',
        status: 'CONFIRMED',
      })
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
      await screen.findByText('مفيش حجوزات لسه.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('تاريخ محدد')).not.toBeInTheDocument()
    expect(mockedListBookings).toHaveBeenCalledWith('nasr-club', {})
    expect(mockedGetBooking).not.toHaveBeenCalled()
    expect(
      screen.getByRole('searchbox', {
        name: 'اسم العميل أو رقم الموبايل أو ملاحظة',
      }),
    ).toHaveClass('sloty-mobile-safe-input')
    expect(
      screen.getByRole('button', { name: 'اختصارات البحث السريع' }),
    ).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByRole('checkbox', { name: 'الحجوزات القادمة فقط' }),
    ).not.toBeInTheDocument()
    await expandQuickShortcuts()
    expect(
      screen.getByRole('checkbox', { name: 'الحجوزات القادمة فقط' }),
    ).toBeInTheDocument()
  })

  it('respects needs_action summary redirect filters', async () => {
    mockedListBookings.mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage('/bookings?needs_action=true')

    expect(
      await screen.findByRole('button', { name: 'إزالة فلتر تحتاج إجراء' }),
    ).toBeInTheDocument()
    await expandQuickShortcuts()
    expect(screen.getByRole('checkbox', { name: 'تحتاج إجراء' })).toBeChecked()
    expect(mockedListBookings).toHaveBeenCalledWith('nasr-club', {
      needs_action: 'true',
    })
  })

  it('debounces unified server search, resets page, and preserves review filters', async () => {
    mockedListBookings.mockResolvedValue(paginatedResponse([]))

    renderBookingsPage('/bookings?page=5&upcoming=true')

    await screen.findByText('مفيش حجوزات مطابقة للفلاتر الحالية.')
    const searchInput = screen.getByRole('searchbox', {
      name: 'اسم العميل أو رقم الموبايل أو ملاحظة',
    })

    fireEvent.change(searchInput, { target: { value: '01012345678' } })
    await act(async () => {
      vi.advanceTimersByTime(349)
    })
    expect(mockedListBookings).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    await waitFor(() => {
      expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
        search: '01012345678',
        upcoming: 'true',
      })
    })
    expect(
      screen.getByRole('button', {
        name: 'إزالة فلتر بحث: 01012345678',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'إزالة فلتر قادمة' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('checkbox', { name: 'الحجوزات القادمة فقط' }),
    ).not.toBeInTheDocument()
  })

  it('clears the shared search draft when the Search chip is removed', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })
    mockedListBookings.mockResolvedValue(paginatedResponse([]))

    renderBookingsPage()

    await screen.findByText('مفيش حجوزات لسه.')
    const searchInput = screen.getByRole('searchbox', {
      name: 'اسم العميل أو رقم الموبايل أو ملاحظة',
    })
    await user.type(searchInput, 'أحمد')
    await act(async () => {
      vi.advanceTimersByTime(350)
    })

    const searchChip = await screen.findByRole('button', {
      name: 'إزالة فلتر بحث: أحمد',
    })
    expect(searchInput).toHaveValue('أحمد')

    await user.click(searchChip)

    expect(searchInput).toHaveValue('')
    await act(async () => {
      vi.advanceTimersByTime(700)
    })
    expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {})
    expect(
      screen.queryByRole('button', { name: 'إزالة فلتر بحث: أحمد' }),
    ).not.toBeInTheDocument()
  })

  it('keeps quick-search shortcuts clickable while a live query is present', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings.mockResolvedValue(paginatedResponse([]))

    renderBookingsPage()

    await screen.findByText('مفيش حجوزات لسه.')
    const toggle = screen.getByRole('button', {
      name: 'اختصارات البحث السريع',
    })
    const searchInput = screen.getByRole('searchbox', {
      name: 'اسم العميل أو رقم الموبايل أو ملاحظة',
    })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toBeEnabled()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('checkbox', { name: 'الحجوزات القادمة فقط' }),
    ).toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    await user.type(searchInput, 'Ahmed')

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toBeEnabled()
    expect(searchInput).toHaveFocus()
    expect(searchInput).toHaveValue('Ahmed')
    expect(
      screen.queryByRole('checkbox', { name: 'الحجوزات القادمة فقط' }),
    ).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(350)
    })

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('checkbox', { name: 'الحجوزات القادمة فقط' }),
    ).toBeInTheDocument()
    expect(searchInput).toHaveValue('Ahmed')

    await user.type(searchInput, 's')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toBeEnabled()
    expect(searchInput).toHaveFocus()
    expect(searchInput).toHaveValue('Ahmeds')
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

    await screen.findByText('مفيش حجوزات لسه.')
    await expandQuickShortcuts(user)
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

    await expandQuickShortcuts(user)
    await user.click(await screen.findByRole('button', { name: 'فلاتر إضافية' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByLabelText('الملعب')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إعادة ضبط' }))
      .toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'إغلاق' })).toHaveLength(1)
  })

  it('filters by court ID while displaying the court name', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    })

    mockedListBookings
      .mockResolvedValueOnce(paginatedResponse([]))
      .mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage()

    await screen.findByText('مفيش حجوزات لسه.')
    await expandQuickShortcuts(user)
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

    await screen.findByText('مفيش حجوزات مطابقة للفلاتر الحالية.')
    await expandQuickShortcuts(user)
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

    await screen.findByText('مفيش حجوزات مطابقة للفلاتر الحالية.')
    await expandQuickShortcuts(user)
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

    await screen.findByText('مفيش حجوزات مطابقة للفلاتر الحالية.')
    expect(mockedListCourts).not.toHaveBeenCalled()
    expect(mockedListBookings).toHaveBeenCalledWith('nasr-club', {
      court: 3,
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
    expect(await screen.findByText('مفيش حجوزات مطابقة للفلاتر الحالية.'))
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
    expect(screen.getAllByText('تم اللعب')).not.toHaveLength(0)
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

    await openHistoryCard(user, 'مراجعة حجز ليلى حسن')

    expect(mockedGetBooking).toHaveBeenCalledWith('nasr-club', 32)
    expect(await screen.findByRole('dialog', { name: 'تفاصيل الحجز' }))
      .toBeInTheDocument()
    expect(await screen.findByText('متبقي 200.00 ج.م')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'حصّل 200.00 ج.م' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تم اللعب' })).not.toBeInTheDocument()
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

    await openHistoryCard(user, 'مراجعة حجز ليلى حسن')
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

    await openHistoryCard(user, 'مراجعة حجز ليلى حسن')
    await user.click(screen.getByRole('button', { name: 'تم اللعب' }))
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

  it('sends the backend-owned recurring completion decision without a deposit amount', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const recurringBooking = {
      ...bookingFixture({
        id: 41,
        court: 3,
        customer_name: 'ليلى الأسبوعية',
        start_time: '2026-07-21T08:00:00Z',
        end_time: '2026-07-21T09:00:00Z',
        status: 'CONFIRMED',
        paid_amount: '300.00',
        remaining_amount: '0.00',
      }),
      is_recurring: true,
      recurrence_status: 'ACTIVE' as const,
    }

    mockedListBookings.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [recurringBooking],
    })
    mockedGetBookingRecurrenceNext.mockResolvedValueOnce({
      can_continue: true,
      next_start_time: '2026-09-15T08:00:00+03:00',
      next_end_time: '2026-09-15T09:00:00+03:00',
      next_total_price: '350.00',
      next_required_deposit: '0.00',
      requires_payment_reference: false,
    })
    mockedCompleteBooking.mockResolvedValueOnce({
      ...recurringBooking,
      status: 'COMPLETED',
    })

    renderBookingsPage('/bookings?date=2026-07-21')
    await openHistoryCard(user, 'مراجعة حجز ليلى الأسبوعية')
    await user.click(screen.getByRole('button', { name: 'تم اللعب' }))
    await waitFor(() => {
      expect(mockedGetBookingRecurrenceNext).toHaveBeenCalledWith('nasr-club', 41)
    })
    await user.click(
      await screen.findByRole('button', { name: 'إكمال واستمرار أسبوعيًا' }),
    )

    await waitFor(() => {
      expect(mockedCompleteBooking).toHaveBeenCalledWith('nasr-club', 41, {
        continue_recurring: true,
      })
    })
    expect(mockedCompleteBooking.mock.calls.at(-1)?.[2])
      .not.toHaveProperty('next_deposit_amount')
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

    await openHistoryCard(user, 'مراجعة حجز ليلى حسن')
    await user.click(screen.getByRole('button', { name: 'تم اللعب' }))
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

    await openHistoryCard(user, 'مراجعة حجز ليلى حسن')
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

    await openHistoryCard(user, 'مراجعة حجز أحمد علي')

    expect(within(screen.getByRole('dialog')).getByText('تم اللعب'))
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

    await openHistoryCard(user, 'مراجعة حجز مروان سمير')
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

  it('ends active recurrence from the shared details sheet and refreshes it', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const activeRecurringBooking = {
      ...bookingFixture({
        id: 40,
        court: 3,
        customer_name: 'أحمد الأسبوعي',
        start_time: '2026-07-21T08:00:00Z',
        end_time: '2026-07-21T09:00:00Z',
        status: 'CONFIRMED',
        paid_amount: '300.00',
        remaining_amount: '0.00',
      }),
      is_recurring: true,
      recurrence_status: 'ACTIVE' as const,
    }
    const endedRecurringBooking = {
      ...activeRecurringBooking,
      recurrence_status: 'ENDED' as const,
    }

    mockedListBookings.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [activeRecurringBooking],
    })
    mockedEndBookingRecurrence.mockResolvedValueOnce(endedRecurringBooking)

    renderBookingsPage('/bookings?date=2026-07-21')
    await openHistoryCard(user, 'مراجعة حجز أحمد الأسبوعي')
    await user.click(screen.getByRole('button', { name: 'إيقاف الحجز الأسبوعي' }))
    const stopButtons = screen.getAllByRole('button', {
      name: 'إيقاف الحجز الأسبوعي',
    })
    await user.click(stopButtons.at(-1)!)

    await waitFor(() => {
      expect(mockedEndBookingRecurrence).toHaveBeenCalledWith('nasr-club', 40)
    })
    expect(await screen.findByText('تم إيقاف الحجز الأسبوعي')).toBeInTheDocument()
    expect(screen.getByText('↻ حجز أسبوعي')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إيقاف الحجز الأسبوعي' }))
      .not.toBeInTheDocument()
  })

  it('edits customer fields then refetches booking detail', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const holdBooking = bookingFixture({
      id: 55,
      court: 3,
      customer_name: 'أحمد علي',
      customer_phone: '+201012345678',
      notes: 'ملاحظة قديمة',
      start_time: '2026-07-21T20:00:00Z',
      end_time: '2026-07-21T21:00:00Z',
      status: 'HOLD',
    })

    mockedListBookings
      .mockResolvedValueOnce(paginatedResponse([holdBooking]))
      .mockResolvedValueOnce(paginatedResponse([{
        ...holdBooking,
        customer_name: 'منى حسن',
        notes: 'ملاحظة جديدة',
      }]))
    mockedGetBooking
      .mockResolvedValueOnce(holdBooking)
      .mockResolvedValueOnce(holdBooking)
      .mockResolvedValueOnce({
        ...holdBooking,
        customer_name: 'منى حسن',
        notes: 'ملاحظة جديدة',
      })
    mockedUpdateBookingCustomer.mockResolvedValueOnce({
      customer_name: 'منى حسن',
      customer_phone: '+201012345678',
      notes: 'ملاحظة جديدة',
    })

    renderBookingsPage('/bookings')
    await openHistoryCard(user, 'مراجعة حجز أحمد علي')
    await user.click(screen.getByText('••• خيارات أخرى'))
    await user.click(screen.getByRole('button', { name: 'تعديل بيانات الحجز' }))

    const nameInput = await screen.findByLabelText('اسم العميل')
    await user.clear(nameInput)
    await user.type(nameInput, 'منى حسن')
    await user.clear(screen.getByLabelText('ملاحظات'))
    await user.type(screen.getByLabelText('ملاحظات'), 'ملاحظة جديدة')
    await user.click(screen.getByRole('button', { name: 'حفظ البيانات' }))

    await waitFor(() => {
      expect(mockedUpdateBookingCustomer).toHaveBeenCalledWith('nasr-club', 55, {
        customer_name: 'منى حسن',
        customer_phone: '+201012345678',
        notes: 'ملاحظة جديدة',
      })
    })
    expect(mockedGetBooking).toHaveBeenCalledTimes(3)
    expect(mockedListBookings).toHaveBeenCalledTimes(2)
  })

  it('hides customer edit and reschedule for completed bookings', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockedListBookings.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 56,
          court: 3,
          customer_name: 'حجز مكتمل',
          start_time: '2026-07-20T08:00:00Z',
          end_time: '2026-07-20T09:00:00Z',
          status: 'COMPLETED',
          paid_amount: '300.00',
          remaining_amount: '0.00',
        },
      ]),
    )

    renderBookingsPage('/bookings')
    await openHistoryCard(user, 'مراجعة حجز حجز مكتمل')

    expect(screen.queryByRole('button', { name: 'تعديل بيانات الحجز' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تغيير الموعد' }))
      .not.toBeInTheDocument()
    expect(screen.queryByText('••• خيارات أخرى')).not.toBeInTheDocument()
  })

  it('reschedules a normal HOLD booking through POST /reschedule/', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const holdBooking = bookingFixture({
      id: 57,
      court: 3,
      customer_name: 'عميل النقل',
      start_time: '2026-07-21T20:00:00Z',
      end_time: '2026-07-21T21:00:00Z',
      status: 'HOLD',
    })

    mockedListBookings
      .mockResolvedValueOnce(paginatedResponse([holdBooking]))
      .mockResolvedValueOnce(paginatedResponse([{
        ...holdBooking,
        start_time: '2026-07-21T18:00:00Z',
        end_time: '2026-07-21T19:00:00Z',
      }]))
    mockedGetBooking.mockResolvedValue(holdBooking)
    mockedListBookingSlots.mockResolvedValue({
      court: 3,
      court_name: 'ملعب 1',
      date_from: '2026-07-21',
      date_to: '2026-07-21',
      slot_duration_minutes: 60,
      message: null,
      slots: [
        {
          date: '2026-07-21',
          start_time: '18:00',
          end_time: '19:00',
          slot_status: 'FREE',
          is_available: true,
          slot_price: '250.00',
          booking: null,
          recurring_anchor_booking_id: null,
          recurring_context: null,
          can_start_recurring: true,
          recurring_blocked_reason: null,
          first_recurring_conflict_start: null,
          label: 'متاح',
        },
      ],
    })
    mockedRescheduleBooking.mockResolvedValueOnce({
      ...holdBooking,
      start_time: '2026-07-21T18:00:00',
      end_time: '2026-07-21T19:00:00',
    })

    renderBookingsPage('/bookings')
    await openHistoryCard(user, 'مراجعة حجز عميل النقل')
    await user.click(screen.getByText('••• خيارات أخرى'))
    await user.click(screen.getByRole('button', { name: 'تغيير الموعد' }))
    await user.click(await screen.findByRole('button', { name: '6:00 م' }))
    await user.click(screen.getByRole('button', { name: 'تأكيد تغيير الموعد' }))

    await waitFor(() => {
      expect(mockedRescheduleBooking).toHaveBeenCalledWith('nasr-club', 57, {
        court: 3,
        start_time: '2026-07-21T18:00:00',
        end_time: '2026-07-21T19:00:00',
      })
    })
    expect(mockedGetBooking).toHaveBeenCalled()
  })

  it('hides reschedule for an active recurring confirmed booking', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockedListBookings.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [{
        ...bookingFixture({
          id: 58,
          court: 3,
          customer_name: 'أسبوعي مؤكد',
          start_time: '2026-07-21T08:00:00Z',
          end_time: '2026-07-21T09:00:00Z',
          status: 'CONFIRMED',
          paid_amount: '300.00',
          remaining_amount: '0.00',
        }),
        is_recurring: true,
        recurrence_status: 'ACTIVE',
      }],
    })

    renderBookingsPage('/bookings')
    await openHistoryCard(user, 'مراجعة حجز أسبوعي مؤكد')
    await user.click(screen.getByText('••• خيارات أخرى'))
    expect(screen.queryByRole('button', { name: 'تغيير الموعد' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تعديل بيانات الحجز' }))
      .toBeInTheDocument()
  })

  it('hydrates BookingActionSheet from Booking detail notes, not the list row', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockedListBookings.mockResolvedValueOnce(
      paginatedResponse([
        bookingFixture({
          id: 70,
          court: 3,
          customer_name: 'عميل القائمة',
          start_time: '2026-07-21T18:00:00Z',
          end_time: '2026-07-21T19:00:00Z',
          status: 'CONFIRMED',
          paid_amount: '100.00',
          remaining_amount: '0.00',
        }),
      ]),
    )
    mockedGetBooking.mockResolvedValueOnce(
      bookingFixture({
        id: 70,
        court: 3,
        customer_name: 'عميل القائمة',
        start_time: '2026-07-21T18:00:00Z',
        end_time: '2026-07-21T19:00:00Z',
        status: 'CONFIRMED',
        paid_amount: '100.00',
        remaining_amount: '0.00',
        notes: 'يحب الإنارة',
      }),
    )

    renderBookingsPage('/bookings')

    expect(await screen.findByText('عميل القائمة')).toBeInTheDocument()
    expect(screen.queryByText('يحب الإنارة')).not.toBeInTheDocument()
    expect(mockedGetBooking).not.toHaveBeenCalled()

    await openHistoryCard(user, 'مراجعة حجز عميل القائمة')

    expect(mockedGetBooking).toHaveBeenCalledTimes(1)
    expect(mockedGetBooking).toHaveBeenCalledWith('nasr-club', 70)
    expect(screen.getByText('ملاحظات')).toBeInTheDocument()
    expect(screen.getByText('يحب الإنارة')).toBeInTheDocument()
    expect(screen.queryByText('غير متاح')).not.toBeInTheDocument()
  })

  it('hides booking notes when the detail response is empty', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockedListBookings.mockResolvedValueOnce(
      paginatedResponse([
        bookingFixture({
          id: 71,
          court: 3,
          customer_name: 'بدون ملاحظة',
          notes: 'ملاحظة القائمة فقط',
          start_time: '2026-07-21T18:00:00Z',
          end_time: '2026-07-21T19:00:00Z',
          status: 'CONFIRMED',
          paid_amount: '100.00',
          remaining_amount: '0.00',
        }),
      ]),
    )
    mockedGetBooking.mockResolvedValueOnce(
      bookingFixture({
        id: 71,
        court: 3,
        customer_name: 'بدون ملاحظة',
        notes: '   ',
        start_time: '2026-07-21T18:00:00Z',
        end_time: '2026-07-21T19:00:00Z',
        status: 'CONFIRMED',
        paid_amount: '100.00',
        remaining_amount: '0.00',
      }),
    )

    renderBookingsPage('/bookings')
    await openHistoryCard(user, 'مراجعة حجز بدون ملاحظة')

    expect(screen.queryByText('ملاحظات')).not.toBeInTheDocument()
    expect(screen.queryByText('ملاحظة القائمة فقط')).not.toBeInTheDocument()
    expect(screen.queryByText('غير متاح')).not.toBeInTheDocument()
  })

  it('does not expose a Booking History sort control while Backend ordering is unsupported', async () => {
    mockedListBookings.mockResolvedValueOnce(paginatedResponse([]))

    renderBookingsPage()

    await screen.findByText('مفيش حجوزات لسه.')
    expect(screen.queryByText(listCopy.ordering)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: listCopy.newestFirst }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: listCopy.oldestFirst }))
      .not.toBeInTheDocument()
  })
})
