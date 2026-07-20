import { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '../api/apiError.helpers'
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
import {
  clearSelectedClubSlug,
  getSelectedClubSlug,
  saveSelectedClubSlug,
} from './selectedClubStorage'
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
  const [selectedClubSlug, setSelectedClubSlugState] = useState<string | null>(
    () => getSelectedClubSlug(),
  )
  const [isLoadingSession, setIsLoadingSession] = useState(hasUsableStoredToken)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const claims = useMemo(() => getClaims(accessToken), [accessToken])
  const isTokenExpired = isJwtExpired(claims)
  const isAuthenticated = Boolean(accessToken && claims && !isTokenExpired)
  const selectedMembership = useMemo(() => {
    if (!currentUser || !selectedClubSlug) {
      return null
    }

    return (
      currentUser.memberships.find(
        (membership) => membership.club.slug === selectedClubSlug,
      ) ?? null
    )
  }, [currentUser, selectedClubSlug])
  const role: AuthRole | null = useMemo(() => {
    if (currentUser?.is_platform_admin) {
      return 'PLATFORM_ADMIN'
    }

    return selectedMembership?.role ?? claims?.role ?? null
  }, [claims, currentUser, selectedMembership])

  const clearSession = useCallback((): void => {
    clearAuthTokens()
    clearSelectedClubSlug()
    setAccessTokenState(null)
    setCurrentUser(null)
    setSelectedClubSlugState(null)
    setSessionError(null)
    setIsLoadingSession(false)
  }, [])

  const setTokens = useCallback((tokens: AuthTokens): void => {
    setAccessToken(tokens.accessToken)
    setRefreshToken(tokens.refreshToken)
    setCurrentUser(null)
    setSessionError(null)
    setIsLoadingSession(true)
    setAccessTokenState(tokens.accessToken)
  }, [])

  const clearSelectedClub = useCallback((): void => {
    clearSelectedClubSlug()
    setSelectedClubSlugState(null)
  }, [])

  const selectClub = useCallback((slug: string): void => {
    saveSelectedClubSlug(slug)
    setSelectedClubSlugState(slug)
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
      setSessionError(getApiErrorMessage(error, 'تعذر تحميل بيانات الحساب'))
    } finally {
      if (getAccessToken() === accessToken) {
        setIsLoadingSession(false)
      }
    }
  }, [accessToken, claims, clearSession])

  useEffect(() => {
    if (!currentUser || currentUser.is_platform_admin) {
      return
    }

    const memberships = currentUser.memberships

    if (memberships.length === 0) {
      queueMicrotask(() => {
        clearSelectedClub()
      })
      return
    }

    if (memberships.length === 1) {
      const [membership] = memberships
      if (selectedClubSlug !== membership.club.slug) {
        queueMicrotask(() => {
          selectClub(membership.club.slug)
        })
      }
      return
    }

    const hasSelectedMembership = memberships.some(
      (membership) => membership.club.slug === selectedClubSlug,
    )

    if (selectedClubSlug && !hasSelectedMembership) {
      queueMicrotask(() => {
        clearSelectedClub()
      })
    }
  }, [clearSelectedClub, currentUser, selectClub, selectedClubSlug])

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

      return nextClaims.role ?? null
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
      selectedClubSlug,
      selectedMembership,
      role,
      isAuthenticated,
      isLoadingSession,
      isTokenExpired,
      sessionError,
      login,
      logout,
      selectClub,
      clearSelectedClub,
      refreshCurrentUser,
      setTokens,
    }),
    [
      accessToken,
      claims,
      clearSelectedClub,
      currentUser,
      isAuthenticated,
      isLoadingSession,
      isTokenExpired,
      login,
      logout,
      refreshCurrentUser,
      role,
      selectClub,
      selectedClubSlug,
      selectedMembership,
      sessionError,
      setTokens,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
