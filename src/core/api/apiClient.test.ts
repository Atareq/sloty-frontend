import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAccessToken,
  getRefreshToken,
  markSessionExpiredNotice,
  setAccessToken,
} from '../auth/authStorage'
import {
  apiRequest,
  resetSilentRefreshForTests,
  SESSION_EXPIRED_MESSAGE,
  subscribeSessionExpired,
} from './apiClient'

vi.mock('../auth/authStorage', () => ({
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  setAccessToken: vi.fn(),
  markSessionExpiredNotice: vi.fn(),
}))

const mockedGetAccessToken = vi.mocked(getAccessToken)
const mockedGetRefreshToken = vi.mocked(getRefreshToken)
const mockedSetAccessToken = vi.mocked(setAccessToken)
const mockedMarkSessionExpiredNotice = vi.mocked(markSessionExpiredNotice)

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function createAccessToken(
  expiresInSeconds: number,
  extraClaims: Record<string, unknown> = {},
): string {
  const claims = {
    user_id: 1,
    role: 'STAFF',
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    ...extraClaims,
  }

  return [
    encodeBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' })),
    encodeBase64Url(JSON.stringify(claims)),
    'test',
  ].join('.')
}

function mockFetch(response: Response): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
}

function getRequestHeaders(callIndex = 0): Headers {
  const fetchMock = vi.mocked(fetch)
  const init = fetchMock.mock.calls[callIndex]?.[1]

  return new Headers(init?.headers)
}

function getFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.href
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.url
  }

  return String(input)
}

function getRequestUrl(callIndex = 0): string {
  return getFetchUrl(vi.mocked(fetch).mock.calls[callIndex]?.[0] as RequestInfo | URL)
}

describe('apiRequest', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    resetSilentRefreshForTests()
    mockedGetAccessToken.mockReturnValue(null)
    mockedGetRefreshToken.mockReturnValue(null)
    mockedSetAccessToken.mockReset()
    mockedMarkSessionExpiredNotice.mockReset()
  })

  it('sends Accept-Language ar by default', async () => {
    mockFetch(Response.json({ ok: true }))

    await apiRequest('/ping')

    expect(getRequestHeaders().get('Accept-Language')).toBe('ar')
  })

  it('preserves caller headers and explicit Accept-Language', async () => {
    mockFetch(Response.json({ ok: true }))

    await apiRequest('/ping', {
      headers: {
        'Accept-Language': 'en',
        'X-Trace-Id': 'trace-1',
      },
    })

    const headers = getRequestHeaders()

    expect(headers.get('Accept-Language')).toBe('en')
    expect(headers.get('X-Trace-Id')).toBe('trace-1')
  })

  it('adds authorization and content type when needed', async () => {
    mockedGetAccessToken.mockReturnValue('access-token')
    mockFetch(Response.json({ ok: true }))

    await apiRequest('/ping', {
      method: 'POST',
      body: { name: 'Sloty' },
    })

    const headers = getRequestHeaders()

    expect(headers.get('Authorization')).toBe('Bearer access-token')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('creates ApiClientError from backend JSON error details', async () => {
    mockFetch(
      Response.json(
        {
          success: false,
          code: 'BOOKING_SLOT_ALREADY_TAKEN',
          message: 'هذا الموعد محجوز بالفعل',
          field_errors: {
            amount: [
              {
                code: 'TRANSACTION_AMOUNT_EXCEEDS_REMAINING',
                message: 'المبلغ أكبر من المتبقي',
              },
            ],
          },
          details: { court_id: 12 },
          request_id: 'req-123',
        },
        { status: 409 },
      ),
    )

    await expect(apiRequest('/bookings')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 409,
      code: 'BOOKING_SLOT_ALREADY_TAKEN',
      message: 'هذا الموعد محجوز بالفعل',
      fieldErrors: {
        amount: [
          {
            code: 'TRANSACTION_AMOUNT_EXCEEDS_REMAINING',
            message: 'المبلغ أكبر من المتبقي',
          },
        ],
      },
      details: { court_id: 12 },
      requestId: 'req-123',
    })
  })

  it('preserves request id from response headers when body does not include it', async () => {
    mockFetch(
      Response.json(
        {
          success: false,
          code: 'FORBIDDEN',
          message: 'ليس لديك صلاحية لهذا الإجراء.',
        },
        {
          status: 403,
          headers: { 'X-Request-ID': 'req-header-1' },
        },
      ),
    )

    await expect(apiRequest('/forbidden')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      requestId: 'req-header-1',
    })
  })

  it('uses fallback messages for non-JSON errors', async () => {
    mockFetch(new Response('Not found', { status: 404 }))

    await expect(apiRequest('/missing')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 404,
      message: 'العنصر المطلوب غير موجود.',
    })
  })

  it('uses server fallback when JSON error has no backend message', async () => {
    mockFetch(Response.json({ success: false }, { status: 500 }))

    await expect(apiRequest('/server-error')).rejects.toThrow(
      'حدث خطأ في الخادم. حاول مرة أخرى لاحقاً.',
    )
  })

  it('uses a safe network fallback when fetch fails before response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed fetch')))

    await expect(apiRequest('/network-error')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'تعذر الاتصال بالخادم. تأكد من اتصال الإنترنت.',
    })
  })

  it('returns undefined for 204 responses', async () => {
    mockFetch(new Response(null, { status: 204 }))

    await expect(apiRequest('/empty')).resolves.toBeUndefined()
  })

  it('refreshes once after 401 and retries the original request', async () => {
    const currentAccess = createAccessToken(3600, { jti: 'current' })
    const nextAccess = createAccessToken(3600, { jti: 'next' })
    mockedGetAccessToken.mockReturnValue(currentAccess)
    mockedGetRefreshToken.mockReturnValue('refresh-token')
    mockedSetAccessToken.mockImplementation((token: string) => {
      mockedGetAccessToken.mockReturnValue(token)
    })
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
        .mockResolvedValueOnce(Response.json({ access: nextAccess }))
        .mockResolvedValueOnce(Response.json({ ok: true })),
    )

    await expect(apiRequest('/bookings')).resolves.toEqual({ ok: true })

    expect(getRequestUrl(1)).toContain('auth/token/refresh/')
    expect(mockedSetAccessToken).toHaveBeenCalledWith(nextAccess)
    expect(getRequestHeaders(2).get('Authorization')).toBe(`Bearer ${nextAccess}`)
    expect(mockedMarkSessionExpiredNotice).not.toHaveBeenCalled()
  })

  it('shares one refresh across concurrent 401s and retries each request once', async () => {
    const currentAccess = createAccessToken(3600, { jti: 'current' })
    const nextAccess = createAccessToken(3600, { jti: 'next' })
    mockedGetAccessToken.mockReturnValue(currentAccess)
    mockedGetRefreshToken.mockReturnValue('refresh-token')
    mockedSetAccessToken.mockImplementation((token: string) => {
      mockedGetAccessToken.mockReturnValue(token)
    })

    let refreshCalls = 0
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = getFetchUrl(input)

        if (url.includes('token/refresh')) {
          refreshCalls += 1
          return Response.json({ access: nextAccess })
        }

        const authorization = new Headers(init?.headers).get('Authorization')

        if (authorization === `Bearer ${nextAccess}`) {
          return Response.json({ ok: true })
        }

        return new Response('unauthorized', { status: 401 })
      },
    )

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)

    try {
      const [first, second] = await Promise.all([
        apiRequest<{ ok: boolean }>('/one'),
        apiRequest<{ ok: boolean }>('/two'),
      ])

      expect(first).toEqual({ ok: true })
      expect(second).toEqual({ ok: true })
      expect(refreshCalls).toBe(1)
      expect(
        fetchMock.mock.calls.filter(([input]) =>
          getFetchUrl(input as RequestInfo | URL).includes('token/refresh'),
        ),
      ).toHaveLength(1)
      expect(mockedSetAccessToken).toHaveBeenCalledWith(nextAccess)
      expect(mockedMarkSessionExpiredNotice).not.toHaveBeenCalled()
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('does not refresh login or refresh token paths', async () => {
    mockedGetAccessToken.mockReturnValue(createAccessToken(3600))
    mockedGetRefreshToken.mockReturnValue('refresh-token')
    mockFetch(new Response('unauthorized', { status: 401 }))

    await expect(apiRequest('auth/token/')).rejects.toMatchObject({
      status: 401,
    })
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
    expect(mockedMarkSessionExpiredNotice).not.toHaveBeenCalled()
  })

  it('preserves structured backend account-state errors when refresh is missing', async () => {
    mockedGetAccessToken.mockReturnValue(createAccessToken(3600))
    mockedGetRefreshToken.mockReturnValue(null)
    mockFetch(
      Response.json(
        {
          success: false,
          code: 'TOKEN_NOT_VALID',
          message: 'انتهت صلاحية الجلسة',
        },
        { status: 401 },
      ),
    )

    await expect(apiRequest('/bookings')).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_NOT_VALID',
      message: 'انتهت صلاحية الجلسة',
    })
    expect(mockedMarkSessionExpiredNotice).not.toHaveBeenCalled()
  })

  it('notifies session listeners when a 401 refresh attempt cannot be refreshed', async () => {
    const onSessionExpired = vi.fn()
    const unsubscribe = subscribeSessionExpired(onSessionExpired)
    mockedGetAccessToken.mockReturnValue(createAccessToken(3600))
    mockedGetRefreshToken.mockReturnValue('refresh-token')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
        .mockResolvedValueOnce(new Response('unauthorized', { status: 401 })),
    )

    await expect(apiRequest('/bookings')).rejects.toMatchObject({
      status: 401,
      message: SESSION_EXPIRED_MESSAGE,
    })
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('fails the session in Arabic when refresh itself fails', async () => {
    mockedGetAccessToken.mockReturnValue(createAccessToken(3600))
    mockedGetRefreshToken.mockReturnValue('refresh-token')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
        .mockResolvedValueOnce(new Response('unauthorized', { status: 401 })),
    )

    await expect(apiRequest('/bookings')).rejects.toMatchObject({
      status: 401,
      message: SESSION_EXPIRED_MESSAGE,
    })
    expect(mockedMarkSessionExpiredNotice).toHaveBeenCalledTimes(1)
  })

  it('refreshes an expired access token before sending the original request', async () => {
    const expiredAccess = createAccessToken(-60)
    const nextAccess = createAccessToken(3600)
    mockedGetAccessToken
      .mockReturnValueOnce(expiredAccess)
      .mockReturnValue(nextAccess)
    mockedGetRefreshToken.mockReturnValue('refresh-token')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ access: nextAccess }))
        .mockResolvedValueOnce(Response.json({ ok: true })),
    )

    await expect(apiRequest('/me/')).resolves.toEqual({ ok: true })

    expect(getRequestUrl(0)).toContain('auth/token/refresh/')
    expect(getRequestUrl(1)).toContain('me/')
    expect(getRequestHeaders(1).get('Authorization')).toBe(`Bearer ${nextAccess}`)
  })
})
