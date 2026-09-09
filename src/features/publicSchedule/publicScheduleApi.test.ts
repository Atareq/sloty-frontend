import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import {
  buildPublicCourtAvailabilityPath,
  getPublicCourtAvailability,
} from './publicScheduleApi'
import type { PublicCourtAvailabilityResponse } from './publicSchedule.types'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('publicScheduleApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('buildPublicCourtAvailabilityPath', () => {
    it('builds the path without date query param when omitted', () => {
      const path = buildPublicCourtAvailabilityPath('al-ahly', 5)
      expect(path).toBe('public/clubs/al-ahly/courts/5/availability/')
    })

    it('builds the path with date query param when provided', () => {
      const path = buildPublicCourtAvailabilityPath('al-ahly', 5, {
        date: '2026-09-10',
      })
      expect(path).toBe(
        'public/clubs/al-ahly/courts/5/availability/?date=2026-09-10',
      )
    })
  })

  describe('getPublicCourtAvailability', () => {
    it('calls apiRequest with GET and skipAuthRefresh: true', async () => {
      const mockResponse: PublicCourtAvailabilityResponse = {
        club: { id: 1, slug: 'al-ahly', name: 'Al Ahly' },
        court: { id: 5, name: 'Court 1' },
        date: '2026-09-10',
        is_closed: false,
        opens_at: '08:00',
        closes_at: '23:00',
        slot_duration_minutes: 60,
        slots: [
          {
            start_time: '08:00',
            end_time: '09:00',
            availability: 'AVAILABLE',
          },
        ],
      }
      mockedApiRequest.mockResolvedValueOnce(mockResponse)

      const controller = new AbortController()
      const result = await getPublicCourtAvailability(
        'al-ahly',
        5,
        { date: '2026-09-10' },
        { signal: controller.signal },
      )

      expect(result).toEqual(mockResponse)
      expect(mockedApiRequest).toHaveBeenCalledWith(
        'public/clubs/al-ahly/courts/5/availability/?date=2026-09-10',
        {
          method: 'GET',
          signal: controller.signal,
          skipAuthRefresh: true,
          omitAuth: true,
        },
      )
    })
  })
})

