import { AUTH_ROLES, type AuthClaims, type AuthRole } from './auth.types'

function isAuthRole(value: unknown): value is AuthRole {
  return typeof value === 'string' && AUTH_ROLES.includes(value as AuthRole)
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const paddedBase64 = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  )
  const binary = atob(paddedBase64)
  const bytes = Uint8Array.from(binary, (character) =>
    character.charCodeAt(0),
  )

  return new TextDecoder().decode(bytes)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Decodes a JWT payload safely without validating its signature.
 *
 * Signature validation and permission enforcement belong to the backend. The
 * frontend only reads claims for UX, navigation, and route protection.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const [, payload] = token.split('.')

  if (!payload) {
    return null
  }

  try {
    const parsedPayload: unknown = JSON.parse(decodeBase64Url(payload))
    return isRecord(parsedPayload) ? parsedPayload : null
  } catch {
    return null
  }
}

/**
 * Decodes and narrows the Sloty access-token claims used by the frontend.
 */
export function decodeAccessToken(token: string | null): AuthClaims | null {
  if (!token) {
    return null
  }

  const payload = decodeJwtPayload(token)

  if (!payload || typeof payload.user_id !== 'number' || !isAuthRole(payload.role)) {
    return null
  }

  return {
    user_id: payload.user_id,
    role: payload.role,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    club_id: typeof payload.club_id === 'number' ? payload.club_id : undefined,
    court_id:
      typeof payload.court_id === 'number' ? payload.court_id : undefined,
    exp: typeof payload.exp === 'number' ? payload.exp : undefined,
  }
}

/**
 * Checks JWT expiration using the standard `exp` claim in seconds.
 */
export function isJwtExpired(claims: Pick<AuthClaims, 'exp'> | null): boolean {
  if (!claims?.exp) {
    return false
  }

  return claims.exp <= Math.floor(Date.now() / 1000)
}
