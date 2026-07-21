import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { listBookings } from '../bookingsApi'
import { BookingsListPage } from './BookingsListPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../bookingsApi', () => ({
  listBookings: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListBookings = vi.mocked(listBookings)
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
      screen.getByRole('button', { name: 'إزالة فلتر انتظار الدفع' }),
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
      await screen.findByRole('button', { name: 'إزالة فلتر انتظار الدفع' }),
    )

    expect(mockedListBookings).toHaveBeenLastCalledWith('nasr-club', {
      date: '2026-07-21',
    })
    expect(
      screen.queryByRole('button', { name: 'إزالة فلتر انتظار الدفع' }),
    ).not.toBeInTheDocument()
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
})
