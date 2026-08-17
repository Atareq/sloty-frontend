import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  pricing_periods: [
    {
      starts_at: '18:00:00',
      ends_at: '23:00:00',
      price: '300.00',
    },
  ],
}

describe('courtWorkingHoursApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
          pricing_periods: [],
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

  it('normalizes period times from the backend response', () => {
    const response = normalizeCourtWorkingHoursResponse({
      court: 7,
      court_name: 'ملعب 1',
      pricing_configured: true,
      working_hours: [
        {
          weekday: 5,
          pricing_periods: [
            {
              id: 11,
              starts_at: '10:00:00',
              ends_at: '12:00:00',
              price: '250.00',
            },
          ],
        },
        {
          weekday: 6,
          pricing_periods: [],
        },
      ],
    })

    expect(response.pricing_configured).toBe(true)
    expect(response.working_hours).toEqual([
      {
        weekday: 5,
        pricing_periods: [
          {
            id: 11,
            starts_at: '10:00',
            ends_at: '12:00',
            price: '250.00',
          },
        ],
      },
      {
        weekday: 6,
        pricing_periods: [],
      },
    ])
  })

  it('keeps empty pricing periods as closed days without legacy fields', () => {
    const response = normalizeCourtWorkingHoursResponse({
      court: 7,
      court_name: 'ملعب 1',
      working_hours: [
        {
          weekday: 6,
          pricing_periods: [],
        },
      ],
    })

    expect(response.working_hours).toEqual([
      {
        weekday: 6,
        pricing_periods: [],
      },
    ])
  })

  it('does not add legacy working-hour fields to the PUT payload', async () => {
    const payload = {
      working_hours: [
        {
          weekday: 5 as const,
          pricing_periods: [
            {
              starts_at: '10:00:00',
              ends_at: '12:00:00',
              price: '250.00',
            },
          ],
        },
        {
          weekday: 6 as const,
          pricing_periods: [],
        },
      ],
    }

    mockedApiRequest.mockResolvedValue({
      court: 7,
      court_name: 'ملعب 1',
      working_hours: [],
    })

    await saveCourtWorkingHours('nasr-club', 7, payload)

    const sentPayload = mockedApiRequest.mock.calls.at(-1)?.[1]?.body
    const serializedPayload = JSON.stringify(sentPayload)

    expect(serializedPayload).not.toContain('opens_at')
    expect(serializedPayload).not.toContain('closes_at')
    expect(serializedPayload).not.toContain('is_closed')
    expect(serializedPayload).not.toContain('blocks')
    expect(serializedPayload).not.toContain('localId')
    expect(serializedPayload).not.toContain('"id"')
  })
})
