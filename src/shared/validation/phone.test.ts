import { describe, expect, it } from 'vitest'
import { isValidSlotyPhoneNumber } from './phone'

describe('isValidSlotyPhoneNumber', () => {
  it('accepts valid E.164 phone numbers', () => {
    expect(isValidSlotyPhoneNumber('+201012345678')).toBe(true)
  })

  it('rejects invalid and empty values', () => {
    expect(isValidSlotyPhoneNumber(undefined)).toBe(false)
    expect(isValidSlotyPhoneNumber('')).toBe(false)
    expect(isValidSlotyPhoneNumber('010123')).toBe(false)
  })
})
