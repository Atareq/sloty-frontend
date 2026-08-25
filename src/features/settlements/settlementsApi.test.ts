import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  createSettlement,
  getSettlementPreview,
  getSettlement,
  markSettlementSettled,
  listSettlements,
} from './settlementsApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('settlementsApi', () => {
  it('gets a settlement preview from the preview endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      transaction_count: 0,
      total_amount: '0.00',
      totals_by_payment_method: {},
      transactions: [],
    })

    await getSettlementPreview('nasr-club', {
      collected_by: 5,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.settlements.preview('nasr-club')}?collected_by=5`,
    )
  })

  it('gets a settlement preview with optional court and page params', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      transaction_count: 0,
      total_amount: '0.00',
      totals_by_payment_method: {},
      transactions: [],
    })

    await getSettlementPreview('nasr-club', {
      collected_by: 5,
      court: 3,
      page: 2,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.settlements.preview(
        'nasr-club',
      )}?collected_by=5&court=3&page=2`,
    )
  })

  it('skips empty settlement preview params', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      transaction_count: 0,
      total_amount: '0.00',
      totals_by_payment_method: {},
      transactions: [],
    })

    await getSettlementPreview('nasr-club', {
      collected_by: 5,
      court: '',
      page: '',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.settlements.preview('nasr-club')}?collected_by=5`,
    )
  })

  it('creates a settlement through the list endpoint without dry_run', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 9 })

    await createSettlement('nasr-club', {
      collected_by: 5,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.settlements.list('nasr-club'),
      {
        method: 'POST',
        body: {
          collected_by: 5,
        },
      },
    )
    expect(mockedApiRequest).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.objectContaining({
          dry_run: expect.anything(),
        }),
      }),
    )
  })

  it('creates a settlement with optional court and trimmed notes only', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 9 })

    await createSettlement('nasr-club', {
      collected_by: 5,
      court: 3,
      notes: ' Shift settlement ',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.settlements.list('nasr-club'),
      {
        method: 'POST',
        body: {
          collected_by: 5,
          court: 3,
          notes: 'Shift settlement',
        },
      },
    )
    expect(mockedApiRequest).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.objectContaining({
          date_from: expect.anything(),
          date_to: expect.anything(),
          period_start: expect.anything(),
          period_end: expect.anything(),
        }),
      }),
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
