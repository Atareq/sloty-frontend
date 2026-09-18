import { useEffect, useState } from 'react'
import { fetchBackendBuildInfo } from './systemApi'
import type { BackendBuildInfo } from './system.types'

/**
 * Session-scoped backend build metadata for ADMIN diagnostics.
 *
 * The underlying API helper caches the request, so remounts do not refetch.
 */
export function useBackendBuildInfo(enabled: boolean): {
  backendBuildInfo: BackendBuildInfo | null
  isLoaded: boolean
} {
  const [backendBuildInfo, setBackendBuildInfo] =
    useState<BackendBuildInfo | null>(null)
  const [isLoaded, setIsLoaded] = useState(!enabled)
  const [requestEnabled, setRequestEnabled] = useState(enabled)

  if (enabled !== requestEnabled) {
    setRequestEnabled(enabled)
    setBackendBuildInfo(null)
    setIsLoaded(!enabled)
  }

  useEffect(() => {
    if (!enabled) {
      return
    }

    let isActive = true

    void fetchBackendBuildInfo().then((info) => {
      if (!isActive) {
        return
      }

      setBackendBuildInfo(info)
      setIsLoaded(true)
    })

    return () => {
      isActive = false
    }
  }, [enabled])

  return { backendBuildInfo, isLoaded }
}
