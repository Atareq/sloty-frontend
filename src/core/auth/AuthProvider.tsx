import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  safelyClearScope,
  safelyClearUserOperationalData,
  safelyPersistOfflineContext,
  safelyReadLatestOfflineContextForClub,
  safelyReadOfflineContext,
} from '../../offline/security/offlineStorageSafety'
import type {
  OfflineContextInput,
  OfflineContextRecord,
} from '../../offline/offline.types'
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
import { listClubs } from '../../features/clubs/clubsApi'
import type { Club } from '../../features/clubs/clubs.types'
import { listCourts } from '../../features/courts/courtsApi'
import type { Court } from '../../features/courts/courts.types'
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
    profile_role: context.role,
    account_created_by: null,
  }
}

/**
 * Provides authenticated profile and club access context to the frontend.
 *
 * The provider hydrates the `/me` profile for account identity and `profile_role`,
 * loads backend-scoped `/clubs/`, and manages court availability for the active club.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const offlineContextWriteRef = useRef<Promise<void>>(Promise.resolve())
  const [accessToken, setAccessTokenState] = useState<string | null>(() =>
    getAccessToken(),
  )
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null)
  const [accessibleClubs, setAccessibleClubs] = useState<Club[]>([])
  const [selectedClubSlug, setSelectedClubSlugState] = useState<string | null>(
    () => getSelectedClubSlug(),
  )
  const [accessibleCourts, setAccessibleCourts] = useState<Court[]>([])
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null)
  const [offlineRole, setOfflineRole] = useState<AuthRole | null>(null)
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

  const role: AuthRole | null = useMemo(() => {
    return currentUser?.profile_role ?? offlineRole ?? null
  }, [currentUser, offlineRole])

  const clearSession = useCallback((): void => {
    clearAuthTokens()
    clearSelectedClubSlug()
    setAccessTokenState(null)
    setHasRefreshToken(false)
    setCurrentUser(null)
    setAccessibleClubs([])
    setAccessibleCourts([])
    setSelectedCourtId(null)
    setOfflineRole(null)
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
    setOfflineRole(null)
    setSessionError(null)
    setIsOfflineOperational(false)
    setIsLoadingSession(false)
  }, [])

  const hydrateOfflineContext = useCallback(
    (context: OfflineContextRecord): void => {
      saveSelectedClubSlug(context.selected_club_slug)
      setSelectedClubSlugState(context.selected_club_slug)
      setOfflineRole(context.role)
      setAccessibleClubs(context.accessible_clubs ?? [])
      setAccessibleCourts(context.accessible_courts ?? [])
      setSelectedCourtId(context.selected_court_id ?? null)
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
    setOfflineRole(null)
    setSessionError(null)
    setIsOfflineOperational(false)
    setIsLoadingSession(true)
    setAccessTokenState(tokens.accessToken)
  }, [])

  const clearSelectedClub = useCallback((): void => {
    clearSelectedClubSlug()
    setSelectedClubSlugState(null)
    setSelectedCourtId(null)
    setAccessibleCourts([])
  }, [])

  const selectClub = useCallback((slug: string): void => {
    saveSelectedClubSlug(slug)
    setSelectedClubSlugState(slug)
    setSelectedCourtId(null)
    setIsOfflineOperational(false)
  }, [])

  const selectCourt = useCallback((id: number | null): void => {
    setSelectedCourtId(id)
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
      setOfflineRole(null)
      setIsOfflineOperational(false)

      let clubs: Club[] = []
      try {
        const clubsResponse = await listClubs()
        clubs = Array.isArray(clubsResponse)
          ? clubsResponse
          : (clubsResponse.results ?? [])
        setAccessibleClubs(clubs)
      } catch {
        // Continue with profile if club list fails
      }

      let activeSlug = selectedClubSlug
      if (profile.profile_role === 'ADMIN') {
        // Platform admin can operate without a club
      } else if (clubs.length === 0) {
        activeSlug = null
        clearSelectedClub()
      } else if (clubs.length === 1) {
        activeSlug = clubs[0].slug
        selectClub(clubs[0].slug)
      } else {
        const hasValidClub = clubs.some((c) => c.slug === selectedClubSlug)
        if (!hasValidClub) {
          activeSlug = null
          clearSelectedClub()
        }
      }

      if (activeSlug) {
        try {
          const courtsResponse = await listCourts(activeSlug)
          const courts = Array.isArray(courtsResponse)
            ? courtsResponse
            : (courtsResponse.results ?? [])
          setAccessibleCourts(courts)

          if (courts.length === 1) {
            setSelectedCourtId(courts[0].id)
          } else if (courts.length > 1) {
            setSelectedCourtId((prev) => {
              if (prev && courts.some((c) => c.id === prev)) {
                return prev
              }
              return courts[0].id
            })
          } else {
            setSelectedCourtId(null)
          }
        } catch {
          // Continue if court list fails
        }
      }
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
    selectClub,
    selectedClubSlug,
  ])

  // When selectedClubSlug changes online, refresh courts
  useEffect(() => {
    if (!selectedClubSlug || isOfflineOperational || !currentUser) {
      return
    }

    let isMounted = true

    void listCourts(selectedClubSlug).then(
      (courtsResponse) => {
        if (!isMounted) {
          return
        }
        const courts = Array.isArray(courtsResponse)
          ? courtsResponse
          : (courtsResponse.results ?? [])
        setAccessibleCourts(courts)
        if (courts.length === 1) {
          setSelectedCourtId(courts[0].id)
        } else if (courts.length > 1) {
          setSelectedCourtId((prev) => {
            if (prev && courts.some((c) => c.id === prev)) {
              return prev
            }
            return courts[0].id
          })
        } else {
          setSelectedCourtId(null)
        }
      },
      () => {},
    )

    return () => {
      isMounted = false
    }
  }, [currentUser, isOfflineOperational, selectedClubSlug])

  useEffect(() => {
    if (
      !currentUser ||
      !selectedClubSlug ||
      !role ||
      isOfflineOperational
    ) {
      return
    }

    const contextInput: OfflineContextInput = {
      scope: {
        userId: currentUser.id,
        clubSlug: selectedClubSlug,
      },
      displayName: getAuthenticatedUserDisplayName(currentUser, claims?.name),
      role,
      selectedClubSlug,
      accessibleClubs,
      accessibleCourts,
      selectedCourtId,
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
    accessibleClubs,
    accessibleCourts,
    claims?.name,
    currentUser,
    isOfflineOperational,
    role,
    selectedClubSlug,
    selectedCourtId,
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
      accessibleClubs,
      selectedCourtId,
      accessibleCourts,
      role,
      isAuthenticated,
      isLoadingSession,
      isTokenExpired,
      sessionError,
      login,
      logout,
      selectClub,
      clearSelectedClub,
      selectCourt,
      refreshCurrentUser,
      setTokens,
    }),
    [
      accessToken,
      accessibleClubs,
      accessibleCourts,
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
      selectCourt,
      selectedClubSlug,
      selectedCourtId,
      sessionError,
      setTokens,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
