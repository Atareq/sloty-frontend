import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listClubs } from '../../clubs/clubsApi'
import { listCourtWorkingHours } from '../../courts/courtWorkingHoursApi'
import { listCourts } from '../../courts/courtsApi'
import { createDateFilterOptions, getWeekdayFromDateValue } from '../scheduleBoard.helpers'
import { listBookingsForCourtDay } from '../scheduleApi'
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
  listBookingsForCourtDay: vi.fn(),
}))

const mockedListClubs = vi.mocked(listClubs)
const mockedListCourts = vi.mocked(listCourts)
const mockedListCourtWorkingHours = vi.mocked(listCourtWorkingHours)
const mockedListBookingsForCourtDay = vi.mocked(listBookingsForCourtDay)

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
        area: 'وسط البلد',
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

  it('opens add booking placeholder from available and cancelled slots', async () => {
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

  it('opens details placeholder from confirmed slots', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(await screen.findByRole('button', { name: '07:00 مؤكد' }))

    expect(screen.getByRole('heading', { name: 'تفاصيل الحجز' }))
      .toBeInTheDocument()
  })
})
