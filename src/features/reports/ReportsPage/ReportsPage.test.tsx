import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import { listCourts } from '../../courts/courtsApi'
import { getCourtUsageReport } from '../reportsApi'
import type { CourtUsageReport } from '../reports.types'
import { ReportsPage } from './ReportsPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

vi.mock('../../clubUsers/clubUsersApi', () => ({
  listClubUsers: vi.fn(),
}))

vi.mock('../reportsApi', () => ({
  getCourtUsageReport: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListCourts = vi.mocked(listCourts)
const mockedListClubUsers = vi.mocked(listClubUsers)
const mockedGetCourtUsageReport = vi.mocked(getCourtUsageReport)

function LocationProbe() {
  const location = useLocation()

  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>
}

function renderReportsPage(initialEntry = '/reports') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ReportsPage />
      <LocationProbe />
    </MemoryRouter>,
  )
}

function mockAuth(
  role: 'OWNER' | 'MANAGER' | 'STAFF' = 'OWNER',
  selectedClubSlug: string | null = 'nasr-club',
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
          court: null,
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

const reportFixture: CourtUsageReport = {
  context: {
    club_id: 1,
    club_name: 'نادي النصر',
    date_from: '2026-07-01',
    date_to: '2026-07-15',
    court: 3,
    court_name: 'ملعب 1',
    period: 'custom',
    hour_from: '18:00',
    hour_to: '23:00',
    staff: 5,
    staff_name: 'محمود حسن',
    status: 'COMPLETED',
    included_statuses: ['COMPLETED'],
    demand_bucket_minutes: 60,
  },
  summary: {
    booking_count: 12,
    occupied_minutes: 720,
    available_minutes: 180,
    utilization_percentage: '80.00',
    status_counts: {
      COMPLETED: 10,
      NO_SHOW: 2,
    },
    financial: {
      total_booking_value: '3600.00',
      total_paid_amount: '3200.00',
      total_remaining_amount: '400.00',
    },
  },
  usage_by_court: [
    {
      court: 3,
      court_name: 'ملعب 1',
      booking_count: 12,
      occupied_minutes: 720,
      available_minutes: 180,
      utilization_percentage: '80.00',
      status_counts: { COMPLETED: 10, NO_SHOW: 2 },
      financial: {
        total_booking_value: '3600.00',
        total_paid_amount: '3200.00',
        total_remaining_amount: '400.00',
      },
    },
  ],
  usage_by_day: [
    {
      date: '2026-07-01',
      booking_count: 4,
      occupied_minutes: 240,
      available_minutes: 60,
      utilization_percentage: '80.00',
      financial: {
        total_booking_value: '1200.00',
        total_paid_amount: '1000.00',
        total_remaining_amount: '200.00',
      },
    },
  ],
  usage_by_period: [
    {
      period: 'custom',
      hour_from: '18:00',
      hour_to: '23:00',
      booking_count: 12,
      occupied_minutes: 720,
      available_minutes: 180,
      utilization_percentage: '80.00',
    },
  ],
  peak_hours: [
    {
      hour_from: '19:00',
      hour_to: '20:00',
      booking_count: 5,
      occupied_minutes: 300,
      available_minutes: 0,
      utilization_percentage: '100.00',
    },
  ],
  low_demand_hours: [
    {
      hour_from: '22:00',
      hour_to: '23:00',
      booking_count: 1,
      occupied_minutes: 60,
      available_minutes: 240,
      utilization_percentage: '20.00',
    },
  ],
  staff_booking_activity: [
    {
      staff: 5,
      staff_name: 'محمود حسن',
      booking_count: 8,
      status_counts: { COMPLETED: 8 },
      occupied_minutes: 480,
      financial: {
        total_booking_value: '2400.00',
        total_paid_amount: '2200.00',
        total_remaining_amount: '200.00',
      },
    },
  ],
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
    mockedListCourts.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 3,
          club: 1,
          name: 'ملعب 1',
          sport_type: 'FOOTBALL',
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
          sport_type: 'FOOTBALL',
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
    mockedListClubUsers.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 5,
          membership_id: 50,
          username: 'manager-user',
          first_name: 'محمود',
          last_name: 'حسن',
          phone_number: '01000000000',
          role: 'MANAGER',
        },
      ],
    })
    mockedGetCourtUsageReport.mockResolvedValue(reportFixture)
  })

  it('shows no selected club message', async () => {
    mockAuth('OWNER', null)

    renderReportsPage()

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض التقارير'),
    ).toBeInTheDocument()
    expect(mockedGetCourtUsageReport).not.toHaveBeenCalled()
  })

  it('blocks staff users', async () => {
    mockAuth('STAFF')

    renderReportsPage()

    expect(
      await screen.findByText('ليس لديك صلاحية عرض التقارير'),
    ).toBeInTheDocument()
    expect(mockedGetCourtUsageReport).not.toHaveBeenCalled()
  })

  it('allows managers to access the court usage reports page', async () => {
    mockAuth('MANAGER')

    renderReportsPage()

    expect(await screen.findByRole('button', { name: 'عرض التقرير' }))
      .toBeInTheDocument()
    expect(screen.queryByText('ليس لديك صلاحية عرض التقارير'))
      .not.toBeInTheDocument()
  })

  it('allows report loading when staff filter options fail', async () => {
    mockAuth('MANAGER')
    mockedListCourts.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 3,
          club: 1,
          name: 'ملعب 1',
          sport_type: 'FOOTBALL',
          default_price: '300.00',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 2,
        },
      ],
    })
    mockedListClubUsers.mockRejectedValueOnce(new Error('forbidden'))

    renderReportsPage('/reports?date_from=2026-07-01&date_to=2026-07-15')

    expect(await screen.findByText('تعذر تحميل خيارات الموظفين'))
      .toBeInTheDocument()
    await waitFor(() => {
      expect(mockedGetCourtUsageReport).toHaveBeenCalled()
    })
    expect(mockedGetCourtUsageReport).toHaveBeenCalledWith('nasr-club', {
      date_from: '2026-07-01',
      date_to: '2026-07-15',
      period: 'all_day',
    })
  })

  it('requires date_from and date_to before loading a report', async () => {
    const user = userEvent.setup()

    renderReportsPage()

    await user.click(screen.getByRole('button', { name: 'عرض التقرير' }))

    expect(await screen.findByText('من تاريخ مطلوب')).toBeInTheDocument()
    expect(mockedGetCourtUsageReport).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('من تاريخ'), '2026-07-01')
    await user.click(screen.getByRole('button', { name: 'عرض التقرير' }))

    expect(await screen.findByText('إلى تاريخ مطلوب')).toBeInTheDocument()
    expect(mockedGetCourtUsageReport).not.toHaveBeenCalled()
  })

  it('uses named court and staff selects instead of raw ID inputs', async () => {
    renderReportsPage()

    expect(await screen.findByRole('option', { name: 'ملعب 1' }))
      .toHaveValue('3')
    expect(screen.queryByRole('option', { name: 'ملعب متوقف' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'محمود حسن' }))
      .toHaveValue('5')
    expect(screen.queryByText('رقم الملعب')).not.toBeInTheDocument()
    expect(screen.queryByText('رقم الموظف')).not.toBeInTheDocument()
    expect(screen.queryByText('مثال: 3')).not.toBeInTheDocument()
    expect(screen.queryByText('مثال: 15')).not.toBeInTheDocument()
  })

  it('shows period options and requires custom hours only for custom period', async () => {
    const user = userEvent.setup()

    renderReportsPage()

    expect(await screen.findByRole('option', { name: 'كل اليوم' }))
      .toHaveValue('all_day')
    expect(screen.getByRole('option', { name: 'صباحي / نهاري' }))
      .toHaveValue('daytime')
    expect(screen.getByRole('option', { name: 'مسائي' })).toHaveValue('evening')
    expect(screen.getByRole('option', { name: 'فترة مخصصة' }))
      .toHaveValue('custom')
    expect(screen.queryByLabelText('من الساعة')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('الفترة'), 'custom')
    expect(screen.getByLabelText('من الساعة')).toBeInTheDocument()
    expect(screen.getByLabelText('إلى الساعة')).toBeInTheDocument()

    await user.type(screen.getByLabelText('من تاريخ'), '2026-07-01')
    await user.type(screen.getByLabelText('إلى تاريخ'), '2026-07-15')
    await user.click(screen.getByRole('button', { name: 'عرض التقرير' }))

    expect(await screen.findByText('يجب تحديد بداية ونهاية الفترة المخصصة'))
      .toBeInTheDocument()
  })

  it('uses only supported court usage status filter options', async () => {
    renderReportsPage()

    expect(await screen.findByRole('option', { name: 'الحالة الافتراضية' }))
      .toHaveValue('')
    expect(screen.getByRole('option', { name: 'بانتظار العربون' }))
      .toHaveValue('HOLD')
    expect(screen.getByRole('option', { name: 'مؤكد' }))
      .toHaveValue('CONFIRMED')
    expect(screen.getByRole('option', { name: 'مكتمل' }))
      .toHaveValue('COMPLETED')
    expect(screen.getByRole('option', { name: 'عدم حضور' }))
      .toHaveValue('NO_SHOW')
    expect(screen.queryByRole('option', { name: 'ملغي' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'منتهي' }))
      .not.toBeInTheDocument()
  })

  it('submits URL-backed court usage filters with internal backend values', async () => {
    const user = userEvent.setup()

    renderReportsPage()

    await user.type(screen.getByLabelText('من تاريخ'), '2026-07-01')
    await user.type(screen.getByLabelText('إلى تاريخ'), '2026-07-15')
    await user.selectOptions(await screen.findByLabelText('الملعب'), '3')
    await user.selectOptions(screen.getByLabelText('الموظف'), '5')
    await user.selectOptions(screen.getByLabelText('الفترة'), 'custom')
    await user.type(screen.getByLabelText('من الساعة'), '18:00')
    await user.type(screen.getByLabelText('إلى الساعة'), '23:00')
    await user.selectOptions(screen.getByLabelText('حالة الحجز'), 'COMPLETED')
    await user.click(screen.getByRole('button', { name: 'عرض التقرير' }))

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/reports?date_from=2026-07-01&date_to=2026-07-15&court=3&period=custom&hour_from=18%3A00&hour_to=23%3A00&staff=5&status=COMPLETED',
    )
    await waitFor(() => {
      expect(mockedGetCourtUsageReport).toHaveBeenCalledWith('nasr-club', {
        date_from: '2026-07-01',
        date_to: '2026-07-15',
        court: '3',
        period: 'custom',
        hour_from: '18:00',
        hour_to: '23:00',
        staff: '5',
        status: 'COMPLETED',
      })
    })
  })

  it('does not send hour filters for non-custom period', async () => {
    renderReportsPage(
      '/reports?date_from=2026-07-01&date_to=2026-07-15&period=evening&hour_from=18%3A00&hour_to=23%3A00',
    )

    await waitFor(() => {
      expect(mockedGetCourtUsageReport).toHaveBeenCalledWith('nasr-club', {
        date_from: '2026-07-01',
        date_to: '2026-07-15',
        period: 'evening',
      })
    })
  })

  it('preserves unknown deep-linked court and staff IDs with fallback labels', async () => {
    renderReportsPage(
      '/reports?date_from=2026-07-01&date_to=2026-07-15&court=99&staff=15',
    )

    expect(await screen.findByRole('option', { name: 'ملعب #99' }))
      .toHaveValue('99')
    expect(screen.getByRole('option', { name: 'مستخدم #15' }))
      .toHaveValue('15')
    expect(screen.getByLabelText('الملعب')).toHaveValue('99')
    expect(screen.getByLabelText('الموظف')).toHaveValue('15')
  })

  it('shows filter loading errors without blocking report loading', async () => {
    mockedListCourts.mockRejectedValueOnce(new Error('failed'))

    renderReportsPage('/reports?date_from=2026-07-01&date_to=2026-07-15')

    expect(await screen.findByText('تعذر تحميل خيارات الفلاتر'))
      .toBeInTheDocument()
    expect(await screen.findByText('سياق التقرير')).toBeInTheDocument()
    expect(mockedGetCourtUsageReport).toHaveBeenCalled()
  })

  it('renders all court usage report sections and backend totals', async () => {
    renderReportsPage('/reports?date_from=2026-07-01&date_to=2026-07-15')

    expect(await screen.findByText('سياق التقرير')).toBeInTheDocument()
    expect(screen.getAllByText('عدد الحجوزات').length).toBeGreaterThan(0)
    expect(screen.getAllByText('12').length).toBeGreaterThan(0)
    expect(screen.getAllByText('دقائق مشغولة').length).toBeGreaterThan(0)
    expect(screen.getAllByText('دقائق متاحة').length).toBeGreaterThan(0)
    expect(screen.getAllByText('نسبة الإشغال').length).toBeGreaterThan(0)
    expect(screen.getAllByText('3,600.00 جنيه').length).toBeGreaterThan(0)
    expect(screen.getAllByText('3,200.00 جنيه').length).toBeGreaterThan(0)
    expect(screen.getAllByText('400.00 جنيه').length).toBeGreaterThan(0)
    expect(screen.getByText('سياق التقرير')).toBeInTheDocument()
    expect(screen.getByText('حسب الملعب')).toBeInTheDocument()
    expect(screen.getByText('حسب اليوم')).toBeInTheDocument()
    expect(screen.getByText('حسب الفترة')).toBeInTheDocument()
    expect(screen.getByText('أعلى ساعات الطلب')).toBeInTheDocument()
    expect(screen.getByText('أقل ساعات الطلب')).toBeInTheDocument()
    expect(screen.getByText('نشاط الموظفين')).toBeInTheDocument()
    expect(screen.getAllByText('ملعب 1').length).toBeGreaterThan(0)
    expect(screen.getByText('2026-07-01')).toBeInTheDocument()
    expect(screen.getAllByText('فترة مخصصة').length).toBeGreaterThan(0)
    expect(screen.getByText('19:00 - 20:00')).toBeInTheDocument()
    expect(screen.getByText('22:00 - 23:00')).toBeInTheDocument()
    expect(screen.getAllByText('محمود حسن').length).toBeGreaterThan(0)
  })

  it('renders empty messages for empty report sections', async () => {
    mockedGetCourtUsageReport.mockResolvedValueOnce({
      ...reportFixture,
      usage_by_court: [],
      usage_by_day: [],
      usage_by_period: [],
      peak_hours: [],
      low_demand_hours: [],
      staff_booking_activity: [],
    })

    renderReportsPage('/reports?date_from=2026-07-01&date_to=2026-07-15')

    expect(await screen.findByText('لا توجد بيانات ملاعب في التقرير'))
      .toBeInTheDocument()
    expect(screen.getByText('لا توجد بيانات يومية في التقرير'))
      .toBeInTheDocument()
    expect(screen.getByText('لا توجد بيانات فترات في التقرير'))
      .toBeInTheDocument()
    expect(screen.getByText('لا توجد ساعات طلب مرتفعة في الفترة المحددة'))
      .toBeInTheDocument()
    expect(screen.getByText('لا توجد ساعات منخفضة الطلب في الفترة المحددة'))
      .toBeInTheDocument()
    expect(screen.getByText('لا توجد بيانات موظفين في التقرير'))
      .toBeInTheDocument()
  })

  it('removes old generic report UI concepts', async () => {
    renderReportsPage()

    expect(await screen.findByText('من تاريخ')).toBeInTheDocument()
    expect(screen.queryByText('طريقة الدفع')).not.toBeInTheDocument()
    expect(screen.queryByText('حسب طريقة الدفع')).not.toBeInTheDocument()
    expect(screen.queryByText('المعاملات')).not.toBeInTheDocument()
  })
})
