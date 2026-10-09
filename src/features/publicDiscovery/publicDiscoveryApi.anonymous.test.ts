import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAuthTokens,
  setAccessToken,
  setRefreshToken,
} from '../../core/auth/authStorage'
import { listPublicCourts, searchPublicCourts } from './publicDiscoveryApi'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function requestHeaders(call: Parameters<typeof fetch>): Headers {
  return new Headers(call[1]?.headers)
}

describe('listPublicCourts and searchPublicCourts anonymous transport', () => {
  beforeEach(() => {
    setAccessToken('stored-staff-access-token')
    setRefreshToken('stored-staff-refresh-token')
  })

  afterEach(() => {
    clearAuthTokens()
    vi.restoreAllMocks()
  })

  it('never sends the stored Bearer token to the public discovery endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ count: 0, next: null, previous: null, results: [] }),
    )

    await listPublicCourts({ page: 1 })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const call = fetchSpy.mock.calls[0]
    expect(String(call[0])).toMatch(/\/public\/courts\/\?page=1$/)
    expect(requestHeaders(call).has('Authorization')).toBe(false)
    expect(requestHeaders(call).get('Accept-Language')).toBe('ar')
  })

  it('never sends the stored Bearer token to the public Court search endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ count: 0, next: null, previous: null, results: [] }),
    )

    await searchPublicCourts({
      date: null,
      times: [],
      courtId: 12,
      page: 1,
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const call = fetchSpy.mock.calls[0]
    expect(String(call[0])).toMatch(
      /\/public\/courts\/search\/\?court_id=12&page=1$/,
    )
    expect(requestHeaders(call).has('Authorization')).toBe(false)
    expect(requestHeaders(call).get('Accept-Language')).toBe('ar')
  })

  it('does not attempt a token refresh when the endpoint is not live yet', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ detail: 'Not found.' }, 404))

    await expect(listPublicCourts({ page: 1 })).rejects.toMatchObject({
      status: 404,
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
