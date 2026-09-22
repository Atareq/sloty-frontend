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
  invalidateAuthSession,
  refreshSession,
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
  ProfileId,
} from './auth.types'
import { isOperationalRole } from './auth.types'
import { fetchCurrentUserProfile } from './authApi'
import { getClub, listClubs } from '../../features/clubs/clubsApi'
import type { Club } from '../../features/clubs/clubs.types'
import { getCourt, listCourts } from '../../features/courts/courtsApi'
import type { Court } from '../../features/courts/courts.types'
import { fetchAllPages } from '../../shared/api/api.types'
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
import {
  clearSelectedCourtId,
  getSelectedCourtId,
  saveSelectedCourtId,
} from './selectedCourtStorage'
import { decodeAccessToken, isJwtExpired } from './tokenUtils'

function getClaims(accessToken: string | null): AuthClaims | null {
  return decodeAccessToken(accessToken)
}

function hasHydratableSession(): boolean {
  if (getRefreshToken()) {
    return true
  }

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
    profile_id: null,
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
 * Startup flow:
 *   1. Restore tokens from storage.
 *   2. If refresh token exists → call /me (silently refreshing access token if
 *      SESSION_EXPIRED via the shared single-flight refreshSession() in apiClient).
 *   3. On /me success for operational roles:
 *      a. If persisted club slug → direct GET /clubs/{slug}/ to validate.
 *         200 → keep. 403 CLUB_ACCESS_REVOKED / 404 → clear, load full list.
 *      b. If no valid club → fetchAllPages(listClubs) following `next` until null.
 *   4. Court restoration (only after valid club):
 *      a. If persisted court ID → direct GET /clubs/{slug}/courts/{id}/ to validate.
 *         200 → keep. 404 → clear. 403 CLUB_ACCESS_REVOKED → clear club + court.
 *      b. If no valid court → fetchAllPages(listCourts) following `next` until null.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const offlineContextWriteRef = useRef<Promise<void>>(Promise.resolve())
  const lastCourtLoadedClubSlugRef = useRef<string | null>(null)
  const [accessToken, setAccessTokenState] = useState<string | null>(() =>
    getAccessToken(),
  )
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null)
  const [accessibleClubs, setAccessibleClubs] = useState<Club[]>([])
  const [selectedClubSlug, setSelectedClubSlugState] = useState<string | null>(
    () => getSelectedClubSlug(),
  )
  const [accessibleCourts, setAccessibleCourts] = useState<Court[]>([])
  const [selectedCourtId, setSelectedCourtIdState] = useState<number | null>(
    () => getSelectedCourtId(),
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

  const role: AuthRole | null = useMemo(() => {
    return isOperationalRole(currentUser?.profile_role)
      ? currentUser.profile_role
      : null
  }, [currentUser])

  const currentProfileId: ProfileId | null = useMemo(() => {
    return currentUser?.profile_id ?? null
  }, [currentUser])

  const isOperational = useMemo(() => {
    return Boolean(isAuthenticated && !isLoadingSession && role)
  }, [isAuthenticated, isLoadingSession, role])

  // ── Internal helpers ──────────────────────────────────────────────────────

  /** Persists court ID and syncs React state. */
  const setSelectedCourtId = useCallback((id: number | null): void => {
    if (id === null) {
      clearSelectedCourtId()
    } else {
      saveSelectedCourtId(id)
    }
    setSelectedCourtIdState(id)
  }, [])

  const clearSession = useCallback((): void => {
    lastCourtLoadedClubSlugRef.current = null
    invalidateAuthSession()
    clearAuthTokens()
    clearSelectedClubSlug()
    clearSelectedCourtId()
    setAccessTokenState(null)
    setHasRefreshToken(false)
    setCurrentUser(null)
    setAccessibleClubs([])
    setAccessibleCourts([])
    setSelectedCourtIdState(null)
    setSelectedClubSlugState(null)
    setSessionError(null)
    setIsOfflineOperational(false)
  }, [])

  const hydrateOfflineContext = useCallback(
    (context: OfflineContextRecord): void => {
      saveSelectedClubSlug(context.selected_club_slug)
      setSelectedClubSlugState(context.selected_club_slug)
      setAccessibleClubs(context.accessible_clubs ?? [])
      setAccessibleCourts(context.accessible_courts ?? [])
      const courtId = context.selected_court_id ?? null
      if (courtId !== null) {
        saveSelectedCourtId(courtId)
      } else {
        clearSelectedCourtId()
      }
      setSelectedCourtIdState(courtId)
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
    lastCourtLoadedClubSlugRef.current = null
    clearSelectedClubSlug()
    clearSelectedCourtId()
    setSelectedClubSlugState(null)
    setSelectedCourtIdState(null)
    setAccessibleCourts([])
  }, [])

  const selectClub = useCallback((slug: string): void => {
    saveSelectedClubSlug(slug)
    setSelectedClubSlugState(slug)
    clearSelectedCourtId()
    setSelectedCourtIdState(null)
    setIsOfflineOperational(false)
  }, [])

  const selectCourt = useCallback((id: number | null): void => {
    setSelectedCourtId(id)
  }, [setSelectedCourtId])

  // ── Court list following `next` pagination ─────────────────────────────────

  /**
   * Fetches all court pages for a given club slug by following `next` links.
   * Never appends page_size. Reuses listCourts with nextUrl support.
   */
  const fetchAllCourtsForClub = useCallback(
    (clubSlug: string): Promise<Court[]> =>
      fetchAllPages((nextUrl) => listCourts(clubSlug, { nextUrl })),
    [],
  )

  // ── Startup: restore courts after a valid club is available ──────────────

  /**
   * Attempts to restore the selected court by direct retrieve.
   * Falls back to fetching all courts when no persisted ID exists or when
   * the retrieved court is no longer accessible.
   *
   * Returns true when the bootstrap resulted in a CLUB_ACCESS_REVOKED that
   * callers should propagate as a club-level revocation.
   */
  const restoreCourtForClub = useCallback(
    async (clubSlug: string): Promise<{ clubRevoked: boolean }> => {
      lastCourtLoadedClubSlugRef.current = clubSlug
      const persistedCourtId = getSelectedCourtId()

      if (persistedCourtId !== null) {
        try {
          // Direct retrieve: authoritative, no page scanning.
          const court = await getCourt(clubSlug, persistedCourtId)
          setSelectedCourtIdState(court.id)
          saveSelectedCourtId(court.id)
          setAccessibleCourts([court])
          return { clubRevoked: false }
        } catch (error) {
          const code = getApiErrorCode(error)

          if (code === 'CLUB_ACCESS_REVOKED') {
            // Club-level revocation: propagate up to the caller.
            return { clubRevoked: true }
          }

          if (isApiClientError(error) && error.status === 404) {
            // 404: the persisted court is gone; clear court only.
            clearSelectedCourtId()
            setSelectedCourtIdState(null)
            // Fall through to load court list.
          } else {
            // Network or server error: preserve recoverable state.
            return { clubRevoked: false }
          }
        }
      }

      // No valid persisted court: load all accessible courts for the club.
      try {
        const courts = await fetchAllCourtsForClub(clubSlug)
        setAccessibleCourts(courts)

        if (courts.length === 1) {
          setSelectedCourtId(courts[0].id)
        } else if (courts.length > 1) {
          setSelectedCourtIdState((prev) => {
            if (prev && courts.some((c) => c.id === prev)) {
              return prev
            }
            return courts[0].id
          })
        } else {
          setSelectedCourtId(null)
        }
      } catch {
        // Court list unavailable; leave courts empty; do not fail the bootstrap.
      }

      return { clubRevoked: false }
    },
    [fetchAllCourtsForClub, setSelectedCourtId],
  )

  // ── Main session bootstrap ─────────────────────────────────────────────────

  const clearAuthOnly = useCallback((): void => {
    lastCourtLoadedClubSlugRef.current = null
    invalidateAuthSession()
    clearAuthTokens()
    setAccessTokenState(null)
    setHasRefreshToken(false)
    setCurrentUser(null)
    setSessionError(null)
    setIsOfflineOperational(false)
    setIsLoadingSession(false)
  }, [])

  const refreshCurrentUser = useCallback(async (): Promise<void> => {
    let currentToken = accessToken
    const currentClaims = claims
    let activeUserId = claims?.user_id
    const hasRefresh = Boolean(getRefreshToken())
    const hasValidAccess = Boolean(currentToken && currentClaims && !isJwtExpired(currentClaims))

    if (!hasRefresh && !hasValidAccess) {
      const hydrated =
        await hydrateLatestOfflineContextForSelectedClub(selectedClubSlug)
      if (!hydrated) {
        clearAuthOnly()
      }
      setIsLoadingSession(false)
      return
    }

    if (
      (!currentToken || !currentClaims || isJwtExpired(currentClaims)) &&
      hasRefresh
    ) {
      setIsLoadingSession(true)
      const refreshResult = await refreshSession()
      if (refreshResult.status === 'success') {
        currentToken = refreshResult.accessToken
        activeUserId = getClaims(currentToken)?.user_id ?? activeUserId
        setAccessTokenState(currentToken)
        setHasRefreshToken(true)
      } else if (refreshResult.status === 'network_error') {
        const hydrated =
          await hydrateLatestOfflineContextForSelectedClub(selectedClubSlug)
        if (
          !hydrated &&
          selectedClubSlug &&
          activeUserId
        ) {
          await hydrateOfflineContextForScope(
            activeUserId,
            selectedClubSlug,
          )
        }
        setIsLoadingSession(false)
        return
      } else if (refreshResult.status === 'aborted') {
        setIsLoadingSession(false)
        return
      } else {
        const code = refreshResult.code
        if (
          code === 'TOKEN_NOT_VALID' ||
          code === 'PASSWORD_CHANGED' ||
          code === 'USER_INACTIVE' ||
          code === 'USER_DELETED'
        ) {
          clearSession()
        } else {
          clearAuthOnly()
        }
        setIsLoadingSession(false)
        return
      }
    }

    if (!currentToken) {
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

      if (!isOperationalRole(profile.profile_role)) {
        setAccessibleClubs([])
        setAccessibleCourts([])
        clearSelectedCourtId()
        setSelectedCourtIdState(null)
        clearSelectedClub()
        setIsLoadingSession(false)
        return
      }

      // ── Club restoration ─────────────────────────────────────────────────
      //
      // Priority:
      //   1. Persisted slug → direct GET /clubs/{slug}/ (authoritative).
      //      200 → keep slug. CLUB_ACCESS_REVOKED / 404 → clear slug, list result determines new selection.
      //   2. Always fetchAllPages(listClubs) to populate accessibleClubs for the UI selector.

      let activeSlug: string | null = getSelectedClubSlug()
      let clubs: Club[] = []

      if (profile.profile_role !== 'ADMIN') {
        // Load all accessible clubs (following `next` pages) — always needed for the UI.
        try {
          clubs = await fetchAllPages(listClubs)
          setAccessibleClubs(clubs)
        } catch (error) {
          // Without a persisted slug, an empty list is indistinguishable from
          // "no club access". Fail bootstrap so the user can retry.
          if (!activeSlug) {
            throw error
          }
        }

        if (activeSlug) {
          // Step 1: Direct retrieve validates the persisted slug authoritatively (O(1)).
          try {
            const validatedClub = await getClub(activeSlug)
            // Slug validated — keep activeSlug and ensure it's in accessibleClubs.
            if (!clubs.some((c) => c.slug === activeSlug)) {
              clubs = [validatedClub, ...clubs]
              setAccessibleClubs(clubs)
            }
          } catch (error) {
            const code = getApiErrorCode(error)

            if (
              code === 'CLUB_ACCESS_REVOKED' ||
              (isApiClientError(error) && error.status === 404)
            ) {
              // Stale slug: clear and fall through to auto-select from list.
              clearSelectedClub()
              clearSelectedCourtId()
              activeSlug = null
            } else {
              // Network or server error: do not clear, preserve recoverable context.
              throw error
            }
          }
        }

        // Auto-select when no valid selection exists and exactly one club is accessible.
        if (!activeSlug) {
          if (clubs.length === 1) {
            activeSlug = clubs[0].slug
            selectClub(clubs[0].slug)
          } else {
            // No valid selection — user must pick.
          }
        }
      }

      // ADMIN can operate without a club.
      if (profile.profile_role === 'ADMIN' && !activeSlug) {
        setIsLoadingSession(false)
        return
      }

      // ── Court restoration ─────────────────────────────────────────────────
      if (activeSlug) {
        const { clubRevoked } = await restoreCourtForClub(activeSlug)

        if (clubRevoked) {
          // Club was revoked after club retrieve succeeded (e.g. race condition).
          clearSelectedClub()
          clearSelectedCourtId()
          // Reload clubs without the revoked one.
          try {
            clubs = await fetchAllPages(listClubs)
            setAccessibleClubs(clubs)
            if (clubs.length === 1) {
              selectClub(clubs[0].slug)
            }
          } catch {
            // Silently continue.
          }
        }
      }

    } catch (error) {
      if (!getAccessToken()) {
        return
      }

      if (
        getApiErrorCode(error) === 'NETWORK_ERROR' &&
        selectedClubSlug &&
        activeUserId &&
        (await hydrateOfflineContextForScope(activeUserId, selectedClubSlug))
      ) {
        return
      }

      const accountStateAction = getAccountStateAction(error)

      if (accountStateAction.type === 'clear_user') {
        if (activeUserId) {
          await safelyClearUserOperationalData(activeUserId)
        }
        clearSession()
        return
      }

      if (accountStateAction.type === 'clear_club') {
        if (accountStateAction.clubSlug && activeUserId) {
          await safelyClearScope({
            userId: activeUserId,
            clubSlug: accountStateAction.clubSlug,
          })
        }

        if (
          accountStateAction.clubSlug &&
          selectedClubSlug === accountStateAction.clubSlug
        ) {
          clearSelectedClub()
          clearSelectedCourtId()
        }

        // Do not clear tokens for club-level revocation.
        return
      }

      if (accountStateAction.type === 'auth_required') {
        clearAuthOnly()
        if (
          accountStateAction.code === 'TOKEN_NOT_VALID' ||
          accountStateAction.code === 'PASSWORD_CHANGED'
        ) {
          clearSession()
        } else {
          clearAuthOnly()
        }
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
    restoreCourtForClub,
    selectClub,
    selectedClubSlug,
  ])

  // When selectedClubSlug changes online, refresh courts.
  useEffect(() => {
    if (!selectedClubSlug || isOfflineOperational || !currentUser) {
      return
    }

    if (lastCourtLoadedClubSlugRef.current === selectedClubSlug) {
      return
    }
    lastCourtLoadedClubSlugRef.current = selectedClubSlug

    let isMounted = true

    void fetchAllCourtsForClub(selectedClubSlug).then(
      (courts) => {
        if (!isMounted) {
          return
        }
        setAccessibleCourts(courts)
        if (courts.length === 1) {
          setSelectedCourtId(courts[0].id)
        } else if (courts.length > 1) {
          setSelectedCourtIdState((prev) => {
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
  }, [currentUser, fetchAllCourtsForClub, isOfflineOperational, selectedClubSlug, setSelectedCourtId])

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
    return subscribeSessionExpired((code) => {
      const shouldClearUserData =
        code === 'USER_DELETED' || code === 'USER_INACTIVE'
      const userId = currentUser?.id ?? claims?.user_id

      if (shouldClearUserData && typeof userId === 'number') {
        void safelyClearUserOperationalData(userId).finally(() => {
          clearSession()
        })
        return
      }

      clearSession()
    })
  }, [claims?.user_id, clearSession, currentUser?.id])

  useEffect(() => {
    if (!accessToken) {
      if (getRefreshToken()) {
        queueMicrotask(() => {
          void refreshCurrentUser()
        })
        return
      }

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
      if (getRefreshToken()) {
        queueMicrotask(() => {
          void refreshCurrentUser()
        })
        return
      }

      queueMicrotask(() => {
        clearAuthOnly()
        clearSession()
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
    clearSession,
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
    invalidateAuthSession()
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
      currentProfileId,
      selectedClubSlug,
      accessibleClubs,
      selectedCourtId,
      accessibleCourts,
      role,
      isAuthenticated,
      isOperational,
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
      currentProfileId,
      currentUser,
      isAuthenticated,
      isLoadingSession,
      isOperational,
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
