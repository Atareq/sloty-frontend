/**
 * Router `location.state` marker for the explicit «المتابعة كزائر» action on
 * Login.
 *
 * It is navigation intent only: it creates no token, session, User, Profile,
 * or Player. `HomeRoute` reads it so an installed-PWA (standalone) visitor who
 * chose to continue as a guest reaches public discovery at `/` instead of
 * being redirected back to `/login`. Ordinary standalone launches carry no
 * state and keep their approved `/login` landing.
 */
export const guestHomeEntryState = { guestHomeEntry: true } as const

/** True when the current navigation came from the Login guest action. */
export function isGuestHomeEntryState(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as { guestHomeEntry?: unknown }).guestHomeEntry === true
  )
}
