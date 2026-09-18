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
      className="select-text space-y-0.5 break-all font-mono text-[11px] leading-4 text-[var(--sloty-text-muted)]"
      dir="ltr"
    >
      <p>{feLine}</p>
      {apiLine ? <p>{apiLine}</p> : null}
    </div>
  )
}
