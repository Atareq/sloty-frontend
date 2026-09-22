import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  markSessionExpiredNotice,
  setAccessToken,
} from '../auth/authStorage'
import {
  apiRequest,
  invalidateAuthSession,
  resetSilentRefreshForTests,
  SESSION_EXPIRED_MESSAGE,
  subscribeSessionExpired,
} from './apiClient'

vi.mock('../auth/authStorage', () => ({
  clearAuthTokens: vi.fn(),
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  setAccessToken: vi.fn(),
  markSessionExpiredNotice: vi.fn(),
}))

const mockedClearAuthTokens = vi.mocked(clearAuthTokens)
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
    mockedClearAuthTokens.mockReset()
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
        'X-Client-Trace': 'trace-123',
      },
    })

    const headers = getRequestHeaders()

    expect(headers.get('Accept-Language')).toBe('en')
    expect(headers.get('X-Client-Trace')).toBe('trace-123')
  })

  it('serializes JSON bodies with the application/json header', async () => {
    mockFetch(Response.json({ ok: true }))

    await apiRequest('/ping', {
      method: 'POST',
      body: { name: 'sloty' },
    })

    expect(getRequestHeaders().get('Content-Type')).toBe('application/json')
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ name: 'sloty' }),
    )
  })

  it('attaches the Bearer token when an access token is stored', async () => {
    const token = createAccessToken(3600)
    mockedGetAccessToken.mockReturnValue(token)
    mockFetch(Response.json({ ok: true }))

    await apiRequest('/secure')

    expect(getRequestHeaders().get('Authorization')).toBe(`Bearer ${token}`)
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

  it('refreshes once after 401 SESSION_EXPIRED and retries the original request', async () => {
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
        .mockResolvedValueOnce(
          Response.json(
            { success: false, code: 'SESSION_EXPIRED', message: 'Token expired' },
            { status: 401 },
          ),
        )
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

        return Response.json(
          { success: false, code: 'SESSION_EXPIRED', message: 'Token expired' },
          { status: 401 },
        )
      },
    )

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)

    try {
      const results = await Promise.all([
        apiRequest<{ ok: boolean }>('/one'),
        apiRequest<{ ok: boolean }>('/two'),
        apiRequest<{ ok: boolean }>('/three'),
        apiRequest<{ ok: boolean }>('/four'),
        apiRequest<{ ok: boolean }>('/five'),
      ])

      results.forEach((res) => expect(res).toEqual({ ok: true }))
      expect(refreshCalls).toBe(1)
      expect(mockedSetAccessToken).toHaveBeenCalledWith(nextAccess)
      expect(mockedMarkSessionExpiredNotice).not.toHaveBeenCalled()
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('awaits in-flight refresh for requests arriving during refresh and uses new token', async () => {
    const nextAccess = createAccessToken(3600, { jti: 'next' })
    mockedGetAccessToken.mockReturnValue(createAccessToken(3600))
    mockedGetRefreshToken.mockReturnValue('refresh-token')
    mockedSetAccessToken.mockImplementation((token: string) => {
      mockedGetAccessToken.mockReturnValue(token)
    })

    let resolveRefresh: (res: Response) => void = () => {}
    const refreshPromise = new Promise<Response>((resolve) => {
      resolveRefresh = resolve
    })

    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = getFetchUrl(input)
        if (url.includes('token/refresh')) {
          return refreshPromise
        }
        const auth = new Headers(init?.headers).get('Authorization')
        if (auth === `Bearer ${nextAccess}`) {
          return Response.json({ ok: true, path: url })
        }
        return Response.json(
          { success: false, code: 'SESSION_EXPIRED' },
          { status: 401 },
        )
      },
    )

    vi.stubGlobal('fetch', fetchMock)

    const req1 = apiRequest('/one')
    await Promise.resolve()
    const req2 = apiRequest('/two')

    resolveRefresh(Response.json({ access: nextAccess }))

    const [res1, res2] = await Promise.all([req1, req2])
    expect(res1).toEqual({ ok: true, path: expect.stringContaining('/one') })
    expect(res2).toEqual({ ok: true, path: expect.stringContaining('/two') })

    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      getFetchUrl(url).includes('token/refresh'),
    )
    expect(refreshCalls).toHaveLength(1)
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

  it('does not refresh password change path on 401', async () => {
    mockedGetAccessToken.mockReturnValue(createAccessToken(3600))
    mockedGetRefreshToken.mockReturnValue('refresh-token')
    mockFetch(new Response('unauthorized', { status: 401 }))

    await expect(
      apiRequest('auth/password/change/', { method: 'POST', body: {} }),
    ).rejects.toMatchObject({
      status: 401,
    })
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
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
    expect(mockedMarkSessionExpiredNotice).toHaveBeenCalled()
  })

  it.each([
    'TOKEN_NOT_VALID',
    'PASSWORD_CHANGED',
    'USER_INACTIVE',
    'USER_DELETED',
  ])('does not refresh on unrecoverable 401 code %s', async (code) => {
    mockedGetAccessToken.mockReturnValue(createAccessToken(3600))
    mockedGetRefreshToken.mockReturnValue('refresh-token')
    mockFetch(
      Response.json(
        {
          success: false,
          code,
          message: 'Auth error',
        },
        { status: 401 },
      ),
    )

    await expect(apiRequest('/bookings')).rejects.toMatchObject({
      status: 401,
      code,
    })

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
    expect(mockedClearAuthTokens).toHaveBeenCalled()
    expect(mockedMarkSessionExpiredNotice).toHaveBeenCalled()
  })

  it('does not clear tokens on 403 CLUB_ACCESS_REVOKED', async () => {
    mockedGetAccessToken.mockReturnValue(createAccessToken(3600))
    mockedGetRefreshToken.mockReturnValue('refresh-token')
    mockFetch(
      Response.json(
        {
          success: false,
          code: 'CLUB_ACCESS_REVOKED',
          message: 'تم إلغاء الصلاحية',
        },
        { status: 403 },
      ),
    )

    await expect(apiRequest('/bookings')).rejects.toMatchObject({
      status: 403,
      code: 'CLUB_ACCESS_REVOKED',
    })

    expect(mockedClearAuthTokens).not.toHaveBeenCalled()
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
        .mockResolvedValueOnce(
          Response.json(
            { success: false, code: 'SESSION_EXPIRED', message: 'Token expired' },
            { status: 401 },
          ),
        )
        .mockResolvedValueOnce(
          Response.json(
            { success: false, code: 'TOKEN_NOT_VALID', message: 'Token invalid' },
            { status: 401 },
          ),
        ),
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
        .mockResolvedValueOnce(
          Response.json(
            { success: false, code: 'SESSION_EXPIRED', message: 'Token expired' },
            { status: 401 },
          ),
        )
        .mockResolvedValueOnce(
          Response.json(
            { success: false, code: 'TOKEN_NOT_VALID', message: 'Token invalid' },
            { status: 401 },
          ),
        ),
    )

    await expect(apiRequest('/bookings')).rejects.toMatchObject({
      status: 401,
      message: SESSION_EXPIRED_MESSAGE,
    })
    expect(mockedMarkSessionExpiredNotice).toHaveBeenCalledTimes(1)
  })

  it('does not attempt a second refresh if retried request fails with 401', async () => {
    const currentAccess = createAccessToken(3600)
    const nextAccess = createAccessToken(3600)
    mockedGetAccessToken.mockReturnValue(currentAccess)
    mockedGetRefreshToken.mockReturnValue('refresh-token')
    mockedSetAccessToken.mockImplementation((token: string) => {
      mockedGetAccessToken.mockReturnValue(token)
    })

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json(
            { success: false, code: 'SESSION_EXPIRED', message: 'Token expired' },
            { status: 401 },
          ),
        )
        .mockResolvedValueOnce(Response.json({ access: nextAccess }))
        .mockResolvedValueOnce(
          Response.json(
            {
              success: false,
              code: 'SESSION_EXPIRED',
              message: 'Token expired again',
            },
            { status: 401 },
          ),
        ),
    )

    await expect(apiRequest('/bookings')).rejects.toMatchObject({
      status: 401,
    })

    // 1 original, 1 refresh, 1 retry = 3 total fetch calls, NO 4th fetch call
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3)
    expect(mockedClearAuthTokens).toHaveBeenCalled()
  })

  it('preserves tokens and throws network error when refresh fails due to transport error', async () => {
    mockedGetAccessToken.mockReturnValue(createAccessToken(3600))
    mockedGetRefreshToken.mockReturnValue('refresh-token')

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json(
            { success: false, code: 'SESSION_EXPIRED', message: 'Token expired' },
            { status: 401 },
          ),
        )
        .mockRejectedValueOnce(new TypeError('Failed to fetch')),
    )

    await expect(apiRequest('/bookings')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    })

    expect(mockedClearAuthTokens).not.toHaveBeenCalled()
    expect(mockedMarkSessionExpiredNotice).not.toHaveBeenCalled()
  })

  it('discards new token if logout occurs while refresh is in flight', async () => {
    const expiredAccess = createAccessToken(-60)
    const nextAccess = createAccessToken(3600)
    mockedGetAccessToken.mockReturnValue(expiredAccess)
    mockedGetRefreshToken.mockReturnValue('refresh-token')

    let resolveRefresh: (res: Response) => void = () => {}
    const refreshPromise = new Promise<Response>((resolve) => {
      resolveRefresh = resolve
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = getFetchUrl(input)
        if (url.includes('token/refresh')) {
          return refreshPromise
        }
        return Promise.resolve(Response.json({ ok: true }))
      }),
    )

    const requestPromise = apiRequest('/bookings')

    // Simulate explicit logout while refresh is in flight
    invalidateAuthSession()

    resolveRefresh(Response.json({ access: nextAccess }))

    await expect(requestPromise).rejects.toMatchObject({
      status: 401,
    })

    // Token must NOT have been saved
    expect(mockedSetAccessToken).not.toHaveBeenCalledWith(nextAccess)
  })

  it('sends request with expired token, receives 401 SESSION_EXPIRED, refreshes once, and retries request', async () => {
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
        .mockResolvedValueOnce(
          Response.json(
            { success: false, code: 'SESSION_EXPIRED', message: 'Token expired' },
            { status: 401 },
          ),
        )
        .mockResolvedValueOnce(Response.json({ access: nextAccess }))
        .mockResolvedValueOnce(Response.json({ ok: true })),
    )

    await expect(apiRequest('/me/')).resolves.toEqual({ ok: true })

    expect(getRequestUrl(0)).toContain('me/')
    expect(getRequestHeaders(0).get('Authorization')).toBe(`Bearer ${expiredAccess}`)
    expect(getRequestUrl(1)).toContain('auth/token/refresh/')
    expect(getRequestUrl(2)).toContain('me/')
    expect(getRequestHeaders(2).get('Authorization')).toBe(`Bearer ${nextAccess}`)
  })

  it('omits Authorization header when omitAuth is true even if access token is present', async () => {
    mockedGetAccessToken.mockReturnValue(createAccessToken(3600))
    mockFetch(Response.json({ ok: true }))

    await apiRequest('/public/clubs/demo/courts/1/availability/', {
      omitAuth: true,
    })

    expect(getRequestHeaders().get('Authorization')).toBeNull()
  })

  it('does not trigger silent refresh or fail expired session when omitAuth is true on 401', async () => {
    mockedGetAccessToken.mockReturnValue(createAccessToken(3600))
    mockedGetRefreshToken.mockReturnValue('refresh-token')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('unauthorized', { status: 401 })),
    )
    mockFetch(new Response('unauthorized', { status: 401 }))

    await expect(
      apiRequest('/public/clubs/demo/courts/1/availability/', {
        omitAuth: true,
      }),
    ).rejects.toMatchObject({
      status: 401,
    })

    expect(mockedMarkSessionExpiredNotice).not.toHaveBeenCalled()
  })
})
