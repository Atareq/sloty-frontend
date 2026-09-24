import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { listClubPlayers } from './playersApi'
import { getClubPlayerPhone } from './players.types'
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
          player_number: 1,
          player_profile: {
            id: 101,
            phone_number: '01012345678',
            full_name: 'طارق علي',
            verified: true,
            has_account: false,
            created_at: '2026-09-01T12:00:00Z',
            updated_at: '2026-09-01T12:00:00Z',
          },
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
    expect(players[0].player_profile?.phone_number).toBe('01012345678')
  })

  it('includes pagination query parameters when page and page_size are provided', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 20,
      next: null,
      previous: null,
      results: [],
    })

    await listClubPlayers('barcelona-fc', {
      search: '010',
      order_by: '-last_used_at',
      page: 2,
      page_size: 10,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/barcelona-fc/players/?search=010&order_by=-last_used_at&page=2&page_size=10',
    )
  })

  it('handles array response from non-paginated endpoints', async () => {
    mockedApiRequest.mockResolvedValueOnce([
      {
        id: 14,
        display_name: 'محمد صلاح',
        phone_number: '01122334455',
        player_number: 2,
        player_profile: {
          id: 102,
          phone_number: '01122334455',
          full_name: 'محمد صلاح',
          verified: true,
          has_account: true,
          created_at: '2026-09-01T12:00:00Z',
          updated_at: '2026-09-01T12:00:00Z',
        },
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
      player_number: 2,
      player_profile: {
        id: 202,
        phone_number: '01022222222',
        full_name: 'لاعب 2',
        verified: true,
        has_account: false,
        created_at: '2026-09-01T12:00:00Z',
        updated_at: '2026-09-01T12:00:00Z',
      },
      last_used_at: null,
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
})
