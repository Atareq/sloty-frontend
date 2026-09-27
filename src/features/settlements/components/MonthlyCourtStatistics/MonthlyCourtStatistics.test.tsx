import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../../../core/api/apiClient'
import { MonthlyCourtStatistics } from './MonthlyCourtStatistics'
import {
  clearMonthlyStatisticsCache,
  getMonthlyStatisticsQueryKey,
} from './monthlyCourtStatistics.helpers'

vi.mock('../../../../core/api/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../core/api/apiClient')>()
  return {
    ...actual,
    apiRequest: vi.fn(),
  }
})

const mockedApiRequest = vi.mocked(apiRequest)

describe('MonthlyCourtStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearMonthlyStatisticsCache()
  })

  it('renders nothing when clubSlug or courtId is missing', () => {
    const { container: container1 } = render(
      <MonthlyCourtStatistics clubSlug={null} courtId={3} />,
    )
    expect(container1).toBeEmptyDOMElement()

    const { container: container2 } = render(
      <MonthlyCourtStatistics clubSlug="nasr-club" courtId={null} />,
    )
    expect(container2).toBeEmptyDOMElement()

    expect(mockedApiRequest).not.toHaveBeenCalled()
  })

  it('queries backend with default current month and renders the two authoritative metrics', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      month: '2026-09',
      total_income: '5250.00',
      total_bookings: 42,
    })

    render(
      <MonthlyCourtStatistics
        clubSlug="nasr-club"
        courtId={3}
        initialMonth="2026-09"
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'الإحصائيات الشهرية' }),
    ).toBeInTheDocument()

    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/nasr-club/courts/3/monthly-statistics/?month=2026-09',
      { signal: expect.any(AbortSignal) },
    )

    expect(await screen.findByText('5,250 جنيه')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()

    expect(screen.getByText('إجمالي الدخل')).toBeInTheDocument()
    expect(screen.getByText('إجمالي الحجوزات')).toBeInTheDocument()
  })

  it('renders legitimate zero values correctly (0 جنيه and 0)', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      month: '2026-09',
      total_income: '0.00',
      total_bookings: 0,
    })

    render(
      <MonthlyCourtStatistics
        clubSlug="nasr-club"
        courtId={3}
        initialMonth="2026-09"
      />,
    )

    expect(await screen.findByText('0 جنيه')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()

    // Ensure legitimate zero is not replaced by falsy dashes or hidden
    expect(screen.queryByText('-')).not.toBeInTheDocument()
  })

  it('handles API failure by displaying the error state without rendering fake zeros', async () => {
    mockedApiRequest.mockRejectedValueOnce(new Error('Network error'))

    render(
      <MonthlyCourtStatistics
        clubSlug="nasr-club"
        courtId={3}
        initialMonth="2026-09"
      />,
    )

    expect(
      await screen.findByText('تعذر تحميل الإحصائيات حاليًا.'),
    ).toBeInTheDocument()

    // Never convert a failed request into fake zero statistics
    expect(screen.queryByText('0 جنيه')).not.toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByText('إجمالي الدخل')).not.toBeInTheDocument()
    expect(screen.queryByText('إجمالي الحجوزات')).not.toBeInTheDocument()
  })

  it('navigates to next month and previous month with correct backend query month', async () => {
    const user = userEvent.setup()

    mockedApiRequest.mockImplementation((path: string) => {
      if (path.includes('month=2026-09')) {
        return Promise.resolve({
          month: '2026-09',
          total_income: '5000.00',
          total_bookings: 25,
        })
      }
      if (path.includes('month=2026-10')) {
        return Promise.resolve({
          month: '2026-10',
          total_income: '7200.00',
          total_bookings: 36,
        })
      }
      if (path.includes('month=2026-08')) {
        return Promise.resolve({
          month: '2026-08',
          total_income: '3100.00',
          total_bookings: 18,
        })
      }
      return Promise.reject(new Error('Unknown month'))
    })

    render(
      <MonthlyCourtStatistics
        clubSlug="nasr-club"
        courtId={3}
        initialMonth="2026-09"
      />,
    )

    expect(await screen.findByText('5,000 جنيه')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('سبتمبر 2026')).toBeInTheDocument()

    // Navigate to next month (October 2026)
    const nextButton = screen.getByRole('button', { name: 'الشهر التالي' })
    await user.click(nextButton)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/nasr-club/courts/3/monthly-statistics/?month=2026-10',
      { signal: expect.any(AbortSignal) },
    )
    expect(await screen.findByText('7,200 جنيه')).toBeInTheDocument()
    expect(screen.getByText('36')).toBeInTheDocument()
    expect(screen.getByText('أكتوبر 2026')).toBeInTheDocument()

    // Navigate to previous month twice (back to September, then August)
    const prevButton = screen.getByRole('button', { name: 'الشهر السابق' })
    await user.click(prevButton) // returns to 2026-09 (instant from cache)
    expect(await screen.findByText('5,000 جنيه')).toBeInTheDocument()
    expect(screen.getByText('سبتمبر 2026')).toBeInTheDocument()

    await user.click(prevButton) // goes to 2026-08
    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/nasr-club/courts/3/monthly-statistics/?month=2026-08',
      { signal: expect.any(AbortSignal) },
    )
    expect(await screen.findByText('3,100 جنيه')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('أغسطس 2026')).toBeInTheDocument()
  })

  it('isolates cache and queries by court scope when court changes', async () => {
    mockedApiRequest.mockImplementation((path: string) => {
      if (path.includes('/courts/1/')) {
        return Promise.resolve({
          month: '2026-09',
          total_income: '1000.00',
          total_bookings: 10,
        })
      }
      if (path.includes('/courts/2/')) {
        return Promise.resolve({
          month: '2026-09',
          total_income: '2000.00',
          total_bookings: 20,
        })
      }
      return Promise.reject(new Error('Unknown court'))
    })

    const { rerender } = render(
      <MonthlyCourtStatistics
        clubSlug="nasr-club"
        courtId={1}
        initialMonth="2026-09"
      />,
    )

    expect(await screen.findByText('1,000 جنيه')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()

    // Switch to Court 2
    rerender(
      <MonthlyCourtStatistics
        clubSlug="nasr-club"
        courtId={2}
        initialMonth="2026-09"
      />,
    )

    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/nasr-club/courts/2/monthly-statistics/?month=2026-09',
      { signal: expect.any(AbortSignal) },
    )

    expect(await screen.findByText('2,000 جنيه')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('builds the exact agreed query key identity', () => {
    const key = getMonthlyStatisticsQueryKey('nasr-club', 5, '2026-09')
    expect(key).toEqual(['monthly-statistics', 'nasr-club', 5, '2026-09'])
  })

  it('never derives statistics from local bookings or transactions (Backend Authority)', async () => {
    // Backend returns authoritative numbers distinct from any hypothetical local calculations
    mockedApiRequest.mockResolvedValueOnce({
      month: '2026-09',
      total_income: '9999.00',
      total_bookings: 77,
    })

    render(
      <MonthlyCourtStatistics
        clubSlug="nasr-club"
        courtId={3}
        initialMonth="2026-09"
      />,
    )

    // The component exclusively renders the backend-authoritative response
    expect(await screen.findByText('9,999 جنيه')).toBeInTheDocument()
    expect(screen.getByText('77')).toBeInTheDocument()
  })

  it('strictly limits scope to exactly two metric cards with no extra charts or analytics', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      month: '2026-09',
      total_income: '4500.00',
      total_bookings: 30,
    })

    render(
      <MonthlyCourtStatistics
        clubSlug="nasr-club"
        courtId={3}
        initialMonth="2026-09"
      />,
    )

    await screen.findByText('4,500 جنيه')

    // Exactly two metric cards
    expect(screen.getByText('إجمالي الدخل')).toBeInTheDocument()
    expect(screen.getByText('إجمالي الحجوزات')).toBeInTheDocument()

    // No extra analytics, tabs, or charts
    expect(screen.queryByText(/إشغال/)).not.toBeInTheDocument()
    expect(screen.queryByText(/متوسط/)).not.toBeInTheDocument()
    expect(screen.queryByText(/عملاء/)).not.toBeInTheDocument()
    expect(screen.queryByText(/ساعات الذروة/)).not.toBeInTheDocument()
  })
})
