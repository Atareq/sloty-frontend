export type AppLanguage = 'ar' | 'en'

/**
 * Resolves the current product language from the document.
 *
 * Sloty is Arabic-first. Any missing, empty, or non-English `lang` falls back
 * to Arabic so English validation copy cannot leak into the default UI.
 */
export function getAppLanguage(
  lang = typeof document === 'undefined' ? 'ar' : document.documentElement.lang,
): AppLanguage {
  const normalized = lang.trim().toLowerCase()

  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en'
  }

  return 'ar'
}
