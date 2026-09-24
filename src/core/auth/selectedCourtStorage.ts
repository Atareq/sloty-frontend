const SELECTED_COURT_ID_STORAGE_KEY = 'sloty.auth.selected_court_id'

/**
 * Reads the frontend-selected court ID.
 *
 * Stored as a string and parsed as an integer because localStorage only
 * holds string values. Returns null when absent or unparseable.
 */
export function getSelectedCourtId(): number | null {
  const raw = sessionStorage.getItem(SELECTED_COURT_ID_STORAGE_KEY)

  if (!raw) {
    return null
  }

  const parsed = parseInt(raw, 10)

  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Stores only the selected court ID, never a court data copy.
 */
export function saveSelectedCourtId(id: number): void {
  sessionStorage.setItem(SELECTED_COURT_ID_STORAGE_KEY, String(id))
}

/**
 * Clears the selected court ID when the session, club, or court context changes.
 */
export function clearSelectedCourtId(): void {
  sessionStorage.removeItem(SELECTED_COURT_ID_STORAGE_KEY)
}
