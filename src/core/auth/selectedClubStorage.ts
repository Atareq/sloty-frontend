const SELECTED_CLUB_STORAGE_KEY = 'selectedClubSlug'

/**
 * Reads the frontend-selected club slug.
 *
 * The slug is only a UX preference. Backend APIs still verify every
 * club-scoped request against server-side permissions.
 */
export function getSelectedClubSlug(): string | null {
  return localStorage.getItem(SELECTED_CLUB_STORAGE_KEY)
}

/**
 * Stores only the selected club slug, never a membership or permission copy.
 */
export function saveSelectedClubSlug(slug: string): void {
  localStorage.setItem(SELECTED_CLUB_STORAGE_KEY, slug)
}

/**
 * Clears the selected club slug when the session or club context changes.
 */
export function clearSelectedClubSlug(): void {
  localStorage.removeItem(SELECTED_CLUB_STORAGE_KEY)
}
