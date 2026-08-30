import { useEffect, useState } from 'react'

/**
 * Covers legacy modal tasks that predate the shared AppSheet overlay registry.
 * This observes presentation state only; form components still own dirty data.
 */
export function useHasActiveModalTask(): boolean {
  const [hasActiveModal, setHasActiveModal] = useState(false)

  useEffect(() => {
    function refreshModalState(): void {
      setHasActiveModal(Boolean(document.querySelector('[aria-modal="true"]')))
    }

    refreshModalState()
    const observer = new MutationObserver(refreshModalState)

    observer.observe(document.body, {
      attributeFilter: ['aria-modal'],
      attributes: true,
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  return hasActiveModal
}

/**
 * Full-page editors do not expose shared dirty state. Keep update/install
 * notices out of those routes; AppShell separately blocks them during sheets.
 */
export function isPwaPromptBlockedRoute(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)

  if (segments[0] === 'settings' && segments[1] === 'courts') {
    return segments.length === 3
  }

  if (segments[0] === 'admin' && segments[1] === 'users') {
    return segments.length === 3 && segments[2] === 'new'
  }

  if (segments[0] !== 'admin' || segments[1] !== 'clubs') {
    return false
  }

  if (segments.length === 3) {
    return true
  }

  return segments.length === 5 && segments[3] === 'courts'
}
