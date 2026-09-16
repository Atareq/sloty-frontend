import { describe, expect, it } from 'vitest'
import type {
  AuthContextValue,
  CurrentUserProfile,
} from '../../core/auth/auth.types'
import { createOperationalSyncContext } from './operationalSyncContext'

const profile: CurrentUserProfile = {
  id: 1,
  username: 'staff',
  email: 'staff@example.com',
  first_name: 'Staff',
  last_name: 'User',
  phone_number: null,
  is_active: true,
  profile_role: 'STAFF',
  account_created_by: null,
}

function authValue(
  overrides: Partial<AuthContextValue>,
): Pick<
  AuthContextValue,
  | 'currentUser'
  | 'isAuthenticated'
  | 'isLoadingSession'
  | 'role'
  | 'selectedClubSlug'
  | 'selectedCourtId'
> {
  return {
    currentUser: profile,
    isAuthenticated: true,
    isLoadingSession: false,
    role: 'STAFF',
    selectedClubSlug: 'club-a',
    selectedCourtId: 7,
    ...overrides,
  }
}

describe('createOperationalSyncContext', () => {
  it('waits for authenticated user and selected Club readiness', () => {
    expect(
      createOperationalSyncContext(authValue({ currentUser: null })),
    ).toBeNull()
    expect(
      createOperationalSyncContext(authValue({ selectedClubSlug: null })),
    ).toBeNull()
    expect(
      createOperationalSyncContext(authValue({ isLoadingSession: true })),
    ).toBeNull()
  })

  it('builds a scoped operational context without inventing another Staff Court', () => {
    const context = createOperationalSyncContext(authValue({}))

    expect(context).toMatchObject({
      userId: 1,
      clubSlug: 'club-a',
      scopeKey: 'user:1:club:club-a',
      role: 'STAFF',
      assignedCourtId: 7,
      assignedCourtName: null,
    })
  })

  it('uses null assignedCourtId when no court is selected', () => {
    const context = createOperationalSyncContext(
      authValue({ selectedCourtId: null }),
    )

    expect(context).not.toBeNull()
    expect(context?.assignedCourtId).toBeNull()
  })

  it('does not create a sync context when role is null', () => {
    expect(
      createOperationalSyncContext(
        authValue({
          role: null,
        }),
      ),
    ).toBeNull()
  })
})
