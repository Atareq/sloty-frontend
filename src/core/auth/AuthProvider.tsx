import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiClientError } from '../api/apiClient'
import type {
  AuthClaims,
  AuthContextValue,
  AuthProviderProps,
  AuthRole,
  AuthTokens,
  CurrentUserProfile,
} from './auth.types'
import { fetchCurrentUserProfile } from './authApi'
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

function hasUsableStoredToken(): boolean {
  const storedAccessToken = getAccessToken()
  const storedClaims = getClaims(storedAccessToken)

  return Boolean(storedAccessToken && storedClaims && !isJwtExpired(storedClaims))
}

/**
 * Provides decoded JWT auth state to the frontend.
 *
 * The provider decodes access tokens in one place, hydrates the `/me` profile
 * for display data, and exposes role/navigation state for UI decisions. It
 * does not implement backend permissions.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessTokenState] = useState<string | null>(() =>
    getAccessToken(),
  )
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(hasUsableStoredToken)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const claims = useMemo(() => getClaims(accessToken), [accessToken])
  const role: AuthRole | null = claims?.role ?? null
  const isTokenExpired = isJwtExpired(claims)
  const isAuthenticated = Boolean(accessToken && claims && !isTokenExpired)

  const clearSession = useCallback((): void => {
    clearAuthTokens()
    setAccessTokenState(null)
    setCurrentUser(null)
    setSessionError(null)
  }, [])

  const setTokens = useCallback((tokens: AuthTokens): void => {
    setAccessToken(tokens.accessToken)
    setRefreshToken(tokens.refreshToken)
    setCurrentUser(null)
    setSessionError(null)
    setAccessTokenState(tokens.accessToken)
  }, [])

  const refreshCurrentUser = useCallback(async (): Promise<void> => {
    if (!accessToken || !claims || isJwtExpired(claims)) {
      clearSession()
      setIsLoadingSession(false)
      return
    }

    setIsLoadingSession(true)
    setSessionError(null)

    try {
      const profile = await fetchCurrentUserProfile()

      if (getAccessToken() !== accessToken) {
        return
      }

      setCurrentUser(profile)
    } catch (error) {
      if (getAccessToken() !== accessToken) {
        return
      }

      if (
        error instanceof ApiClientError &&
        (error.status === 401 || error.status === 403)
      ) {
        clearSession()
        return
      }

      setCurrentUser(null)
      setSessionError('تعذر تحميل بيانات الحساب')
    } finally {
      if (getAccessToken() === accessToken) {
        setIsLoadingSession(false)
      }
    }
  }, [accessToken, claims, clearSession])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    if (!isAuthenticated) {
      queueMicrotask(() => {
        clearSession()
        setIsLoadingSession(false)
      })
      return
    }

    queueMicrotask(() => {
      void refreshCurrentUser()
    })
  }, [accessToken, clearSession, isAuthenticated, refreshCurrentUser])

  const login = useCallback(
    (nextAccessToken: string, nextRefreshToken?: string): AuthRole | null => {
      const nextClaims = getClaims(nextAccessToken)

      if (!nextClaims || isJwtExpired(nextClaims)) {
        return null
      }

      setTokens({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
      })

      return nextClaims.role
    },
    [setTokens],
  )

  const logout = useCallback((): void => {
    clearSession()
    setIsLoadingSession(false)
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      claims,
      currentUser,
      role,
      isAuthenticated,
      isLoadingSession,
      isTokenExpired,
      sessionError,
      login,
      logout,
      refreshCurrentUser,
      setTokens,
    }),
    [
      accessToken,
      claims,
      currentUser,
      isAuthenticated,
      isLoadingSession,
      isTokenExpired,
      login,
      logout,
      refreshCurrentUser,
      role,
      sessionError,
      setTokens,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
