import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  dismissTransactionAttempt,
  getTransactionAttempt,
  listTransactionAttempts,
} from './transactionAttemptsApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('transactionAttemptsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists transaction attempts through the shared endpoint registry', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listTransactionAttempts('nasr-club', {
      booking: 33,
      court: 3,
      outcome: 'REJECTED',
      payment_method: 'DIGITAL_WALLET',
      status: 'REJECTED',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.transactionAttempts.list(
        'nasr-club',
      )}?booking=33&court=3&outcome=REJECTED&payment_method=DIGITAL_WALLET&status=REJECTED`,
    )
  })

  it('passes an abort signal for transaction attempt reads', async () => {
    const controller = new AbortController()

    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listTransactionAttempts('nasr-club', { page: 2 }, {
      signal: controller.signal,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.transactionAttempts.list('nasr-club')}?page=2`,
      { signal: controller.signal },
    )
  })

  it('reads and dismisses one transaction attempt by id', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 8 })
    mockedApiRequest.mockResolvedValueOnce({ id: 8, status: 'DISMISSED' })

    await getTransactionAttempt('nasr-club', 8)
    await dismissTransactionAttempt('nasr-club', 8)

    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      1,
      apiEndpoints.clubs.transactionAttempts.detail('nasr-club', 8),
    )
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      apiEndpoints.clubs.transactionAttempts.dismiss('nasr-club', 8),
      { method: 'POST', body: {} },
    )
  })
})
