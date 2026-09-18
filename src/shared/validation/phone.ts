import { isValidPhoneNumber, parsePhoneNumber } from 'react-phone-number-input'
import type { Country } from 'react-phone-number-input'

export type PhoneValidationError = 'REQUIRED' | 'INVALID_PHONE'

export interface PhoneValidationOptions {
  required?: boolean
}

export type PhoneValidationResult =
  | { valid: true; error: null }
  | { valid: false; error: PhoneValidationError }

/**
 * Extracts the country code from an existing phone string (e.g. initial E.164 values).
 * Used purely as an initialization helper for form country selectors.
 * Falls back safely to undefined if parsing fails.
 */
export function getCountryFromPhoneNumber(
  value: string | undefined | null,
): Country | undefined {
  if (!value) {
    return undefined
  }
  try {
    const parsed = parsePhoneNumber(value.trim())
    return parsed?.country
  } catch {
    return undefined
  }
}

/**
 * Normalizes user-entered or AutoFilled phone text using selected country context.
 * Parses both national Egyptian numbers (e.g. '01012345678'), formatted numbers
 * (e.g. '+20 10 1234 5678'), and international numbers (e.g. '+966...').
 *
 * Returns the authoritative E.164 string (e.g. '+201012345678') on valid numbers,
 * or null if invalid or empty.
 */
export function normalizeSlotyPhoneNumber(
  rawValue: string | undefined | null,
  country: Country = 'EG',
): string | null {
  if (!rawValue) {
    return null
  }
  const trimmed = rawValue.trim()
  if (!trimmed) {
    return null
  }
  try {
    const parsed = parsePhoneNumber(trimmed, country)
    if (parsed && parsed.isValid()) {
      return parsed.number
    }
  } catch {
    return null
  }
  return null
}

function hasPhoneValue(value: string | undefined | null): value is string {
  return Boolean(value && value.trim())
}

function isValidPhoneValue(
  value: string,
  country?: Country,
): boolean {
  if (country) {
    return normalizeSlotyPhoneNumber(value, country) !== null
  }

  return Boolean(isValidPhoneNumber(value.trim()))
}

/**
 * Shared phone-number validator. Returns a stable error code, never UI copy.
 *
 * Empty values are valid unless `required` is true. Present values are checked
 * with the existing phone library: country context when provided, otherwise
 * E.164 `isValidPhoneNumber`.
 */
export function validatePhoneNumber(
  value: string | undefined | null,
  country?: Country,
  options: PhoneValidationOptions = {},
): PhoneValidationResult {
  const required = options.required === true

  if (!hasPhoneValue(value)) {
    if (required) {
      return { valid: false, error: 'REQUIRED' }
    }

    return { valid: true, error: null }
  }

  if (!isValidPhoneValue(value, country)) {
    return { valid: false, error: 'INVALID_PHONE' }
  }

  return { valid: true, error: null }
}

/**
 * Validates Sloty phone values.
 * Backward compatible: if country is omitted, validates raw value as E.164 (legacy behavior).
 * If country is provided, parses and validates with country context.
 */
export function isValidSlotyPhoneNumber(
  value: string | undefined | null,
  country?: Country,
): boolean {
  return validatePhoneNumber(value, country, { required: true }).valid
}
