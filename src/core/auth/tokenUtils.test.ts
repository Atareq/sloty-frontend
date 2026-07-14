import { describe, expect, it } from 'vitest'
import { decodeAccessToken, decodeJwtPayload, isJwtExpired } from './tokenUtils'

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function createJwt(payload: Record<string, unknown>): string {
  return [
    encodeBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' })),
    encodeBase64Url(JSON.stringify(payload)),
    'signature',
  ].join('.')
}

describe('tokenUtils', () => {
  it('decodes a valid JWT payload', () => {
    const token = createJwt({
      user_id: 7,
      role: 'STAFF',
      name: 'Ahmed',
      court_id: 3,
    })

    expect(decodeJwtPayload(token)).toMatchObject({
      user_id: 7,
      role: 'STAFF',
      name: 'Ahmed',
      court_id: 3,
    })
    expect(decodeAccessToken(token)).toMatchObject({
      user_id: 7,
      role: 'STAFF',
      name: 'Ahmed',
      court_id: 3,
    })
  })

  it('handles invalid tokens safely', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull()
    expect(decodeAccessToken('not-a-jwt')).toBeNull()
    expect(
      decodeAccessToken(createJwt({ user_id: 7, role: 'unknown_role' })),
    ).toBeNull()
  })

  it('detects expired tokens from past exp claims', () => {
    expect(isJwtExpired({ exp: Math.floor(Date.now() / 1000) - 10 })).toBe(true)
    expect(isJwtExpired({ exp: Math.floor(Date.now() / 1000) + 10 })).toBe(
      false,
    )
  })
})
