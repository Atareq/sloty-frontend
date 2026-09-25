import { getFrontendBuildInfo, type FrontendBuildInfo } from '../config/buildInfo'

export interface DeployedVersionInfo {
  release: string
  commit: string
}

export type ReleaseCheckStatus =
  | 'current'
  | 'updating'
  | 'already_attempted'
  | 'network_error'
  | 'dev_bypass'

export interface ReleaseCheckResult {
  status: ReleaseCheckStatus
  runningCommit: string
  deployedCommit?: string
}

export const RELOAD_ATTEMPT_STORAGE_KEY_PREFIX = 'sloty:update-attempt:'
export const DEFAULT_CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export function getReloadAttempt(
  targetCommit: string,
  storage: Storage = sessionStorage,
): boolean {
  try {
    return storage.getItem(`${RELOAD_ATTEMPT_STORAGE_KEY_PREFIX}${targetCommit}`) === 'true'
  } catch {
    return false
  }
}

export function recordReloadAttempt(
  targetCommit: string,
  storage: Storage = sessionStorage,
): void {
  try {
    storage.setItem(`${RELOAD_ATTEMPT_STORAGE_KEY_PREFIX}${targetCommit}`, 'true')
  } catch {
    // SessionStorage may be restricted in private browsing mode
  }
}

export function clearReloadAttempts(storage: Storage = sessionStorage): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key?.startsWith(RELOAD_ATTEMPT_STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    for (const key of keysToRemove) {
      storage.removeItem(key)
    }
  } catch {
    // Ignore storage exceptions
  }
}

/**
 * Fetches /version.json bypassing browser and HTTP caches.
 * Returns null if network fails or response is not valid JSON.
 */
export async function fetchDeployedVersion(
  fetchFn: typeof fetch = fetch,
): Promise<DeployedVersionInfo | null> {
  try {
    const url = `/version.json?check=${Date.now()}`
    const response = await fetchFn(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (
      typeof data === 'object' &&
      data !== null &&
      typeof data.release === 'string' &&
      typeof data.commit === 'string'
    ) {
      return {
        release: data.release.trim(),
        commit: data.commit.trim(),
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Coordinates Service Worker update check, skips waiting, waits for controller
 * change or fallback timeout, and reloads the page.
 */
export async function applyReleaseUpdate(
  _targetCommit?: string,
  reloadFn: () => void = () => window.location.reload(),
): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }

  const hasServiceWorker = 'serviceWorker' in navigator

  if (!hasServiceWorker) {
    reloadFn()
    return
  }

  try {
    let reloaded = false
    const triggerReload = () => {
      if (!reloaded) {
        reloaded = true
        reloadFn()
      }
    }

    // When the new Service Worker activates and claims clients, controllerchange fires.
    navigator.serviceWorker.addEventListener('controllerchange', triggerReload, {
      once: true,
    })

    // Fallback safety timeout: if controllerchange doesn't fire within 2.5s, reload anyway.
    const fallbackTimer = setTimeout(triggerReload, 2500)

    const registration = await navigator.serviceWorker.getRegistration()

    if (registration) {
      // If there's an existing waiting worker (e.g. from previous prompt-based SW), tell it to skip waiting.
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }

      await registration.update().catch(() => undefined)

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    } else {
      clearTimeout(fallbackTimer)
      triggerReload()
    }
  } catch {
    reloadFn()
  }
}

export interface ReleaseManagerDeps {
  getBuildInfo?: () => FrontendBuildInfo
  fetchVersion?: () => Promise<DeployedVersionInfo | null>
  storage?: Storage
  applyUpdate?: (targetCommit: string) => Promise<void>
  minCheckIntervalMs?: number
}

export interface ReleaseManager {
  check: (options?: { force?: boolean }) => Promise<ReleaseCheckResult>
  applyUpdate: (targetCommit?: string) => Promise<void>
  start: () => void
  stop: () => void
}

/**
 * Centralized global ReleaseManager that periodically and on-resume verifies
 * the running FE release against the deployed /version.json.
 */
export function createReleaseManager(deps: ReleaseManagerDeps = {}): ReleaseManager {
  const getBuildInfo = deps.getBuildInfo ?? getFrontendBuildInfo
  const fetchVersion = deps.fetchVersion ?? (() => fetchDeployedVersion())
  const getStorage = () => deps.storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : undefined)
  const executeUpdate = deps.applyUpdate ?? ((targetCommit: string) => applyReleaseUpdate(targetCommit))
  const minCheckIntervalMs = deps.minCheckIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS

  let lastCheckTimestamp = 0
  let isChecking = false
  let hasStarted = false
  let visibilityListener: (() => void) | null = null

  async function check(options: { force?: boolean } = {}): Promise<ReleaseCheckResult> {
    const now = Date.now()
    if (!options.force && now - lastCheckTimestamp < minCheckIntervalMs) {
      const runningInfo = getBuildInfo()
      return { status: 'current', runningCommit: runningInfo.commit }
    }

    if (isChecking) {
      const runningInfo = getBuildInfo()
      return { status: 'current', runningCommit: runningInfo.commit }
    }

    isChecking = true
    lastCheckTimestamp = now

    try {
      const runningInfo = getBuildInfo()
      const runningCommit = runningInfo.commit

      const deployedInfo = await fetchVersion()

      if (!deployedInfo) {
        // Network failure is NOT a version mismatch
        return { status: 'network_error', runningCommit }
      }

      const deployedCommit = deployedInfo.commit

      // If running and deployed are identical, we are up to date
      if (runningCommit === deployedCommit) {
        const storage = getStorage()
        if (storage) {
          clearReloadAttempts(storage)
        }
        return { status: 'current', runningCommit, deployedCommit }
      }

      // Safe local/dev semantics: do not loop in dev environments
      if (runningCommit === 'local' || deployedCommit === 'local') {
        return { status: 'dev_bypass', runningCommit, deployedCommit }
      }

      // Check reload loop guard
      const storage = getStorage()
      if (storage && getReloadAttempt(deployedCommit, storage)) {
        console.warn(
          `[ReleaseManager] Stale release detected (${runningCommit} !== ${deployedCommit}), but update was already attempted in this session. Skipping reload to prevent loop.`,
        )
        return { status: 'already_attempted', runningCommit, deployedCommit }
      }

      // Record reload attempt for this target commit
      if (storage) {
        recordReloadAttempt(deployedCommit, storage)
      }

      // Execute update and reload
      await executeUpdate(deployedCommit)

      return { status: 'updating', runningCommit, deployedCommit }
    } finally {
      isChecking = false
    }
  }

  function handleVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void check()
    }
  }

  return {
    check,
    applyUpdate(targetCommit?: string): Promise<void> {
      return executeUpdate(targetCommit ?? '')
    },
    start(): void {
      if (hasStarted) {
        return
      }
      hasStarted = true

      // Immediate startup check
      void check({ force: true })

      // Document visibility resume check
      if (typeof document !== 'undefined') {
        visibilityListener = handleVisibilityChange
        document.addEventListener('visibilitychange', visibilityListener)
      }
    },
    stop(): void {
      if (!hasStarted) {
        return
      }
      hasStarted = false

      if (typeof document !== 'undefined' && visibilityListener) {
        document.removeEventListener('visibilitychange', visibilityListener)
        visibilityListener = null
      }
    },
  }
}

export const releaseManager = createReleaseManager()

