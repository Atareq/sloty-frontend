import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { listCourts } from '../../courts/courtsApi'
import { createTransaction } from '../../transactions/transactionsApi'
import {
  cancelBooking,
  completeBooking,
  createBooking,
  listBookingSlots,
  listBookingsForCourtDay,
  markBookingNoShow,
} from '../scheduleApi'
import type {
  BackendBookingStatus,
  BookingSlot,
  BookingSlotsResponse,
} from '../scheduleApi.types'
import { createDateFilterOptions } from '../scheduleBoard.helpers'
import { SchedulePage } from './SchedulePage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

vi.mock('../scheduleApi', () => ({
  cancelBooking: vi.fn(),
  completeBooking: vi.fn(),
  createBooking: vi.fn(),
  listBookingSlots: vi.fn(),
  listBookingsForCourtDay: vi.fn(),
  markBookingNoShow: vi.fn(),
}))

vi.mock('../../transactions/transactionsApi', () => ({
  createTransaction: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListCourts = vi.mocked(listCourts)
const mockedListBookingSlots = vi.mocked(listBookingSlots)
const mockedListBookingsForCourtDay = vi.mocked(listBookingsForCourtDay)
const mockedCreateBooking = vi.mocked(createBooking)
const mockedCancelBooking = vi.mocked(cancelBooking)
const mockedCompleteBooking = vi.mocked(completeBooking)
const mockedMarkBookingNoShow = vi.mocked(markBookingNoShow)
const mockedCreateTransaction = vi.mocked(createTransaction)

function paginatedResponse<T>(results: T[]) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

function makeSlot(
  overrides: Partial<BookingSlot> & Pick<BookingSlot, 'start_time' | 'end_time'>,
): BookingSlot {
  const date = createDateFilterOptions()[0].date
  const slotStatus = overrides.slot_status ?? 'FREE'
  const bookingStatus = slotStatus === 'FREE' ? 'CONFIRMED' : slotStatus
  const bookingIdByStartTime: Record<string, number> = {
    '06:00': 12,
    '07:00': 10,
    '12:00': 13,
    '13:00': 14,
  }

  return {
    date,
    start_time: overrides.start_time,
    end_time: overrides.end_time,
    slot_status: slotStatus,
    is_available: overrides.is_available ?? slotStatus === 'FREE',
    booking: overrides.booking ??
      (slotStatus === 'FREE'
        ? null
        : {
            id: bookingIdByStartTime[overrides.start_time] ?? 10,
            status: bookingStatus as BackendBookingStatus,
            status_label: overrides.label ?? 'مؤكد',
            customer_name:
              slotStatus === 'HOLD' ? 'عميل حجز مؤقت' : 'أحمد علي',
            total_booking_value: '250.00',
            total_paid_amount: slotStatus === 'CONFIRMED' ? '250.00' : '100.00',
            remaining_amount: slotStatus === 'CONFIRMED' ? '0.00' : '150.00',
          }),
    label: overrides.label ?? (slotStatus === 'FREE' ? 'متاح' : 'مؤكد'),
  }
}

function makeSlotsResponse(slots: BookingSlot[]): BookingSlotsResponse {
  const today = createDateFilterOptions()[0].date

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
      label: 'حجز مؤقت',
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
        slot_duration_minutes: 60,
        is_active: true,
        requires_digital_payment_reference: false,
        internal_hold_expiry_hours: 12,
      },
    ]),
  )
  mockedListBookingSlots.mockResolvedValue(makeSlotsResponse(defaultSlots()))
  mockedCreateBooking.mockResolvedValue({
    id: 20,
    court: 7,
    customer_name: 'أحمد علي',
    customer_phone: '01000000000',
    start_time: `${createDateFilterOptions()[0].date}T09:00:00`,
    end_time: `${createDateFilterOptions()[0].date}T10:00:00`,
    status: 'CONFIRMED',
  })
  mockedCancelBooking.mockResolvedValue({
    id: 10,
    court: 7,
    customer_name: 'أحمد علي',
    start_time: '07:00',
    end_time: '08:00',
    status: 'CANCELLED',
  })
  mockedCompleteBooking.mockResolvedValue({
    id: 10,
    court: 7,
    customer_name: 'أحمد علي',
    start_time: '07:00',
    end_time: '08:00',
    status: 'COMPLETED',
  })
  mockedMarkBookingNoShow.mockResolvedValue({
    id: 10,
    court: 7,
    customer_name: 'أحمد علي',
    start_time: '07:00',
    end_time: '08:00',
    status: 'NO_SHOW',
  })
  mockedCreateTransaction.mockResolvedValue({
    id: 30,
    booking: 10,
    amount: '150',
    payment_method: 'CASH',
  })
}

describe('SchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-07-20T02:00:00Z'))
    mockScheduleApiData()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the daily board from backend booking slots', async () => {
    render(<SchedulePage />)

    expect(await screen.findByText('جدول اليوم')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'نادي النصر - ملعب 1' }))
      .toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '6:00 ص حجز مؤقت' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: '9:00 ص متاح' }))
      .toBeInTheDocument()
    await waitFor(() => {
      expect(mockedListBookingSlots).toHaveBeenCalledWith('nasr-club', {
        court: 7,
        date: createDateFilterOptions()[0].date,
      })
    })
    expect(mockedListBookingsForCourtDay).not.toHaveBeenCalled()
  })

  it('does not fetch slots without a selected club slug', async () => {
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      selectedClubSlug: null,
      selectedMembership: null,
    })

    render(<SchedulePage />)

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

    render(<SchedulePage />)

    expect(await screen.findByText('الملعب مغلق في هذا اليوم.'))
      .toBeInTheDocument()
  })

  it('shows fallback empty and error states for slots', async () => {
    mockedListBookingSlots.mockResolvedValueOnce(makeSlotsResponse([]))
    const { unmount } = render(<SchedulePage />)

    expect(await screen.findByText('لا توجد مواعيد متاحة لهذا اليوم'))
      .toBeInTheDocument()

    unmount()
    mockedListBookingSlots.mockRejectedValueOnce(new Error('network'))
    render(<SchedulePage />)

    expect(await screen.findByText('تعذر تحميل مواعيد اليوم'))
      .toBeInTheDocument()
  })

  it('uses localized backend errors for slot loading when available', async () => {
    mockedListBookingSlots.mockRejectedValueOnce(
      new ApiClientError('تعذر تحميل المواعيد من الخادم', 400),
    )

    render(<SchedulePage />)

    expect(await screen.findByText('تعذر تحميل المواعيد من الخادم'))
      .toBeInTheDocument()
  })

  it('shows the slot loading state', async () => {
    mockedListBookingSlots.mockImplementationOnce(
      () => new Promise(() => undefined),
    )

    render(<SchedulePage />)

    expect(await screen.findByText('جاري تحميل مواعيد الملعب...'))
      .toBeInTheDocument()
  })

  it('opens Add Booking only for FREE slots with is_available true', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '9:00 ص متاح' }))
    expect(screen.getByRole('heading', { name: 'إضافة حجز' }))
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

    render(<SchedulePage />)

    expect(await screen.findByRole('button', { name: '9:00 ص متاح' }))
      .toBeDisabled()
  })

  it('opens existing booking flows for HOLD and CONFIRMED slots', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '6:00 ص حجز مؤقت' }))
    expect(screen.getByRole('heading', { name: 'حجز مؤقت' }))
      .toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'إغلاق' }))

    await user.click(screen.getByRole('button', { name: '7:00 ص مؤكد' }))
    expect(screen.getByRole('heading', { name: 'حجز مؤكد' }))
      .toBeInTheDocument()
  })

  it('keeps COMPLETED and NO_SHOW non-bookable while allowing read-only details', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '1:00 م مكتمل' }))
    expect(screen.getByRole('heading', { name: 'حجز مكتمل' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'إضافة حجز' }))
      .not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'إغلاق' }))

    await user.click(screen.getByRole('button', { name: '12:00 م عدم حضور' }))
    expect(screen.getByRole('heading', { name: 'حجز لم يحضر' }))
      .toBeInTheDocument()
  })

  it('renders AM slots before noon and PM slots from noon onward', async () => {
    render(<SchedulePage />)

    const amSection = await screen.findByText('مواعيد ص')
    const pmSection = screen.getByText('مواعيد م')

    expect(within(amSection.closest('div')?.parentElement as HTMLElement)
      .getByRole('button', { name: '9:00 ص متاح' })).toBeInTheDocument()
    expect(within(pmSection.closest('div')?.parentElement as HTMLElement)
      .getByRole('button', { name: '12:00 م عدم حضور' })).toBeInTheDocument()
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
            total_booking_value: '250.00',
            total_paid_amount: '100.00',
            remaining_amount: '150.00',
          },
        }),
      ]),
    )

    render(<SchedulePage />)

    expect(await screen.findByText('حجوزات تحتاج إغلاق')).toBeInTheDocument()
    expect(screen.getByText('عميل يحتاج إغلاق')).toBeInTheDocument()
    expect(screen.queryByText('عميل بدون اسم')).not.toBeInTheDocument()
  })

  it('reloads backend slots after creating a booking', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const today = createDateFilterOptions()[0].date

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '9:00 ص متاح' }))
    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد علي')
    await user.type(screen.getByLabelText('رقم الهاتف'), '01000000000')
    await user.click(screen.getByRole('button', { name: 'حفظ الحجز' }))

    await waitFor(() => {
      expect(mockedCreateBooking).toHaveBeenCalledWith('nasr-club', {
        court: 7,
        customer_name: 'أحمد علي',
        customer_phone: '+201000000000',
        start_time: `${today}T09:00:00`,
        end_time: `${today}T10:00:00`,
        source: 'MANUAL',
      })
    })
    await waitFor(() => {
      expect(mockedListBookingSlots).toHaveBeenCalledTimes(2)
    })
  })

  it('reloads backend slots after payment and hold release actions', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '6:00 ص حجز مؤقت' }))
    await user.click(screen.getByRole('button', { name: 'إضافة دفعة' }))
    await user.type(screen.getByLabelText('المبلغ'), '100')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

    await waitFor(() => {
      expect(mockedCreateTransaction).toHaveBeenCalled()
      expect(mockedListBookingSlots).toHaveBeenCalledTimes(2)
    })

    await user.click(await screen.findByRole('button', { name: '6:00 ص حجز مؤقت' }))
    await user.click(screen.getByRole('button', { name: 'تحرير الموعد' }))

    await waitFor(() => {
      expect(mockedCancelBooking).toHaveBeenCalledWith('nasr-club', 12, {
        reason: 'تحرير الحجز المؤقت',
        notes: 'تم تحرير الموعد من لوحة الحجز',
      })
      expect(mockedListBookingSlots).toHaveBeenCalledTimes(3)
    })
  })

  it('reloads backend slots after cancel, complete, and no-show actions', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '7:00 ص مؤكد' }))
    await user.click(screen.getByRole('button', { name: 'إلغاء الحجز' }))
    await user.selectOptions(screen.getByLabelText('سبب الإلغاء'), 'العميل ألغى')
    await user.click(screen.getByRole('button', { name: 'تأكيد إلغاء الحجز' }))
    await waitFor(() => expect(mockedListBookingSlots).toHaveBeenCalledTimes(2))

    await user.click(await screen.findByRole('button', { name: '7:00 ص مؤكد' }))
    await user.click(screen.getByRole('button', { name: 'إكمال الحجز' }))
    await user.click(screen.getByRole('button', { name: 'تأكيد إكمال الحجز' }))
    await waitFor(() => expect(mockedListBookingSlots).toHaveBeenCalledTimes(3))

    await user.click(await screen.findByRole('button', { name: '7:00 ص مؤكد' }))
    await user.click(screen.getByRole('button', { name: 'تسجيل عدم حضور' }))
    await user.selectOptions(
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

    mockedListCourts.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 7,
          club: 1,
          name: 'ملعب 1',
          sport_type: 'FOOTBALL',
          default_price: '250.00',
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
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 12,
        },
      ]),
    )

    render(<SchedulePage />)

    fireEvent.change(screen.getByLabelText('تاريخ الحجز'), {
      target: { value: '2026-07-21' },
    })

    await waitFor(() => {
      expect(mockedListBookingSlots).toHaveBeenCalledWith('nasr-club', {
        court: 7,
        date: '2026-07-21',
      })
    })

    await user.selectOptions(screen.getByLabelText('الملعب'), '8')

    await waitFor(() => {
      expect(mockedListBookingSlots).toHaveBeenCalledWith('nasr-club', {
        court: 8,
        date: '2026-07-21',
      })
    })
  })
})
