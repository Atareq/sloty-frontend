import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  getCourtWorkingHours,
  normalizeCourtWorkingHoursResponse,
  saveCourtWorkingHours,
} from './courtWorkingHoursApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

const workingHourPayload = {
  weekday: 5 as const,
  is_closed: false,
  blocks: [
    {
      start_time: '18:00',
      end_time: '23:00',
    },
  ],
}

describe('courtWorkingHoursApi', () => {
  it('loads court working hours from the nested court endpoint', async () => {
    mockedApiRequest.mockResolvedValue({
      court: 7,
      court_name: 'ملعب 1',
      working_hours: [],
    })

    const response = await getCourtWorkingHours('nasr-club', 7)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.courts.workingHours.detail('nasr-club', 7),
    )
    expect(response.working_hours).toEqual([])
  })

  it('saves the full weekly schedule with PUT to the nested court endpoint', async () => {
    const payload = {
      working_hours: [
        workingHourPayload,
        {
          weekday: 6 as const,
          is_closed: true,
          blocks: [],
        },
      ],
    }

    mockedApiRequest.mockResolvedValue({
      court: 7,
      court_name: 'ملعب 1',
      working_hours: [],
    })

    await saveCourtWorkingHours('nasr-club', 7, payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.courts.workingHours.detail('nasr-club', 7),
      {
        method: 'PUT',
        body: payload,
      },
    )
  })

  it('normalizes legacy open and close fields into frontend blocks', () => {
    const response = normalizeCourtWorkingHoursResponse({
      court: 7,
      court_name: 'ملعب 1',
      working_hours: [
        {
          id: 3,
          weekday: 5,
          is_closed: false,
          opens_at: '10:00:00',
          closes_at: '12:00:00',
        },
        {
          id: 4,
          weekday: 6,
          is_closed: false,
        },
      ],
    })

    expect(response.working_hours).toEqual([
      {
        id: 3,
        weekday: 5,
        is_closed: false,
        blocks: [{ start_time: '10:00', end_time: '12:00' }],
      },
      {
        id: 4,
        weekday: 6,
        is_closed: false,
        blocks: [],
      },
    ])
  })

  it('normalizes backend block time precision and closed-day blocks', () => {
    const response = normalizeCourtWorkingHoursResponse({
      court: 7,
      court_name: 'ملعب 1',
      working_hours: [
        {
          weekday: 5,
          is_closed: false,
          blocks: [
            {
              id: 9,
              start_time: '18:00:00',
              end_time: '23:00:00',
            },
          ],
        },
        {
          weekday: 6,
          is_closed: true,
          blocks: [
            {
              start_time: '08:00:00',
              end_time: '10:00:00',
            },
          ],
        },
      ],
    })

    expect(response.working_hours).toEqual([
      {
        weekday: 5,
        is_closed: false,
        blocks: [{ id: 9, start_time: '18:00', end_time: '23:00' }],
      },
      {
        weekday: 6,
        is_closed: true,
        blocks: [],
      },
    ])
  })
})
