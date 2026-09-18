import type { PhoneValidationError } from '../validation/phone'
import { getAppLanguage, type AppLanguage } from '../utils/language'

/**
 * Localized phone validation copy. Feature code must resolve messages through
 * `getPhoneValidationMessage()` instead of hardcoding Arabic or English text.
 */
export const phoneValidationCopy = {
  ar: {
    REQUIRED: 'رقم الموبايل مطلوب',
    INVALID_PHONE: 'رقم الموبايل غير صحيح',
  },
  en: {
    REQUIRED: 'Mobile number is required',
    INVALID_PHONE: 'Enter a valid mobile number',
  },
} as const satisfies Record<AppLanguage, Record<PhoneValidationError, string>>

/**
 * Resolves a phone validation code to the current application language.
 */
export function getPhoneValidationMessage(
  error: PhoneValidationError,
  language: AppLanguage = getAppLanguage(),
): string {
  return phoneValidationCopy[language][error]
}
