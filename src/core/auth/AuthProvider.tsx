import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  safelyClearScope,
  safelyClearUserOperationalData,
  safelyPersistOfflineContext,
  safelyReadLatestOfflineContextForClub,
  safelyReadOfflineContext,
} from '../../offline/security/offlineStorageSafety'
import type { OfflineContextRecord } from '../../offline/offline.types'
import { getAuthenticatedUserDisplayName } from '../../shared/utils/displayNames'
import {
  getApiErrorCode,
  getApiErrorMessage,
  isApiClientError,
} from '../api/apiError.helpers'
import {
  subscribeAccessToken,
  subscribeSessionExpired,
} from '../api/apiClient'
import { getAccountStateAction } from './accountState'
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
  getRefreshToken,
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

function hasHydratableSession(): boolean {
  const storedAccessToken = getAccessToken()
  const storedClaims = getClaims(storedAccessToken)

  if (!storedAccessToken || !storedClaims) {
    return false
  }

  if (!isJwtExpired(storedClaims)) {
    return true
  }

  return Boolean(getRefreshToken())
}

function hasBrowserOfflineHint(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function createOfflineUserProfile(
  context: OfflineContextRecord,
): CurrentUserProfile {
  return {
    id: context.user_id,
    username: context.display_name,
    email: '',
    first_name: context.display_name,
    last_name: '',
    phone_number: null,
    is_active: true,
    /*
     * Offline operational hydration is Club-scoped. Even when the last
     * verified user is also a Platform Admin, the offline profile must not
     * recreate all-platform authority without a live `/me` verification.
     */
    is_platform_admin: false,
    account_created_by: null,
    requires_club_selection: false,
    memberships: [
      {
        id: context.membership_id,
        role: context.role,
        club: {
          id: 0,
          slug: context.selected_club_slug,
          name: context.selected_club_slug,
          is_active: true,
        },
        court:
          context.assigned_court_id === null
            ? null
            : {
                id: context.assigned_court_id,
                name: context.assigned_court_name ?? 'ملعب محدد',
              },
      },
    ],
  }
}

/**
 * Provides decoded JWT auth state to the frontend.
 *
 * The provider decodes access tokens in one place, hydrates the `/me` profile
 * for display data, and exposes role/navigation state for UI decisions. It
 * does not implement backend permissions.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const offlineContextWriteRef = useRef<Promise<void>>(Promise.resolve())
  const [accessToken, setAccessTokenState] = useState<string | null>(() =>
    getAccessToken(),
  )
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null)
  const [selectedClubSlug, setSelectedClubSlugState] = useState<string | null>(
    () => getSelectedClubSlug(),
  )
  const [isLoadingSession, setIsLoadingSession] = useState(hasHydratableSession)
  const [hasRefreshToken, setHasRefreshToken] = useState(() =>
    Boolean(getRefreshToken()),
  )
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [isOfflineOperational, setIsOfflineOperational] = useState(false)
  const claims = useMemo(() => getClaims(accessToken), [accessToken])
  const isTokenExpired = isJwtExpired(claims)
  const isOnlineAuthenticated = Boolean(
    accessToken && claims && (!isTokenExpired || hasRefreshToken),
  )
  const isAuthenticated = isOnlineAuthenticated || isOfflineOperational
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
    setHasRefreshToken(false)
    setCurrentUser(null)
    setSelectedClubSlugState(null)
    setSessionError(null)
    setIsOfflineOperational(false)
    setIsLoadingSession(false)
  }, [])

  const clearAuthOnly = useCallback((): void => {
    clearAuthTokens()
    setAccessTokenState(null)
    setHasRefreshToken(false)
    setCurrentUser(null)
    setSessionError(null)
    setIsOfflineOperational(false)
    setIsLoadingSession(false)
  }, [])

  const hydrateOfflineContext = useCallback(
    (context: OfflineContextRecord): void => {
      saveSelectedClubSlug(context.selected_club_slug)
      setSelectedClubSlugState(context.selected_club_slug)
      setCurrentUser(createOfflineUserProfile(context))
      setSessionError(null)
      setIsOfflineOperational(true)
      setIsLoadingSession(false)
    },
    [],
  )

  const hydrateOfflineContextForScope = useCallback(
    async (userId: number, clubSlug: string): Promise<boolean> => {
      const context = await safelyReadOfflineContext({ userId, clubSlug })

      if (!context) {
        return false
      }

      hydrateOfflineContext(context)
      return true
    },
    [hydrateOfflineContext],
  )

  const hydrateLatestOfflineContextForSelectedClub = useCallback(
    async (clubSlug: string | null): Promise<boolean> => {
      if (!clubSlug || !hasBrowserOfflineHint()) {
        return false
      }

      const context = await safelyReadLatestOfflineContextForClub(clubSlug)

      if (!context) {
        return false
      }

      hydrateOfflineContext(context)
      return true
    },
    [hydrateOfflineContext],
  )

  const setTokens = useCallback((tokens: AuthTokens): void => {
    setAccessToken(tokens.accessToken)
    setRefreshToken(tokens.refreshToken)
    setHasRefreshToken(Boolean(tokens.refreshToken))
    setCurrentUser(null)
    setSessionError(null)
    setIsOfflineOperational(false)
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
    setIsOfflineOperational(false)
  }, [])

  const refreshCurrentUser = useCallback(async (): Promise<void> => {
    if (!accessToken || !claims) {
      if (
        !getRefreshToken() &&
        !(await hydrateLatestOfflineContextForSelectedClub(selectedClubSlug))
      ) {
        clearAuthOnly()
      }
      setIsLoadingSession(false)
      return
    }

    setIsLoadingSession(true)
    setSessionError(null)

    try {
      const profile = await fetchCurrentUserProfile()

      if (!getAccessToken()) {
        return
      }

      setCurrentUser(profile)
      setIsOfflineOperational(false)
    } catch (error) {
      if (!getAccessToken()) {
        return
      }

      if (
        getApiErrorCode(error) === 'NETWORK_ERROR' &&
        selectedClubSlug &&
        (await hydrateOfflineContextForScope(claims.user_id, selectedClubSlug))
      ) {
        return
      }

      const accountStateAction = getAccountStateAction(error)

      if (accountStateAction.type === 'clear_user') {
        await safelyClearUserOperationalData(claims.user_id)
        clearSession()
        return
      }

      if (accountStateAction.type === 'clear_club') {
        if (accountStateAction.clubSlug) {
          await safelyClearScope({
            userId: claims.user_id,
            clubSlug: accountStateAction.clubSlug,
          })
        }

        if (
          accountStateAction.clubSlug &&
          selectedClubSlug === accountStateAction.clubSlug
        ) {
          clearSelectedClub()
        }

        clearAuthOnly()
        return
      }

      if (accountStateAction.type === 'auth_required') {
        clearAuthOnly()
        return
      }

      if (
        isApiClientError(error) &&
        (error.status === 401 || error.status === 403)
      ) {
        clearAuthOnly()
        return
      }

      setCurrentUser(null)
      setIsOfflineOperational(false)
      setSessionError(getApiErrorMessage(error, 'تعذر تحميل بيانات الحساب'))
    } finally {
      if (getAccessToken() || isOfflineOperational) {
        setIsLoadingSession(false)
      }
    }
  }, [
    accessToken,
    claims,
    clearAuthOnly,
    clearSelectedClub,
    clearSession,
    hydrateLatestOfflineContextForSelectedClub,
    hydrateOfflineContextForScope,
    isOfflineOperational,
    selectedClubSlug,
  ])

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
    if (
      !currentUser ||
      !selectedMembership ||
      !selectedClubSlug ||
      isOfflineOperational
    ) {
      return
    }

    const contextInput = {
      scope: {
        userId: currentUser.id,
        clubSlug: selectedClubSlug,
      },
      displayName: getAuthenticatedUserDisplayName(currentUser, claims?.name),
      isPlatformAdmin: currentUser.is_platform_admin,
      membership: selectedMembership,
      lastVerifiedAt: new Date().toISOString(),
    }

    // Serialize verified-context writes so an explicit logout can wait for any
    // already-started write before deleting this user's operational data.
    offlineContextWriteRef.current = offlineContextWriteRef.current.then(
      async () => {
        await safelyPersistOfflineContext(contextInput)
      },
    )
  }, [
    claims?.name,
    currentUser,
    isOfflineOperational,
    selectedClubSlug,
    selectedMembership,
  ])

  useEffect(() => {
    return subscribeAccessToken((token) => {
      setAccessTokenState(token)
    })
  }, [])

  useEffect(() => {
    return subscribeSessionExpired(() => {
      clearAuthOnly()
    })
  }, [clearAuthOnly])

  useEffect(() => {
    if (!accessToken) {
      queueMicrotask(() => {
        void hydrateLatestOfflineContextForSelectedClub(selectedClubSlug).then(
          (hydrated) => {
            if (!hydrated) {
              setIsLoadingSession(false)
            }
          },
        )
      })
      return
    }

    if (!isAuthenticated) {
      queueMicrotask(() => {
        clearAuthOnly()
        setIsLoadingSession(false)
      })
      return
    }

    if (currentUser) {
      return
    }

    queueMicrotask(() => {
      void refreshCurrentUser()
    })
  }, [
    accessToken,
    clearAuthOnly,
    currentUser,
    hydrateLatestOfflineContextForSelectedClub,
    isAuthenticated,
    refreshCurrentUser,
    selectedClubSlug,
  ])

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

  const logout = useCallback(async (): Promise<void> => {
    const userId = currentUser?.id ?? claims?.user_id

    await offlineContextWriteRef.current

    if (userId) {
      await safelyClearUserOperationalData(userId)
    }

    clearSession()
    setIsLoadingSession(false)
  }, [claims?.user_id, clearSession, currentUser?.id])

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
