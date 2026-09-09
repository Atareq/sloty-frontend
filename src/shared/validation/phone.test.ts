import { describe, expect, it } from 'vitest'
import {
  getCountryFromPhoneNumber,
  isValidSlotyPhoneNumber,
  normalizeSlotyPhoneNumber,
} from './phone'

describe('isValidSlotyPhoneNumber', () => {
  it('accepts valid E.164 phone numbers', () => {
    expect(isValidSlotyPhoneNumber('+201012345678')).toBe(true)
  })

  it('rejects invalid and empty values', () => {
    expect(isValidSlotyPhoneNumber(undefined)).toBe(false)
    expect(isValidSlotyPhoneNumber('')).toBe(false)
    expect(isValidSlotyPhoneNumber('010123')).toBe(false)
  })

  it('validates with optional country context', () => {
    expect(isValidSlotyPhoneNumber('01012345678', 'EG')).toBe(true)
    expect(isValidSlotyPhoneNumber('+20 10 1234 5678', 'EG')).toBe(true)
    expect(isValidSlotyPhoneNumber('010123', 'EG')).toBe(false)
    expect(isValidSlotyPhoneNumber('01012345678', 'US')).toBe(false)
  })
})

describe('normalizeSlotyPhoneNumber', () => {
  it('normalizes local Egyptian mobile numbers using default EG context', () => {
    expect(normalizeSlotyPhoneNumber('01012345678')).toBe('+201012345678')
    expect(normalizeSlotyPhoneNumber('01112345678')).toBe('+201112345678')
    expect(normalizeSlotyPhoneNumber('01212345678')).toBe('+201212345678')
    expect(normalizeSlotyPhoneNumber('01512345678')).toBe('+201512345678')
  })

  it('normalizes already-international and formatted phone numbers', () => {
    expect(normalizeSlotyPhoneNumber('+201012345678')).toBe('+201012345678')
    expect(normalizeSlotyPhoneNumber('+20 10 1234 5678')).toBe('+201012345678')
    expect(normalizeSlotyPhoneNumber('+966 50 123 4567', 'EG')).toBe('+966501234567')
  })

  it('normalizes local numbers with non-default country context', () => {
    expect(normalizeSlotyPhoneNumber('0501234567', 'SA')).toBe('+966501234567')
  })

  it('handles surrounding whitespace gracefully', () => {
    expect(normalizeSlotyPhoneNumber('  01012345678  ')).toBe('+201012345678')
    expect(normalizeSlotyPhoneNumber('  +201012345678  ')).toBe('+201012345678')
  })

  it('returns null for incomplete, invalid, or empty input', () => {
    expect(normalizeSlotyPhoneNumber(undefined)).toBeNull()
    expect(normalizeSlotyPhoneNumber(null)).toBeNull()
    expect(normalizeSlotyPhoneNumber('')).toBeNull()
    expect(normalizeSlotyPhoneNumber('   ')).toBeNull()
    expect(normalizeSlotyPhoneNumber('010123')).toBeNull()
    expect(normalizeSlotyPhoneNumber('invalid text')).toBeNull()
    expect(normalizeSlotyPhoneNumber('01012345678', 'US')).toBeNull()
  })
})

describe('getCountryFromPhoneNumber', () => {
  it('extracts country code from valid E.164 strings', () => {
    expect(getCountryFromPhoneNumber('+201012345678')).toBe('EG')
    expect(getCountryFromPhoneNumber('+966501234567')).toBe('SA')
    expect(getCountryFromPhoneNumber('+12025550123')).toBe('US')
  })

  it('falls back safely to undefined for empty or invalid input', () => {
    expect(getCountryFromPhoneNumber(undefined)).toBeUndefined()
    expect(getCountryFromPhoneNumber(null)).toBeUndefined()
    expect(getCountryFromPhoneNumber('')).toBeUndefined()
    expect(getCountryFromPhoneNumber('01012345678')).toBeUndefined()
    expect(getCountryFromPhoneNumber('invalid')).toBeUndefined()
  })
})
