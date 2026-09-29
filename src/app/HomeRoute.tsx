import { AuthLandingRedirect } from '../core/auth/AuthLandingRedirect'
import { useAuth } from '../core/auth/useAuth'
import { PublicHomePage } from '../features/publicSite/PublicHomePage/PublicHomePage'
import { isRunningStandalone } from '../pwa/pwaInstall'

/**
 * Element for `/`.
 *
 * Visitors without a session in a normal browser tab (including search
 * crawlers) get the public homepage. Everyone else keeps the existing
 * role-aware `AuthLandingRedirect`: signed-in users, session hydration and
 * session errors, and installed-PWA launches (`start_url: '/'`), which still
 * go straight to `/login` when signed out.
 */
export function HomeRoute() {
  const { isAuthenticated, isLoadingSession } = useAuth()

  if (!isAuthenticated && !isLoadingSession && !isRunningStandalone()) {
    return <PublicHomePage />
  }

  return <AuthLandingRedirect />
}
