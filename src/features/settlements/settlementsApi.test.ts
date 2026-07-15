import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  createSettlement,
  getSettlement,
  getSettlementPreview,
  listSettlements,
} from './settlementsApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('settlementsApi', () => {
  it('gets settlement preview with query params', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      totals: {
        cash: '0.00',
        digital_wallet: '0.00',
        bank_transfer: '0.00',
        other: '0.00',
        total: '0.00',
      },
      transactions: [],
    })

    await getSettlementPreview('nasr-club', {
      staff: 5,
      date_from: '2026-07-01',
      date_to: '2026-07-15',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.settlements.preview('nasr-club')}?staff=5&date_from=2026-07-01&date_to=2026-07-15`,
    )
  })

  it('creates settlement through the settlements list endpoint', async () => {
    const payload = {
      staff: 5,
      date_from: '2026-07-01',
      date_to: '2026-07-15',
      notes: 'Shift settlement',
    }

    mockedApiRequest.mockResolvedValueOnce({ id: 9 })

    await createSettlement('nasr-club', payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.settlements.list('nasr-club'),
      {
        method: 'POST',
        body: payload,
      },
    )
  })

  it('lists settlements through the settlements list endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listSettlements('nasr-club')

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.settlements.list('nasr-club'),
    )
  })

  it('gets one settlement through the detail endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 9 })

    await getSettlement('nasr-club', 9)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.settlements.detail('nasr-club', 9),
    )
  })
})
