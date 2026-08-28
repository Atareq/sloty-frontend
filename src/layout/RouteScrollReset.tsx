import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router'

/**
 * Canonical route-level scroll reset.
 *
 * New page navigation starts at the top. Hash/anchor navigation keeps the
 * intended section. Query-only updates (live search) do not jump the page.
 */
export function RouteScrollReset() {
  const location = useLocation()

  useLayoutEffect(() => {
    if (location.hash) {
      const elementId = decodeURIComponent(location.hash.slice(1))
      const target = document.getElementById(elementId)

      if (target) {
        target.scrollIntoView()
        return
      }
    }

    window.scrollTo(0, 0)
  }, [location.hash, location.pathname])

  return null
}
