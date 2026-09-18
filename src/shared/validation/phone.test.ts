import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { getPhoneValidationMessage, phoneValidationCopy } from '../copy/phoneValidation'
import {
  getCountryFromPhoneNumber,
  isValidSlotyPhoneNumber,
  normalizeSlotyPhoneNumber,
  validatePhoneNumber,
} from './phone'

const PHONE_FORM_SOURCES = [
  'src/features/schedule/components/AddBookingSheet/AddBookingSheet.tsx',
  'src/features/schedule/components/BookingRequestCustomerEditSheet/BookingRequestCustomerEditSheet.tsx',
  'src/features/adminUsers/AdminUserFormPage/AdminUserFormPage.tsx',
  'src/features/settings/SettingsUsersPage/SettingsUsersPage.tsx',
  'src/features/clubs/ClubFormPage/ClubFormPage.tsx',
] as const

describe('validatePhoneNumber', () => {
  afterEach(() => {
    document.documentElement.lang = 'ar'
  })

  it('accepts a valid Egyptian mobile with country context', () => {
    expect(validatePhoneNumber('01012345678', 'EG', { required: true })).toEqual({
      valid: true,
      error: null,
    })
  })

  it('accepts a valid supported international number', () => {
    expect(validatePhoneNumber('0501234567', 'SA', { required: true })).toEqual({
      valid: true,
      error: null,
    })
    expect(validatePhoneNumber('+966501234567', undefined, { required: true }))
      .toEqual({
        valid: true,
        error: null,
      })
  })

  it('returns INVALID_PHONE for invalid numbers', () => {
    expect(validatePhoneNumber('01012', 'EG', { required: true })).toEqual({
      valid: false,
      error: 'INVALID_PHONE',
    })
    expect(validatePhoneNumber('not-a-phone')).toEqual({
      valid: false,
      error: 'INVALID_PHONE',
    })
  })

  it('returns REQUIRED for empty required numbers and valid for empty optional numbers', () => {
    expect(validatePhoneNumber('', 'EG', { required: true })).toEqual({
      valid: false,
      error: 'REQUIRED',
    })
    expect(validatePhoneNumber('   ', undefined, { required: true })).toEqual({
      valid: false,
      error: 'REQUIRED',
    })
    expect(validatePhoneNumber(undefined, 'EG')).toEqual({
      valid: true,
      error: null,
    })
  })

  it('resolves Arabic validation copy from the current application language', () => {
    document.documentElement.lang = 'ar'

    expect(getPhoneValidationMessage('INVALID_PHONE')).toBe(
      'رقم الموبايل غير صحيح',
    )
    expect(getPhoneValidationMessage('REQUIRED')).toBe('رقم الموبايل مطلوب')
    expect(phoneValidationCopy.ar.INVALID_PHONE).toBe('رقم الموبايل غير صحيح')
  })

  it('resolves English validation copy when the application language is en', () => {
    document.documentElement.lang = 'en'

    expect(getPhoneValidationMessage('INVALID_PHONE')).toBe(
      'Enter a valid mobile number',
    )
    expect(getPhoneValidationMessage('REQUIRED')).toBe(
      'Mobile number is required',
    )
  })
})

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

describe('phone form integration', () => {
  it('keeps every main phone form on the shared validator and copy helpers', () => {
    for (const relativePath of PHONE_FORM_SOURCES) {
      const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8')

      expect(source).toContain('validatePhoneNumber')
      expect(source).toContain('getPhoneValidationMessage')
      expect(source).toContain('SlotyPhoneNumberInput')
      expect(source).not.toContain('رقم الموبايل غير صحيح')
      expect(source).not.toContain('رقم الموبايل مطلوب')
      expect(source).not.toContain('Enter a valid mobile number')
      expect(source).not.toContain('Mobile number is required')
    }
  })
})
