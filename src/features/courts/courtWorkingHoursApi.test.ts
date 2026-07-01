import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  createCourtWorkingHour,
  listCourtWorkingHours,
  updateCourtWorkingHour,
} from './courtWorkingHoursApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

const workingHourPayload = {
  court: 7,
  weekday: 0 as const,
  opens_at: '18:00',
  closes_at: '23:00',
  is_closed: false,
}

describe('courtWorkingHoursApi', () => {
  it('uses shared court working-hours endpoints for list/create/update calls', async () => {
    mockedApiRequest.mockResolvedValue({})

    await listCourtWorkingHours('nasr-club')
    await createCourtWorkingHour('nasr-club', workingHourPayload)
    await updateCourtWorkingHour('nasr-club', 5, { is_closed: true })

    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      1,
      apiEndpoints.clubs.courtWorkingHours.list('nasr-club'),
    )
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      apiEndpoints.clubs.courtWorkingHours.list('nasr-club'),
      {
        method: 'POST',
        body: workingHourPayload,
      },
    )
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      3,
      apiEndpoints.clubs.courtWorkingHours.detail('nasr-club', 5),
      {
        method: 'PATCH',
        body: { is_closed: true },
      },
    )
  })
})
