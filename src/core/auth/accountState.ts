import { getApiErrorCode, getApiErrorDetails } from '../api/apiError.helpers'

export const SESSION_EXPIRED_CODE = 'SESSION_EXPIRED'
export const TOKEN_NOT_VALID_CODE = 'TOKEN_NOT_VALID'
export const USER_INACTIVE_CODE = 'USER_INACTIVE'
export const USER_DELETED_CODE = 'USER_DELETED'
export const CLUB_ACCESS_REVOKED_CODE = 'CLUB_ACCESS_REVOKED'

export type AccountStateAction =
  | { type: 'auth_required'; code: typeof SESSION_EXPIRED_CODE | typeof TOKEN_NOT_VALID_CODE }
  | { type: 'clear_user'; code: typeof USER_INACTIVE_CODE | typeof USER_DELETED_CODE }
  | { type: 'clear_club'; code: typeof CLUB_ACCESS_REVOKED_CODE; clubSlug: string | null }
  | { type: 'none'; code: string | null }

/**
 * Maps stable backend account-state codes to the narrow frontend recovery
 * action. Generic 401/403 responses deliberately do not delete local business
 * data because they do not prove account deletion, inactivity, or Club loss.
 */
export function getAccountStateAction(error: unknown): AccountStateAction {
  const code = getApiErrorCode(error)

  if (code === SESSION_EXPIRED_CODE || code === TOKEN_NOT_VALID_CODE) {
    return { type: 'auth_required', code }
  }

  if (code === USER_INACTIVE_CODE || code === USER_DELETED_CODE) {
    return { type: 'clear_user', code }
  }

  if (code === CLUB_ACCESS_REVOKED_CODE) {
    const details = getApiErrorDetails(error)
    const rawClubSlug = details?.club_slug
    const clubSlug =
      typeof rawClubSlug === 'string' && rawClubSlug.trim()
        ? rawClubSlug.trim()
        : null

    return { type: 'clear_club', code, clubSlug }
  }

  return { type: 'none', code }
}
