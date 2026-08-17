import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { createCourt, getCourt, listCourts, updateCourt } from './courtsApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

const courtPayload = {
  name: 'ملعب 1',
  sport_type: 'FOOTBALL',
  default_price: '250.00',
  minimum_deposit: '100.00',
  cancellation_refund_notice_days: 3,
  slot_duration_minutes: 60,
}

describe('courtsApi', () => {
  it('builds nested court calls through the shared endpoint registry', async () => {
    mockedApiRequest.mockResolvedValue({})

    await listCourts('nasr-club')
    await getCourt('nasr-club', 3)
    await createCourt('nasr-club', courtPayload)
    await updateCourt('nasr-club', 3, {
      ...courtPayload,
      is_active: true,
    })

    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      1,
      apiEndpoints.clubs.courts.list('nasr-club'),
    )
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      apiEndpoints.clubs.courts.detail('nasr-club', 3),
    )
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      3,
      apiEndpoints.clubs.courts.list('nasr-club'),
      {
        method: 'POST',
        body: courtPayload,
      },
    )
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      4,
      apiEndpoints.clubs.courts.detail('nasr-club', 3),
      {
        method: 'PATCH',
        body: {
          ...courtPayload,
          is_active: true,
        },
      },
    )
  })
})
