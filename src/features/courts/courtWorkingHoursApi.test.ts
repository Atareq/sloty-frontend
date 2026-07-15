import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  getCourtWorkingHours,
  saveCourtWorkingHours,
} from './courtWorkingHoursApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

const workingHourPayload = {
  weekday: 5 as const,
  opens_at: '18:00:00',
  closes_at: '23:00:00',
  is_closed: false,
}

describe('courtWorkingHoursApi', () => {
  it('loads court working hours from the nested court endpoint', async () => {
    mockedApiRequest.mockResolvedValue({})

    await getCourtWorkingHours('nasr-club', 7)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.courts.workingHours.detail('nasr-club', 7),
    )
  })

  it('saves the full weekly schedule with PUT to the nested court endpoint', async () => {
    const payload = {
      working_hours: [
        workingHourPayload,
        {
          weekday: 6 as const,
          opens_at: null,
          closes_at: null,
          is_closed: true,
        },
      ],
    }

    mockedApiRequest.mockResolvedValue({})

    await saveCourtWorkingHours('nasr-club', 7, payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.courts.workingHours.detail('nasr-club', 7),
      {
        method: 'PUT',
        body: payload,
      },
    )
  })
})
