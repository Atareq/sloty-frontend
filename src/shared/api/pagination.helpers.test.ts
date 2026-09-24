import { describe, expect, it, vi } from 'vitest'
import { extractResults, fetchAllPages } from './pagination.helpers'
import type { PaginatedResponse } from './pagination.types'

describe('pagination.helpers', () => {
  describe('extractResults', () => {
    it('returns results array when DRF paginated object is provided', () => {
      const response: PaginatedResponse<{ id: number; name: string }> = {
        count: 2,
        next: null,
        previous: null,
        results: [
          { id: 1, name: 'Club A' },
          { id: 2, name: 'Club B' },
        ],
      }

      expect(extractResults(response)).toEqual([
        { id: 1, name: 'Club A' },
        { id: 2, name: 'Club B' },
      ])
    })

    it('returns array directly when legacy plain array is provided', () => {
      const items = [{ id: 1 }, { id: 2 }]
      expect(extractResults(items)).toEqual(items)
    })

    it('returns empty array when input is null or undefined', () => {
      expect(extractResults(null)).toEqual([])
      expect(extractResults(undefined)).toEqual([])
    })

    it('returns empty array when results is empty', () => {
      const response: PaginatedResponse<unknown> = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      }
      expect(extractResults(response)).toEqual([])
    })

    it('returns empty array for non-array results or unexpected objects', () => {
      expect(extractResults({} as unknown as PaginatedResponse<unknown>)).toEqual([])
      expect(
        extractResults({ results: 'not-an-array' } as unknown as PaginatedResponse<unknown>),
      ).toEqual([])
    })
  })

  describe('fetchAllPages', () => {
    it('collects all items across multiple pages following next URL', async () => {
      const fetcher = vi.fn()
      fetcher
        .mockResolvedValueOnce({
          count: 4,
          next: 'https://api.sloty.io/api/v1/clubs/?page=2',
          previous: null,
          results: [{ id: 1 }, { id: 2 }],
        })
        .mockResolvedValueOnce({
          count: 4,
          next: null,
          previous: 'https://api.sloty.io/api/v1/clubs/?page=1',
          results: [{ id: 3 }, { id: 4 }],
        })

      const all = await fetchAllPages(fetcher)

      expect(all).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }])
      expect(fetcher).toHaveBeenCalledTimes(2)
      expect(fetcher).toHaveBeenNthCalledWith(1, undefined)
      expect(fetcher).toHaveBeenNthCalledWith(
        2,
        'https://api.sloty.io/api/v1/clubs/?page=2',
      )
    })

    it('returns single page items when next is null', async () => {
      const fetcher = vi.fn().mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [{ id: 1 }],
      })

      const all = await fetchAllPages(fetcher)

      expect(all).toEqual([{ id: 1 }])
      expect(fetcher).toHaveBeenCalledTimes(1)
    })

    it('returns empty array if first page has empty results', async () => {
      const fetcher = vi.fn().mockResolvedValueOnce({
        count: 0,
        next: null,
        previous: null,
        results: [],
      })

      const all = await fetchAllPages(fetcher)

      expect(all).toEqual([])
      expect(fetcher).toHaveBeenCalledTimes(1)
    })
  })
})

