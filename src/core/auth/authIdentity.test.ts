import { describe, expect, it } from 'vitest'
import type { CurrentUserProfile } from './auth.types'
import { getCurrentProfileId, hasOperationalProfile } from './authIdentity'

describe('authIdentity helpers', () => {
  const staffWithProfile: CurrentUserProfile = {
    id: 50,
    profile_id: 12,
    profile_role: 'STAFF',
    email: 'staff@example.com',
    first_name: 'Ahmed',
    last_name: 'Ali',
    phone_number: '+201012345678',
    is_active: true,
    account_created_by: null,
  }

  const staffWithoutProfile: CurrentUserProfile = {
    id: 50,
    profile_id: null,
    profile_role: 'STAFF',
    email: 'staff@example.com',
    first_name: 'Ahmed',
    last_name: 'Ali',
    phone_number: '+201012345678',
    is_active: true,
    account_created_by: null,
  }

  const staffWithOmittedProfileId: CurrentUserProfile = {
    id: 50,
    profile_role: 'STAFF',
    email: 'staff@example.com',
    first_name: 'Ahmed',
    last_name: 'Ali',
    phone_number: '+201012345678',
    is_active: true,
    account_created_by: null,
  }

  describe('getCurrentProfileId', () => {
    it('returns explicit profile_id when present', () => {
      expect(getCurrentProfileId(staffWithProfile)).toBe(12)
    })

    it('returns null when profile_id is explicitly null (does not infer from user id)', () => {
      expect(getCurrentProfileId(staffWithoutProfile)).toBeNull()
    })

    it('returns null when profile_id is omitted/undefined (does not infer from user id)', () => {
      expect(getCurrentProfileId(staffWithOmittedProfileId)).toBeNull()
    })

    it('returns null when input is null or undefined', () => {
      expect(getCurrentProfileId(null)).toBeNull()
      expect(getCurrentProfileId(undefined)).toBeNull()
    })

    it('extracts profile_id from an AuthContextValue-like object', () => {
      const mockAuth = {
        currentUser: staffWithProfile,
      } as Parameters<typeof getCurrentProfileId>[0]

      expect(getCurrentProfileId(mockAuth)).toBe(12)
    })
  })

  describe('hasOperationalProfile', () => {
    it('returns true when explicit profile_id is present', () => {
      expect(hasOperationalProfile(staffWithProfile)).toBe(true)
    })

    it('returns false when profile_id is null', () => {
      expect(hasOperationalProfile(staffWithoutProfile)).toBe(false)
    })

    it('returns false when profile_id is omitted', () => {
      expect(hasOperationalProfile(staffWithOmittedProfileId)).toBe(false)
    })

    it('returns false when input is null or undefined', () => {
      expect(hasOperationalProfile(null)).toBe(false)
      expect(hasOperationalProfile(undefined)).toBe(false)
    })
  })

  describe('identity separation invariant', () => {
    it('never aliases user id as profile id', () => {
      // User ID is 50, but profile_id is 12
      const profileId = getCurrentProfileId(staffWithProfile)
      expect(profileId).toBe(12)
      expect(profileId).not.toBe(staffWithProfile.id)

      // When profile_id is absent, profileId must be null, NOT user.id (50)
      const absentProfileId = getCurrentProfileId(staffWithoutProfile)
      expect(absentProfileId).toBeNull()
      expect(absentProfileId).not.toBe(50)
    })
  })
})

