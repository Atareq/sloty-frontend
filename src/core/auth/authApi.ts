import { apiRequest } from '../api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  CurrentUserProfile,
  LoginRequest,
  RefreshTokenRequest,
  TokenPair,
} from './auth.types'

/**
 * Thin auth API wrapper for the backend-backed JWT login flow.
 *
 * Components call this wrapper instead of constructing auth endpoint URLs
 * directly, keeping API paths centralized in the shared endpoint registry.
 */
export function loginWithPassword(payload: LoginRequest): Promise<TokenPair> {
  return apiRequest<TokenPair>(apiEndpoints.auth.token, {
    method: 'POST',
    body: payload,
  })
}

export function refreshAccessToken(
  payload: RefreshTokenRequest,
): Promise<Pick<TokenPair, 'access'>> {
  return apiRequest<Pick<TokenPair, 'access'>>(apiEndpoints.auth.refresh, {
    method: 'POST',
    body: payload,
  })
}

export function fetchCurrentUserProfile(): Promise<CurrentUserProfile> {
  return apiRequest<CurrentUserProfile>(apiEndpoints.auth.me)
}
