import { useCallback, useMemo, useState } from 'react'
import type {
  AuthClaims,
  AuthContextValue,
  AuthProviderProps,
  AuthRole,
  AuthTokens,
} from './auth.types'
import { AuthContext } from './authContext'
import {
  clearAuthTokens,
  getAccessToken,
  setAccessToken,
  setRefreshToken,
} from './authStorage'
import { decodeAccessToken, isJwtExpired } from './tokenUtils'

function getClaims(accessToken: string | null): AuthClaims | null {
  return decodeAccessToken(accessToken)
}

/**
 * Provides decoded JWT auth state to the frontend.
 *
 * The provider decodes access tokens in one place and exposes role/navigation
 * state for UI decisions. It does not implement backend permissions.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessTokenState] = useState<string | null>(() =>
    getAccessToken(),
  )
  const claims = useMemo(() => getClaims(accessToken), [accessToken])
  const role: AuthRole | null = claims?.role ?? null
  const isTokenExpired = isJwtExpired(claims)
  const isAuthenticated = Boolean(accessToken && claims && !isTokenExpired)

  const setTokens = useCallback((tokens: AuthTokens): void => {
    setAccessToken(tokens.accessToken)
    setRefreshToken(tokens.refreshToken)
    setAccessTokenState(tokens.accessToken)
  }, [])

  const login = useCallback(
    (nextAccessToken: string, nextRefreshToken?: string): void => {
      setTokens({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
      })
    },
    [setTokens],
  )

  const logout = useCallback((): void => {
    clearAuthTokens()
    setAccessTokenState(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      claims,
      role,
      isAuthenticated,
      isTokenExpired,
      login,
      logout,
      setTokens,
    }),
    [
      accessToken,
      claims,
      isAuthenticated,
      isTokenExpired,
      login,
      logout,
      role,
      setTokens,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
