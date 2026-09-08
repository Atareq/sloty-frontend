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

  it('lists transactions with date range query params', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listTransactions('nasr-club', {
      date_from: '2026-07-13',
      date_to: '2026-07-20',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.transactions.list(
        'nasr-club',
      )}?date_from=2026-07-13&date_to=2026-07-20`,
    )
  })

  it('passes an abort signal for background synchronization requests', async () => {
    const controller = new AbortController()
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listTransactions(
      'nasr-club',
      {
        date_from: '2026-07-13',
        date_to: '2026-07-20',
      },
      { signal: controller.signal },
    )

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.transactions.list(
        'nasr-club',
      )}?date_from=2026-07-13&date_to=2026-07-20`,
      { signal: controller.signal },
    )
  })

  it('sends settlement status and keeps false query params', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listTransactions('nasr-club', {
      settlement_status: 'unsettled',
      is_cancelled: false,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.transactions.list(
        'nasr-club',
      )}?is_cancelled=false&settlement_status=unsettled`,
    )
  })

  it('keeps page, court, and created_by query params', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listTransactions('nasr-club', {
      court: 3,
      created_by: 15,
      page: 2,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.transactions.list(
        'nasr-club',
      )}?court=3&created_by=15&page=2`,
    )
  })

  it('keeps Swagger transaction query params', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listTransactions('nasr-club', {
      booking: 33,
      ordering: '-created',
      search: 'REF-123',
      settlement: 9,
      transaction_type: 'PAYMENT',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.transactions.list(
        'nasr-club',
      )}?booking=33&ordering=-created&search=REF-123&settlement=9&transaction_type=PAYMENT`,
    )
  })

  it('skips empty query params', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listTransactions('nasr-club', {
      date_from: '',
      payment_method: '',
      settlement_status: '',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.transactions.list('nasr-club'),
    )
  })

  it('creates transactions through the shared list endpoint with POST', async () => {
    const payload = {
      booking: 10,
      amount: '150',
      client_request_id: '9b9fa9a9-3c28-45f0-88a6-4d2523f42ea5',
      payment_method: 'CASH' as const,
      payment_reference: 'PAY-17',
      occurred_at: '2026-09-08T10:00:00.000Z',
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
    expect(mockedApiRequest.mock.lastCall?.[1]?.body).not.toHaveProperty(
      'reference',
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
