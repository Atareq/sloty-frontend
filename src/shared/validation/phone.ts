import { isValidPhoneNumber } from 'react-phone-number-input'

/**
 * Validates Sloty phone values after react-phone-number-input
 * converts them to E.164 format.
 */
export function isValidSlotyPhoneNumber(
  value: string | undefined,
): boolean {
  return Boolean(value && isValidPhoneNumber(value))
}