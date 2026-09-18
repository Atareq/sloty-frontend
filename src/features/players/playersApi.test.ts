import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { listClubPlayers } from './playersApi'
import { arePhoneNumbersMatching, getClubPlayerPhone } from './players.types'
import type { ClubPlayer } from './players.types'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('playersApi', () => {
  it('requests players with search and order_by query params', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 12,
          display_name: 'طارق علي',
          phone_number: '01012345678',
          last_used_at: '2026-09-15T12:00:00Z',
        },
      ],
    })

    const players = await listClubPlayers('barcelona-fc', {
      search: '01012345678',
      order_by: '-last_used_at',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/barcelona-fc/players/?search=01012345678&order_by=-last_used_at',
    )
    expect(players).toHaveLength(1)
    expect(players[0].display_name).toBe('طارق علي')
  })

  it('handles array response from non-paginated endpoints', async () => {
    mockedApiRequest.mockResolvedValueOnce([
      {
        id: 14,
        display_name: 'محمد صلاح',
        phone_number: '01122334455',
        last_used_at: '2026-09-10T12:00:00Z',
      },
    ])

    const players = await listClubPlayers('barcelona-fc', {
      search: 'محمد',
      order_by: '-last_used_at',
    })

    expect(players).toHaveLength(1)
    expect(players[0].display_name).toBe('محمد صلاح')
  })

  it('catches network error and returns empty array without throwing', async () => {
    mockedApiRequest.mockRejectedValueOnce(new Error('Network error'))

    const players = await listClubPlayers('barcelona-fc', {
      search: '01012345678',
      order_by: '-last_used_at',
    })

    expect(players).toEqual([])
  })
})

describe('players.types helpers', () => {
  it('extracts phone number from top-level or player_profile', () => {
    const playerWithTopLevelPhone: ClubPlayer = {
      id: 1,
      display_name: 'لاعب 1',
      phone_number: '01011111111',
    }
    const playerWithProfilePhone: ClubPlayer = {
      id: 2,
      display_name: 'لاعب 2',
      player_profile: {
        phone_number: '01022222222',
      },
    }
    const playerWithoutPhone: ClubPlayer = {
      id: 3,
      display_name: 'لاعب 3',
    }

    expect(getClubPlayerPhone(playerWithTopLevelPhone)).toBe('01011111111')
    expect(getClubPlayerPhone(playerWithProfilePhone)).toBe('01022222222')
    expect(getClubPlayerPhone(playerWithoutPhone)).toBe('')
    expect(getClubPlayerPhone(null)).toBe('')
  })

  it('matches equivalent phone numbers across formats and rejects mismatches', () => {
    expect(arePhoneNumbersMatching('01012345678', '+201012345678')).toBe(true)
    expect(arePhoneNumbersMatching('01012345678', '01012345678')).toBe(true)
    expect(arePhoneNumbersMatching('+201012345678', '+20 10 1234 5678')).toBe(true)
    expect(arePhoneNumbersMatching('01012345678', '01099999999')).toBe(false)
    expect(arePhoneNumbersMatching('', '01012345678')).toBe(false)
    expect(arePhoneNumbersMatching(null, '01012345678')).toBe(false)
  })
})
