import {
  getFrontendBuildInfo,
  toShortCommit,
} from '../../../core/config/buildInfo'
import type { BackendBuildInfo } from '../../../core/system/system.types'

export interface BuildInfoProps {
  backendBuildInfo?: BackendBuildInfo | null
  /**
   * When true and backend metadata is still missing, show `API —`.
   * When false (still loading), omit the API line until settled.
   */
  showApiUnavailable?: boolean
}

/**
 * Compact selectable FE/API release footer for Admin shell diagnostics.
 *
 * Spacing matches the aligned diagnostic layout:
 * `FE  v0.4.0 · a13c92e` / `API v0.7.0 · 91bd3aa`
 */
export function BuildInfo({
  backendBuildInfo = null,
  showApiUnavailable = true,
}: BuildInfoProps) {
  const fe = getFrontendBuildInfo()
  const feLine = `FE  ${fe.release} · ${fe.shortCommit}`
  const apiLine = backendBuildInfo
    ? `API ${backendBuildInfo.release} · ${
        backendBuildInfo.shortCommit ||
        toShortCommit(backendBuildInfo.commit)
      }`
    : showApiUnavailable
      ? 'API —'
      : null

  return (
    <div
      aria-label="معلومات الإصدار"
      className="min-w-0 select-text space-y-0.5 overflow-x-hidden break-all font-mono text-[11px] leading-4 text-[var(--sloty-text-muted)]"
      dir="ltr"
    >
      <p>{feLine}</p>
      {apiLine ? <p>{apiLine}</p> : null}
    </div>
  )
}

/**
 * Shared Admin menu footer used by the mobile burger and desktop sidebar.
 */
export function AdminBuildInfoFooter(props: BuildInfoProps) {
  return (
    <div className="mt-3 min-w-0 overflow-x-hidden border-t border-[var(--sloty-border)] pt-3">
      <BuildInfo {...props} />
    </div>
  )
}
