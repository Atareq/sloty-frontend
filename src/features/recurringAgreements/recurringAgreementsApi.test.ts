import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  cancelRecurringAgreement,
  createRecurringAgreement,
  getRecurringAgreement,
  getRecurringAgreementAvailability,
  getRecurringCancellationPreview,
  listRecurringAgreements,
  refundRecurringDeposit,
} from './recurringAgreementsApi'
import {
  RECURRING_AGREEMENT_STATUSES,
  RECURRING_DEPOSIT_STATUSES,
  type RecurringAgreementCreatePayload,
} from './recurringAgreements.types'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('recurringAgreementsApi', () => {
  it('registers recurring endpoint builders', () => {
    expect(apiEndpoints.clubs.recurringAgreements.list('nasr-club'))
      .toBe('clubs/nasr-club/recurring-agreements/')
    expect(apiEndpoints.clubs.recurringAgreements.detail('nasr-club', 7))
      .toBe('clubs/nasr-club/recurring-agreements/7/')
    expect(apiEndpoints.clubs.recurringAgreements.availability('nasr-club'))
      .toBe('clubs/nasr-club/recurring-agreements/availability/')
    expect(
      apiEndpoints.clubs.recurringAgreements.cancellationPreview('nasr-club', 7),
    ).toBe('clubs/nasr-club/recurring-agreements/7/cancellation-preview/')
    expect(apiEndpoints.clubs.recurringAgreements.cancel('nasr-club', 7))
      .toBe('clubs/nasr-club/recurring-agreements/7/cancel/')
    expect(apiEndpoints.clubs.recurringAgreements.refundDeposit('nasr-club', 7))
      .toBe('clubs/nasr-club/recurring-agreements/7/refund-deposit/')
  })

  it('exports only confirmed status values', () => {
    expect(RECURRING_AGREEMENT_STATUSES).toEqual([
      'ACTIVE',
      'CANCELLED',
      'ACTION_REQUIRED',
    ])
    expect(RECURRING_DEPOSIT_STATUSES).toEqual([
      'HELD',
      'REFUND_DUE',
      'REFUNDED',
      'FORFEITED',
    ])
  })

  it('calls list and detail endpoints', async () => {
    mockedApiRequest.mockResolvedValueOnce([])
    await listRecurringAgreements('nasr-club')
    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/nasr-club/recurring-agreements/',
    )

    mockedApiRequest.mockResolvedValueOnce({ id: 7 })
    await getRecurringAgreement('nasr-club', 7)
    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/nasr-club/recurring-agreements/7/',
    )
  })

  it('checks availability with exact query fields', async () => {
    mockedApiRequest.mockResolvedValueOnce({ all_available: true })

    await getRecurringAgreementAvailability('nasr-club', {
      court: 1,
      weekday: 1,
      start_time: '20:00:00',
      end_time: '21:00:00',
      start_date: '2026-08-25',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/nasr-club/recurring-agreements/availability/?court=1&weekday=1&start_time=20%3A00%3A00&end_time=21%3A00%3A00&start_date=2026-08-25',
    )
  })

  it('creates recurring agreements without deposit or source fields', async () => {
    const payload: RecurringAgreementCreatePayload = {
      court: 1,
      customer_name: 'Ahmed',
      customer_phone: '+201000000000',
      weekday: 1,
      start_time: '20:00:00',
      end_time: '21:00:00',
      start_date: '2026-08-25',
      payment_method: 'CASH',
      reference: '',
      notes: '',
    }

    mockedApiRequest.mockResolvedValueOnce({ id: 7 })
    await createRecurringAgreement('nasr-club', payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/nasr-club/recurring-agreements/',
      {
        method: 'POST',
        body: payload,
      },
    )
    expect(JSON.stringify(payload)).not.toContain('deposit_amount')
    expect(JSON.stringify(payload)).not.toContain('source')
  })

  it('calls cancellation preview, cancel, and refund endpoints', async () => {
    const cancelPayload = {
      effective_date: '2026-09-01',
      reason: 'Customer requested cancellation',
    }

    mockedApiRequest.mockResolvedValueOnce({})
    await getRecurringCancellationPreview('nasr-club', 7, cancelPayload)
    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/nasr-club/recurring-agreements/7/cancellation-preview/',
      {
        method: 'POST',
        body: cancelPayload,
      },
    )

    mockedApiRequest.mockResolvedValueOnce({})
    await cancelRecurringAgreement('nasr-club', 7, cancelPayload)
    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/nasr-club/recurring-agreements/7/cancel/',
      {
        method: 'POST',
        body: cancelPayload,
      },
    )

    mockedApiRequest.mockResolvedValueOnce({})
    await refundRecurringDeposit('nasr-club', 7)
    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/nasr-club/recurring-agreements/7/refund-deposit/',
      {
        method: 'POST',
      },
    )
  })
})

