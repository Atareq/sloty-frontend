import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  cancelTransaction,
  createTransaction,
  getTransaction,
  listTransactions,
} from './transactionsApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('transactionsApi', () => {
  it('lists transactions through the shared endpoint registry', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listTransactions('nasr-club')

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.transactions.list('nasr-club'),
    )
  })

  it('creates transactions through the shared list endpoint with POST', async () => {
    const payload = {
      booking: 10,
      amount: '150',
      payment_method: 'CASH' as const,
    }

    mockedApiRequest.mockResolvedValueOnce({
      id: 1,
      ...payload,
    })

    await createTransaction('nasr-club', payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.transactions.list('nasr-club'),
      {
        method: 'POST',
        body: payload,
      },
    )
  })

  it('gets one transaction through the shared detail endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      id: 5,
      amount: '150',
      payment_method: 'CASH',
    })

    await getTransaction('nasr-club', 5)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.transactions.detail('nasr-club', 5),
    )
  })

  it('cancels a transaction through the shared cancel endpoint', async () => {
    const payload = { reason: 'Wrong amount entered' }

    mockedApiRequest.mockResolvedValueOnce({
      id: 5,
      amount: '150',
      payment_method: 'CASH',
      is_cancelled: true,
    })

    await cancelTransaction('nasr-club', 5, payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.transactions.cancel('nasr-club', 5),
      {
        method: 'POST',
        body: payload,
      },
    )
  })
})
