import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  createSettlement,
  getCurrentCustody,
  getCurrentCustodySummary,
  getSettlementPreview,
  getSettlement,
  listSettlements,
} from './settlementsApi'
import type { CurrentCustodySummaryQueryParams } from './settlements.types'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

function expectCurrentCustodyParams(
  params: CurrentCustodySummaryQueryParams,
): CurrentCustodySummaryQueryParams {
  return params
}

describe('settlementsApi', () => {
  it('keeps current-custody params narrower than analytical dashboard filters', () => {
    expect(expectCurrentCustodyParams({ collected_by: 5 })).toEqual({
      collected_by: 5,
    })

    // @ts-expect-error Current custody must not accept court filter.
    expectCurrentCustodyParams({ court: 3 })
    // @ts-expect-error Current custody must not accept analytical date filters.
    expectCurrentCustodyParams({ date_from: '2026-07-15' })
  })

  it('gets grouped current custody without analytical date filters', async () => {
    mockedApiRequest.mockResolvedValueOnce({ results: [] })

    await getCurrentCustodySummary('nasr-club', { collected_by: 5 })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.settlements.unsettledSummary('nasr-club')}?collected_by=5`,
    )
  })

  it('uses all-courts custody scope when no court is supplied', async () => {
    mockedApiRequest.mockResolvedValueOnce({ results: [] })

    await getCurrentCustodySummary('nasr-club')

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.settlements.unsettledSummary('nasr-club'),
    )
  })

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

  it('gets a settlement preview with optional page param', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      transaction_count: 0,
      total_amount: '0.00',
      totals_by_payment_method: {},
      transactions: [],
    })

    await getSettlementPreview('nasr-club', {
      collected_by: 5,
      page: 2,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.settlements.preview(
        'nasr-club',
      )}?collected_by=5&page=2`,
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
      page: '',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.settlements.preview('nasr-club')}?collected_by=5`,
    )
  })

  it('delegates getCurrentCustody to preview when isOwnCustody is true', async () => {
    const previewData = {
      collected_by: 1,
      collected_by_name: 'أحمد',
      transaction_count: 1,
      net_amount: '150.00',
      total_amount: '150.00',
      booking_payments: '150.00',
      booking_refunds: '0.00',
      totals_by_payment_method: {},
      transactions: [],
      club: 1,
      is_self_preview: true,
      can_approve: false,
      approval_required: true,
      period_start: '',
      period_end: '',
    }
    mockedApiRequest.mockResolvedValueOnce(previewData)

    const result = await getCurrentCustody('nasr-club', {}, { isOwnCustody: true })

    expect(result).toEqual({ kind: 'preview', data: previewData })
    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.settlements.preview('nasr-club'),
    )
  })

  it('delegates getCurrentCustody to preview when collected_by is provided', async () => {
    const previewData = {
      collected_by: 15,
      collected_by_name: 'علي',
      transaction_count: 2,
      net_amount: '500.00',
      total_amount: '500.00',
      booking_payments: '500.00',
      booking_refunds: '0.00',
      totals_by_payment_method: {},
      transactions: [],
      club: 1,
      is_self_preview: false,
      can_approve: true,
      approval_required: false,
      period_start: '',
      period_end: '',
    }
    mockedApiRequest.mockResolvedValueOnce(previewData)

    const result = await getCurrentCustody('nasr-club', { collected_by: 15 })

    expect(result).toEqual({ kind: 'preview', data: previewData })
    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.settlements.preview('nasr-club')}?collected_by=15`,
    )
  })

  it('delegates getCurrentCustody to summary for all employees', async () => {
    const summaryData = { results: [] }
    mockedApiRequest.mockResolvedValueOnce(summaryData)

    const result = await getCurrentCustody('nasr-club')

    expect(result).toEqual({ kind: 'grouped_summary', data: summaryData })
    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.settlements.unsettledSummary('nasr-club'),
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

  it('creates a settlement with trimmed notes only', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 9 })

    await createSettlement('nasr-club', {
      collected_by: 5,
      notes: ' Shift settlement ',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.settlements.list('nasr-club'),
      {
        method: 'POST',
        body: {
          collected_by: 5,
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

  it('never sends frontend custody totals, candidate rows, or payment breakdown on create', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 9 })

    await createSettlement('nasr-club', {
      collected_by: 5,
      notes: 'تأكيد الوردية',
    })

    const [, options] = mockedApiRequest.mock.calls.at(-1) ?? []

    expect(options).toEqual({
      method: 'POST',
      body: {
        collected_by: 5,
        notes: 'تأكيد الوردية',
      },
    })
    expect(options?.body).not.toHaveProperty('transaction_ids')
    expect(options?.body).not.toHaveProperty('transactions')
    expect(options?.body).not.toHaveProperty('total_amount')
    expect(options?.body).not.toHaveProperty('net_amount')
    expect(options?.body).not.toHaveProperty('court')
    expect(options?.body).not.toHaveProperty('period_start')
    expect(options?.body).not.toHaveProperty('period_end')
    expect(options?.body).not.toHaveProperty('totals_by_payment_method')
    expect(options?.body).not.toHaveProperty('booking_payments')
    expect(options?.body).not.toHaveProperty('booking_refunds')
  })

  it('lists settlements with supported collected_by and court filters', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listSettlements('nasr-club', {
      collected_by: 5,
      court: 3,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.settlements.list('nasr-club')}?collected_by=5&court=3`,
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
