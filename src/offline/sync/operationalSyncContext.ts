import type {
  AuthContextValue,
  AuthRole,
} from '../../core/auth/auth.types'
import { createOfflineScopeKey } from '../scope/offlineScope'
import type { OperationalSyncContext } from './sync.types'

function isOperationalRole(
  role: AuthRole | null,
): role is 'OWNER' | 'STAFF' | 'ADMIN' {
  return role === 'OWNER' || role === 'STAFF' || role === 'ADMIN'
}

/**
 * Converts authoritative auth state into the scope used by sync tasks.
 */
export function createOperationalSyncContext(
  auth: Pick<
    AuthContextValue,
    | 'currentUser'
    | 'isAuthenticated'
    | 'isLoadingSession'
    | 'role'
    | 'selectedClubSlug'
    | 'selectedCourtId'
  >,
): OperationalSyncContext | null {
  if (
    !auth.isAuthenticated ||
    auth.isLoadingSession ||
    !auth.currentUser ||
    !auth.selectedClubSlug ||
    !isOperationalRole(auth.role)
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
    assignedCourtId: auth.selectedCourtId ?? null,
    assignedCourtName: null,
  }
}
