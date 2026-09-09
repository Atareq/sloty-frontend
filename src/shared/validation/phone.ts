import { isValidPhoneNumber, parsePhoneNumber } from 'react-phone-number-input'
import type { Country } from 'react-phone-number-input'

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

/**
 * Validates Sloty phone values.
 * Backward compatible: if country is omitted, validates raw value as E.164 (legacy behavior).
 * If country is provided, parses and validates with country context.
 */
export function isValidSlotyPhoneNumber(
  value: string | undefined | null,
  country?: Country,
): boolean {
  if (!value) {
    return false
  }
  if (country) {
    return normalizeSlotyPhoneNumber(value, country) !== null
  }
  return Boolean(isValidPhoneNumber(value))
}