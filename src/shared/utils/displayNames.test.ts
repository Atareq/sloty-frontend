import { describe, expect, it } from 'vitest'
import { getClubUserDisplayName, getCourtDisplayName } from './displayNames'

describe('display name helpers', () => {
  it('prefers club user full name before username, phone, then id', () => {
    expect(
      getClubUserDisplayName({
        id: 7,
        first_name: 'أحمد',
        last_name: 'علي',
        username: 'ahmed',
        phone_number: '01000000000',
      }),
    ).toBe('أحمد علي')
    expect(getClubUserDisplayName({ id: 8, username: 'staff-user' })).toBe(
      'staff-user',
    )
    expect(getClubUserDisplayName({ id: 9, phone_number: '01000000000' })).toBe(
      '01000000000',
    )
    expect(getClubUserDisplayName({ id: 10 })).toBe('مستخدم #10')
  })

  it('prefers court name before id fallback', () => {
    expect(getCourtDisplayName({ id: 3, name: 'ملعب 1' })).toBe('ملعب 1')
    expect(getCourtDisplayName({ id: 4, name: '   ' })).toBe('ملعب #4')
  })
})
