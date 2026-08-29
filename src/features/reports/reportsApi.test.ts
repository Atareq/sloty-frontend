import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { getCourtUsageReport } from './reportsApi'
import {
  COURT_USAGE_REPORT_STATUSES,
  CUSTOM_REPORT_HOURS_REQUIRED,
  INVALID_COURT_USAGE_STATUS,
  REPORT_DATE_RANGE_INVALID,
  REPORT_DATE_RANGE_TOO_LARGE,
} from './reports.types'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('reportsApi', () => {
  it('gets court usage reports with required and optional filters', async () => {
    mockedApiRequest.mockResolvedValueOnce({})

    await getCourtUsageReport('nasr-club', {
      date_from: '2026-07-01',
      date_to: '2026-07-15',
      court: 3,
      period: 'custom',
      hour_from: '18:00',
      hour_to: '23:00',
      staff: 5,
      status: 'COMPLETED',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.reports.courtUsage('nasr-club')}?date_from=2026-07-01&date_to=2026-07-15&court=3&hour_from=18%3A00&hour_to=23%3A00&period=custom&staff=5&status=COMPLETED`,
    )
  })

  it('does not send payment_method to the court usage report', async () => {
    mockedApiRequest.mockResolvedValueOnce({})

    await getCourtUsageReport('nasr-club', {
      date_from: '2026-07-01',
      date_to: '2026-07-15',
      payment_method: 'CASH',
    } as Parameters<typeof getCourtUsageReport>[1] & {
      payment_method: string
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.reports.courtUsage('nasr-club')}?date_from=2026-07-01&date_to=2026-07-15`,
    )
  })

  it('keeps court usage status limited to blocking booking states', () => {
    expect(COURT_USAGE_REPORT_STATUSES).toEqual([
      'HOLD',
      'CONFIRMED',
      'COMPLETED',
      'NO_SHOW',
    ])
    expect(COURT_USAGE_REPORT_STATUSES).not.toContain('CANCELLED')
    expect(COURT_USAGE_REPORT_STATUSES).not.toContain('EXPIRED')
  })

  it('exports court usage report validation error codes', () => {
    expect(REPORT_DATE_RANGE_INVALID).toBe('REPORT_DATE_RANGE_INVALID')
    expect(REPORT_DATE_RANGE_TOO_LARGE).toBe('REPORT_DATE_RANGE_TOO_LARGE')
    expect(CUSTOM_REPORT_HOURS_REQUIRED).toBe('CUSTOM_REPORT_HOURS_REQUIRED')
    expect(INVALID_COURT_USAGE_STATUS).toBe('INVALID_COURT_USAGE_STATUS')
  })
})
