import { apiRequest } from '../api/apiClient'
import { toShortCommit } from '../config/buildInfo'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type { BackendBuildInfo, BackendVersionResponse } from './system.types'

let backendBuildInfoPromise: Promise<BackendBuildInfo | null> | null = null

function normalizeBackendVersion(
  payload: BackendVersionResponse,
): BackendBuildInfo | null {
  const release = payload.release?.trim() ?? ''
  const commit = payload.commit?.trim() ?? ''

  if (!release && !commit) {
    return null
  }

  return {
    service: payload.service?.trim() || 'sloty-backend',
    release: release || '—',
    commit: commit || '—',
    shortCommit: toShortCommit(commit) || '—',
  }
}

/**
 * Loads backend release metadata once per browser session.
 *
 * Failures resolve to `null` so Admin diagnostics stay non-blocking.
 * Menu remounts reuse the same in-flight / settled promise.
 */
export function fetchBackendBuildInfo(): Promise<BackendBuildInfo | null> {
  if (!backendBuildInfoPromise) {
    backendBuildInfoPromise = apiRequest<BackendVersionResponse>(
      apiEndpoints.systemVersion,
      {
        method: 'GET',
        omitAuth: true,
        skipAuthRefresh: true,
      },
    )
      .then((payload) => normalizeBackendVersion(payload))
      .catch(() => null)
  }

  return backendBuildInfoPromise
}

/** Test-only helper to clear the session-level cache. */
export function resetBackendBuildInfoCacheForTests(): void {
  backendBuildInfoPromise = null
}
