import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  confirmUserSettlement,
  getSettlement,
  markSettlementSettled,
  reviewUserSettlement,
  listSettlements,
} from './settlementsApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('settlementsApi', () => {
  it('reviews a user settlement with dry_run true on the list endpoint', async () => {
    const payload = {
      collected_by: 5,
      dry_run: true as const,
    }

    mockedApiRequest.mockResolvedValueOnce({
      transaction_count: 0,
      total_amount: '0.00',
      totals_by_payment_method: {},
      transactions: [],
    })

    await reviewUserSettlement('nasr-club', payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.settlements.list('nasr-club'),
      {
        method: 'POST',
        body: payload,
      },
    )
  })

  it('confirms a user settlement with dry_run false and notes only', async () => {
    const payload = {
      collected_by: 5,
      dry_run: false as const,
      notes: 'Shift settlement',
    }

    mockedApiRequest.mockResolvedValueOnce({ id: 9 })

    await confirmUserSettlement('nasr-club', payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.settlements.list('nasr-club'),
      {
        method: 'POST',
        body: payload,
      },
    )
  })

  it('lists settlements with supported collected_by/status/court filters', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listSettlements('nasr-club', {
      collected_by: 5,
      status: 'PENDING',
      court: 3,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.settlements.list('nasr-club')}?collected_by=5&status=PENDING&court=3`,
    )
  })

  it('gets one settlement through the detail endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 9 })

    await getSettlement('nasr-club', 9)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.settlements.detail('nasr-club', 9),
    )
  })

  it('marks one settlement as settled through the confirmed action endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 9, status: 'SETTLED' })

    await markSettlementSettled('nasr-club', 9)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.settlements.markSettled('nasr-club', 9),
      {
        method: 'POST',
      },
    )
  })
})
