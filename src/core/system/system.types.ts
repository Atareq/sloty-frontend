/**
 * Build metadata returned by `GET /api/system/version/`.
 */
export interface BackendVersionResponse {
  service: string
  release: string
  commit: string
}

export interface BackendBuildInfo {
  service: string
  release: string
  commit: string
  shortCommit: string
}
