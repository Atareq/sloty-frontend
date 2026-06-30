import type { AuthClaims, AuthRole } from './auth.types'

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Creates an unsigned local-development JWT for frontend-only auth testing.
 *
 * Remove this helper when real login API integration is introduced.
 */
export function createDevAccessToken(role: AuthRole = 'court_staff'): string {
  const claims: AuthClaims = {
    user_id: 1,
    role,
    name: 'مستخدم تجريبي',
    club_id: role === 'platform_super_admin' ? undefined : 1,
    court_id: role === 'court_staff' ? 1 : undefined,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  }

  return [
    encodeBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' })),
    encodeBase64Url(JSON.stringify(claims)),
    'dev',
  ].join('.')
}
