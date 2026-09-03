import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { getAuditLog, listAuditLogs } from './auditApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('auditApi', () => {
  it('lists audit logs with filters', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listAuditLogs('nasr-club', {
      date_from: '2026-07-01',
      date_to: '2026-07-15',
      actor: 7,
      action: 'TRANSACTION_CANCELLED',
      page: 2,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.auditLogs.list('nasr-club')}?date_from=2026-07-01&date_to=2026-07-15&actor=7&action=TRANSACTION_CANCELLED&page=2`,
    )
  })

  it('gets one audit log detail through the nested club endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      id: 52,
      action: 'BOOKING_CANCELLED',
    })

    await getAuditLog('nasr-club', 52)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.auditLogs.detail('nasr-club', 52),
    )
  })
})
