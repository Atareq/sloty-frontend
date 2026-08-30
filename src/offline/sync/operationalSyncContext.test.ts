import { describe, expect, it } from 'vitest'
import type {
  AuthContextValue,
  CurrentUserMembership,
  CurrentUserProfile,
} from '../../core/auth/auth.types'
import { createOperationalSyncContext } from './operationalSyncContext'

const staffMembership: CurrentUserMembership = {
  id: 10,
  role: 'STAFF',
  club: {
    id: 1,
    slug: 'club-a',
    name: 'Club A',
    is_active: true,
  },
  court: { id: 7, name: 'Court 7' },
}

const profile: CurrentUserProfile = {
  id: 1,
  username: 'staff',
  email: 'staff@example.com',
  first_name: 'Staff',
  last_name: 'User',
  phone_number: null,
  is_active: true,
  is_platform_admin: false,
  account_created_by: null,
  requires_club_selection: false,
  memberships: [staffMembership],
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
  | 'selectedMembership'
> {
  return {
    currentUser: profile,
    isAuthenticated: true,
    isLoadingSession: false,
    role: 'STAFF',
    selectedClubSlug: 'club-a',
    selectedMembership: staffMembership,
    ...overrides,
  }
}

describe('createOperationalSyncContext', () => {
  it('waits for authenticated user, selected Club, and membership readiness', () => {
    expect(
      createOperationalSyncContext(
        authValue({ currentUser: null, selectedMembership: null }),
      ),
    ).toBeNull()
    expect(
      createOperationalSyncContext(
        authValue({ selectedClubSlug: null, selectedMembership: null }),
      ),
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
      membershipId: 10,
      assignedCourtId: 7,
      assignedCourtName: 'Court 7',
    })
  })

  it('does not create an all-platform sync context for Platform Admin without a selected Club membership', () => {
    expect(
      createOperationalSyncContext(
        authValue({
          currentUser: { ...profile, is_platform_admin: true },
          role: 'PLATFORM_ADMIN',
          selectedClubSlug: null,
          selectedMembership: null,
        }),
      ),
    ).toBeNull()
  })
})
