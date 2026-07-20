import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAccessToken } from '../auth/authStorage'
import { apiRequest } from './apiClient'

vi.mock('../auth/authStorage', () => ({
  getAccessToken: vi.fn(() => null),
}))

const mockedGetAccessToken = vi.mocked(getAccessToken)

function mockFetch(response: Response): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
}

function getRequestHeaders(): Headers {
  const fetchMock = vi.mocked(fetch)
  const init = fetchMock.mock.calls[0]?.[1]

  return new Headers(init?.headers)
}

describe('apiRequest', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    mockedGetAccessToken.mockReturnValue(null)
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
})
