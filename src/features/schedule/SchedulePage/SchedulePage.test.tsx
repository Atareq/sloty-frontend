import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listClubs } from '../../clubs/clubsApi'
import { listCourtWorkingHours } from '../../courts/courtWorkingHoursApi'
import { listCourts } from '../../courts/courtsApi'
import { createDateFilterOptions, getWeekdayFromDateValue } from '../scheduleBoard.helpers'
import {
  cancelBooking,
  completeBooking,
  createBooking,
  listBookingsForCourtDay,
  markBookingNoShow,
} from '../scheduleApi'
import { createTransaction } from '../../transactions/transactionsApi'
import { SchedulePage } from './SchedulePage'

vi.mock('../../clubs/clubsApi', () => ({
  listClubs: vi.fn(),
}))

vi.mock('../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

vi.mock('../../courts/courtWorkingHoursApi', () => ({
  listCourtWorkingHours: vi.fn(),
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

const mockedListClubs = vi.mocked(listClubs)
const mockedListCourts = vi.mocked(listCourts)
const mockedListCourtWorkingHours = vi.mocked(listCourtWorkingHours)
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

  mockedListClubs.mockResolvedValue(
    paginatedResponse([
      {
        id: 1,
        name: 'نادي النصر',
        slug: 'nasr-club',
        city: 'أسيوط',
        is_active: true,
        manager_can_settle_transactions: false,
        manager_can_change_pricing: false,
      },
    ]),
  )
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
  mockedListCourtWorkingHours.mockResolvedValue(
    paginatedResponse([
      {
        id: 3,
        court: 7,
        weekday: getWeekdayFromDateValue(today),
        opens_at: '06:00',
        closes_at: '09:00',
        is_closed: false,
      },
    ]),
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
    start_time: `${today}T06:00:00`,
    end_time: `${today}T07:00:00`,
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
      await screen.findByRole('button', { name: '06:00 متاح' }),
    ).toBeInTheDocument()
  })

  it('does not render lifecycle-only statuses on the Booking Board', async () => {
    render(<SchedulePage />)

    expect(await screen.findByRole('button', { name: '06:00 متاح' }))
      .toBeInTheDocument()
    expect(screen.queryByText('مكتمل')).not.toBeInTheDocument()
    expect(screen.queryByText('انتظار الدفع')).not.toBeInTheDocument()
    expect(screen.queryByText('منتهي')).not.toBeInTheDocument()
    expect(screen.queryByText('لم يحضر')).not.toBeInTheDocument()
  })

  it('opens add booking sheet from available and cancelled slots', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '06:00 متاح' }))

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

    await user.click(await screen.findByRole('button', { name: '06:00 متاح' }))
    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد علي')
    await user.type(screen.getByLabelText('رقم الهاتف'), '01000000000')
    await user.click(screen.getByRole('button', { name: 'حفظ الحجز' }))

    await waitFor(() => {
      expect(mockedCreateBooking).toHaveBeenCalledWith('nasr-club', {
        court: 7,
        customer_name: 'أحمد علي',
        customer_phone: '01000000000',
        start_time: `${today}T06:00:00`,
        end_time: `${today}T07:00:00`,
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

  it('opens booking details from confirmed slots', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '07:00 مؤكد' }))

    expect(screen.getByRole('heading', { name: 'حجز مؤكد' }))
      .toBeInTheDocument()
    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('01000000000')).toBeInTheDocument()
  })

  it('cancels a confirmed booking and reloads bookings', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '07:00 مؤكد' }))
    await user.click(screen.getByRole('button', { name: 'إلغاء الحجز' }))
    await user.click(
      screen.getByRole('button', { name: 'تأكيد إلغاء الحجز' }),
    )

    await waitFor(() => {
      expect(mockedCancelBooking).toHaveBeenCalledWith('nasr-club', 10)
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
    await user.click(
      screen.getByRole('button', { name: 'تأكيد عدم الحضور' }),
    )

    await waitFor(() => {
      expect(mockedMarkBookingNoShow).toHaveBeenCalledWith('nasr-club', 10)
    })
    await waitFor(() => {
      expect(mockedListBookingsForCourtDay).toHaveBeenCalledTimes(2)
    })
    expect(
      screen.queryByRole('heading', { name: 'حجز مؤكد' }),
    ).not.toBeInTheDocument()
  })

  it('records payment for a confirmed booking and reloads bookings', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '07:00 مؤكد' }))
    await user.click(screen.getByRole('button', { name: 'تسجيل دفع' }))
    await user.type(screen.getByLabelText('المبلغ'), '150')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدفع' }))

    await waitFor(() => {
      expect(mockedCreateTransaction).toHaveBeenCalledWith('nasr-club', {
        booking: 10,
        amount: '150',
        payment_method: 'CASH',
        reference: undefined,
        notes: undefined,
      })
    })
    await waitFor(() => {
      expect(mockedListBookingsForCourtDay).toHaveBeenCalledTimes(2)
    })
    expect(
      screen.queryByRole('heading', { name: 'تسجيل دفع' }),
    ).not.toBeInTheDocument()
  })
})
