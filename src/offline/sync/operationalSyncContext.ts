import type {
  AuthContextValue,
  AuthRole,
  CurrentUserMembership,
} from '../../core/auth/auth.types'
import { createOfflineScopeKey } from '../scope/offlineScope'
import type { OperationalSyncContext } from './sync.types'

function isOperationalRole(
  role: AuthRole | null,
): role is 'OWNER' | 'MANAGER' | 'STAFF' | 'PLATFORM_ADMIN' {
  return (
    role === 'OWNER' ||
    role === 'MANAGER' ||
    role === 'STAFF' ||
    role === 'PLATFORM_ADMIN'
  )
}

function hasSelectedOperationalMembership(
  membership: CurrentUserMembership | null,
): membership is CurrentUserMembership {
  return Boolean(membership)
}

/**
 * Converts authoritative auth state into the scope used by sync tasks.
 *
 * Platform Admins only receive an operational sync context when they have
 * selected a concrete Club membership. There is no all-platform cache scope.
 */
export function createOperationalSyncContext(
  auth: Pick<
    AuthContextValue,
    | 'currentUser'
    | 'isAuthenticated'
    | 'isLoadingSession'
    | 'role'
    | 'selectedClubSlug'
    | 'selectedMembership'
  >,
): OperationalSyncContext | null {
  if (
    !auth.isAuthenticated ||
    auth.isLoadingSession ||
    !auth.currentUser ||
    !auth.selectedClubSlug ||
    !isOperationalRole(auth.role) ||
    !hasSelectedOperationalMembership(auth.selectedMembership)
  ) {
    return null
  }

  const scope = {
    userId: auth.currentUser.id,
    clubSlug: auth.selectedClubSlug,
  }

  return {
    ...scope,
    scopeKey: createOfflineScopeKey(scope),
    role: auth.role,
    membership: auth.selectedMembership,
    membershipId: auth.selectedMembership.id,
    assignedCourtId: auth.selectedMembership.court?.id ?? null,
    assignedCourtName: auth.selectedMembership.court?.name ?? null,
  }
}
