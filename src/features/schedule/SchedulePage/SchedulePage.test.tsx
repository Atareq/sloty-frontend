import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { getCourtWorkingHours } from '../../courts/courtWorkingHoursApi'
import { listCourts } from '../../courts/courtsApi'
import {
  createDateFilterOptions,
  getWeekdayFromDateValue,
} from '../scheduleBoard.helpers'
import {
  cancelBooking,
  completeBooking,
  createBooking,
  listBookingsForCourtDay,
  markBookingNoShow,
} from '../scheduleApi'
import { createTransaction } from '../../transactions/transactionsApi'
import { SchedulePage } from './SchedulePage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

vi.mock('../../courts/courtWorkingHoursApi', () => ({
  getCourtWorkingHours: vi.fn(),
}))

vi.mock('../scheduleApi', () => ({
  cancelBooking: vi.fn(),
  completeBooking: vi.fn(),
  createBooking: vi.fn(),
  listBookingsForCourtDay: vi.fn(),
  markBookingNoShow: vi.fn(),
}))

vi.mock('../../transactions/transactionsApi', () => ({
  createTransaction: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListCourts = vi.mocked(listCourts)
const mockedGetCourtWorkingHours = vi.mocked(getCourtWorkingHours)
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

function mockScheduleApiData(): void {
  const today = createDateFilterOptions()[0].date

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
  mockedGetCourtWorkingHours.mockResolvedValue(
    {
      court: 7,
      court_name: 'ملعب 1',
      working_hours: [
        {
          id: 3,
          weekday: getWeekdayFromDateValue(today),
          is_closed: false,
          blocks: [
            {
              start_time: '06:00',
              end_time: '10:00',
            },
          ],
        },
      ],
    },
  )
  mockedListBookingsForCourtDay.mockResolvedValue(
    paginatedResponse([
      {
        id: 10,
        court: 7,
        customer_name: 'أحمد علي',
        customer_phone: '01000000000',
        start_time: '07:00',
        end_time: '08:00',
        status: 'CONFIRMED',
      },
      {
        id: 11,
        court: 7,
        start_time: '08:00',
        end_time: '09:00',
        status: 'CANCELLED',
      },
      {
        id: 12,
        court: 7,
        start_time: '06:00',
        end_time: '07:00',
        status: 'HOLD',
      },
    ]),
  )
  mockedCancelBooking.mockResolvedValue({
    id: 10,
    court: 7,
    customer_name: 'أحمد علي',
    customer_phone: '01000000000',
    start_time: '07:00',
    end_time: '08:00',
    status: 'CANCELLED',
  })
  mockedCompleteBooking.mockResolvedValue({
    id: 10,
    court: 7,
    customer_name: 'أحمد علي',
    customer_phone: '01000000000',
    start_time: '07:00',
    end_time: '08:00',
    status: 'COMPLETED',
  })
  mockedMarkBookingNoShow.mockResolvedValue({
    id: 10,
    court: 7,
    customer_name: 'أحمد علي',
    customer_phone: '01000000000',
    start_time: '07:00',
    end_time: '08:00',
    status: 'NO_SHOW',
  })
  mockedCreateBooking.mockResolvedValue({
    id: 20,
    court: 7,
    customer_name: 'أحمد علي',
    customer_phone: '01000000000',
    start_time: `${today}T09:00:00`,
    end_time: `${today}T10:00:00`,
    status: 'CONFIRMED',
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
    mockScheduleApiData()
  })

  it('renders the Arabic schedule header from API setup data', async () => {
    render(<SchedulePage />)

    expect(await screen.findByText('جدول اليوم')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'نادي النصر - ملعب 1' }),
    ).toBeInTheDocument()
    expect(screen.getByText('لوحة الحجز')).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: '06:00 محجوز مؤقتًا' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '09:00 متاح' }),
    ).toBeInTheDocument()
    expect(mockedListCourts).toHaveBeenCalledWith('nasr-club')
    await waitFor(() => {
      expect(mockedGetCourtWorkingHours).toHaveBeenCalledWith('nasr-club', 7)
    })
    expect(mockedListBookingsForCourtDay).toHaveBeenCalledWith('nasr-club', {
      court: 7,
      date: createDateFilterOptions()[0].date,
    })
  })

  it('does not fetch schedule data without a selected club slug', async () => {
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      selectedClubSlug: null,
      selectedMembership: null,
    })

    render(<SchedulePage />)

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض جدول الحجز'),
    ).toBeInTheDocument()
    expect(mockedListCourts).not.toHaveBeenCalled()
    expect(mockedGetCourtWorkingHours).not.toHaveBeenCalled()
    expect(mockedListBookingsForCourtDay).not.toHaveBeenCalled()
  })

  it('renders HOLD as reserved and keeps lifecycle-only statuses off the board', async () => {
    render(<SchedulePage />)

    expect(await screen.findByRole('button', { name: '06:00 محجوز مؤقتًا' }))
      .toBeInTheDocument()
    expect(screen.queryByText('مكتمل')).not.toBeInTheDocument()
    expect(screen.queryByText('انتظار الدفع')).not.toBeInTheDocument()
    expect(screen.queryByText('منتهي')).not.toBeInTheDocument()
    expect(screen.queryByText('لم يحضر')).not.toBeInTheDocument()
  })

  it('reloads working hours when selected court changes', async () => {
    const user = userEvent.setup()

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

    await waitFor(() => {
      expect(mockedGetCourtWorkingHours).toHaveBeenCalledWith('nasr-club', 7)
    })

    await user.selectOptions(screen.getByLabelText('الملعب'), '8')

    await waitFor(() => {
      expect(mockedGetCourtWorkingHours).toHaveBeenCalledWith('nasr-club', 8)
    })
  })

  it('shows an Arabic closed-day message from court working hours', async () => {
    const today = createDateFilterOptions()[0].date

    mockedGetCourtWorkingHours.mockResolvedValueOnce({
      court: 7,
      court_name: 'ملعب 1',
      working_hours: [
        {
          id: 3,
          weekday: getWeekdayFromDateValue(today),
          is_closed: true,
          blocks: [],
        },
      ],
    })

    render(<SchedulePage />)

    expect(
      await screen.findByText('الملعب مغلق في هذا اليوم'),
    ).toBeInTheDocument()
  })

  it('does not crash when working-hours blocks are missing', async () => {
    const today = createDateFilterOptions()[0].date

    mockedGetCourtWorkingHours.mockResolvedValueOnce({
      court: 7,
      court_name: 'ملعب 1',
      working_hours: [
        {
          id: 3,
          weekday: getWeekdayFromDateValue(today),
          is_closed: false,
        },
      ],
    } as Awaited<ReturnType<typeof getCourtWorkingHours>>)

    render(<SchedulePage />)

    expect(
      await screen.findByText('لم يتم ضبط مواعيد العمل لهذا اليوم'),
    ).toBeInTheDocument()
  })

  it('opens add booking sheet from available and cancelled slots', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '09:00 متاح' }))

    expect(screen.getByRole('heading', { name: 'إضافة حجز' }))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'إغلاق' }))
    await user.click(screen.getByRole('button', { name: '08:00 ملغي' }))

    expect(screen.getByRole('heading', { name: 'إضافة حجز' }))
      .toBeInTheDocument()
  })

  it('creates a manual booking from an available slot and reloads bookings', async () => {
    const user = userEvent.setup()
    const today = createDateFilterOptions()[0].date

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '09:00 متاح' }))
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
      expect(mockedListBookingsForCourtDay).toHaveBeenCalledTimes(2)
    })
    expect(
      screen.queryByRole('heading', { name: 'إضافة حجز' }),
    ).not.toBeInTheDocument()
  })

  it('opens the HOLD action sheet instead of add booking for held slots', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(
      await screen.findByRole('button', { name: '06:00 محجوز مؤقتًا' }),
    )

    expect(screen.getByRole('heading', { name: 'حجز مؤقت' }))
      .toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'إضافة حجز' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'إضافة دفعة' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'تحرير الموعد' }),
    ).toBeInTheDocument()
  })

  it('opens payment recording from a HOLD booking', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(
      await screen.findByRole('button', { name: '06:00 محجوز مؤقتًا' }),
    )
    await user.click(screen.getByRole('button', { name: 'إضافة دفعة' }))

    expect(screen.getByRole('heading', { name: 'إضافة دفعة' }))
      .toBeInTheDocument()
    expect(screen.getByText('حجز #12')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'حجز مؤقت' }),
    ).not.toBeInTheDocument()
  })

  it('records a payment for a HOLD booking and reloads bookings', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(
      await screen.findByRole('button', { name: '06:00 محجوز مؤقتًا' }),
    )
    await user.click(screen.getByRole('button', { name: 'إضافة دفعة' }))
    await user.type(screen.getByLabelText('المبلغ'), '100')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

    await waitFor(() => {
      expect(mockedCreateTransaction).toHaveBeenCalledWith('nasr-club', {
        booking: 12,
        amount: '100',
        payment_method: 'CASH',
      })
    })
    await waitFor(() => {
      expect(mockedListBookingsForCourtDay).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByText('تم تسجيل الدفعة بنجاح'))
      .toBeInTheDocument()
  })

  it('frees a HOLD slot through the cancel booking endpoint', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(
      await screen.findByRole('button', { name: '06:00 محجوز مؤقتًا' }),
    )
    await user.click(screen.getByRole('button', { name: 'تحرير الموعد' }))

    await waitFor(() => {
      expect(mockedCancelBooking).toHaveBeenCalledWith('nasr-club', 12, {
        reason: 'تحرير الحجز المؤقت',
        notes: 'تم تحرير الموعد من لوحة الحجز',
      })
    })
    await waitFor(() => {
      expect(mockedListBookingsForCourtDay).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByText('تم تحرير الموعد بنجاح'))
      .toBeInTheDocument()
  })

  it('opens the HOLD action sheet after creating a booking that returns HOLD', async () => {
    const user = userEvent.setup()
    const today = createDateFilterOptions()[0].date

    mockedCreateBooking.mockResolvedValueOnce({
      id: 20,
      court: 7,
      customer_name: 'أحمد علي',
      customer_phone: '+201000000000',
      start_time: `${today}T09:00:00`,
      end_time: `${today}T10:00:00`,
      status: 'HOLD',
    })

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '09:00 متاح' }))
    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد علي')
    await user.type(screen.getByLabelText('رقم الهاتف'), '01000000000')
    await user.click(screen.getByRole('button', { name: 'حفظ الحجز' }))

    expect(await screen.findByRole('heading', { name: 'حجز مؤقت' }))
      .toBeInTheDocument()
    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'إضافة حجز' }),
    ).not.toBeInTheDocument()
  })

  it('opens booking details from confirmed slots', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '07:00 مؤكد' }))

    expect(screen.getByRole('heading', { name: 'حجز مؤكد' }))
      .toBeInTheDocument()
    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('01000000000')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'إضافة دفعة' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('تغيير الموعد سيتم إضافته بعد اعتماد واجهة الخلفية'),
    ).toBeInTheDocument()
  })

  it('records a payment for a confirmed booking and reloads bookings', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '07:00 مؤكد' }))
    await user.click(screen.getByRole('button', { name: 'إضافة دفعة' }))
    await user.type(screen.getByLabelText('المبلغ'), '150')
    await user.selectOptions(screen.getByLabelText('طريقة الدفع'), 'CASH')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

    await waitFor(() => {
      expect(mockedCreateTransaction).toHaveBeenCalledWith('nasr-club', {
        booking: 10,
        amount: '150',
        payment_method: 'CASH',
      })
    })
    await waitFor(() => {
      expect(mockedListBookingsForCourtDay).toHaveBeenCalledTimes(2)
    })
    expect(
      screen.queryByRole('heading', { name: 'إضافة دفعة' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'حجز مؤكد' }),
    ).not.toBeInTheDocument()
  })

  it('shows an Arabic error when payment recording fails', async () => {
    const user = userEvent.setup()
    mockedCreateTransaction.mockRejectedValueOnce(new Error('Bad request'))

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '07:00 مؤكد' }))
    await user.click(screen.getByRole('button', { name: 'إضافة دفعة' }))
    await user.type(screen.getByLabelText('المبلغ'), '150')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))

    expect(
      await screen.findByText(
        'تعذر تسجيل الدفعة. تأكد من البيانات وحاول مرة أخرى',
      ),
    ).toBeInTheDocument()
  })

  it('cancels a confirmed booking and reloads bookings', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '07:00 مؤكد' }))
    await user.click(screen.getByRole('button', { name: 'إلغاء الحجز' }))
    await user.selectOptions(screen.getByLabelText('سبب الإلغاء'), 'العميل ألغى')
    await user.click(
      screen.getByRole('button', { name: 'تأكيد إلغاء الحجز' }),
    )

    await waitFor(() => {
      expect(mockedCancelBooking).toHaveBeenCalledWith('nasr-club', 10, {
        reason: 'العميل ألغى',
      })
    })
    await waitFor(() => {
      expect(mockedListBookingsForCourtDay).toHaveBeenCalledTimes(2)
    })
    expect(
      screen.queryByRole('heading', { name: 'حجز مؤكد' }),
    ).not.toBeInTheDocument()
  })

  it('completes a confirmed booking and reloads bookings', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '07:00 مؤكد' }))
    await user.click(screen.getByRole('button', { name: 'إكمال الحجز' }))
    await user.click(
      screen.getByRole('button', { name: 'تأكيد إكمال الحجز' }),
    )

    await waitFor(() => {
      expect(mockedCompleteBooking).toHaveBeenCalledWith('nasr-club', 10)
    })
    await waitFor(() => {
      expect(mockedListBookingsForCourtDay).toHaveBeenCalledTimes(2)
    })
    expect(
      screen.queryByRole('heading', { name: 'حجز مؤكد' }),
    ).not.toBeInTheDocument()
  })

  it('marks a confirmed booking as no-show and reloads bookings', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '07:00 مؤكد' }))
    await user.click(screen.getByRole('button', { name: 'تسجيل عدم حضور' }))
    await user.selectOptions(screen.getByLabelText('سبب عدم الحضور'), 'لم يحضر العميل')
    await user.click(
      screen.getByRole('button', { name: 'تأكيد عدم الحضور' }),
    )

    await waitFor(() => {
      expect(mockedMarkBookingNoShow).toHaveBeenCalledWith('nasr-club', 10, {
        reason: 'لم يحضر العميل',
      })
    })
    await waitFor(() => {
      expect(mockedListBookingsForCourtDay).toHaveBeenCalledTimes(2)
    })
    expect(
      screen.queryByRole('heading', { name: 'حجز مؤكد' }),
    ).not.toBeInTheDocument()
  })
})
