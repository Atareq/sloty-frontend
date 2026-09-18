export interface FrontendBuildInfo {
  release: string
  commit: string
  shortCommit: string
}

function readEnv(name: 'VITE_APP_RELEASE' | 'VITE_COMMIT_SHA'): string {
  const value = import.meta.env[name]

  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Returns the first 7 characters of a git SHA for compact UI display.
 */
export function toShortCommit(commit: string): string {
  const trimmed = commit.trim()

  if (!trimmed) {
    return ''
  }

  return trimmed.slice(0, 7)
}

/**
 * Central frontend build metadata sourced from Vite env at build time.
 *
 * Components must use this module instead of reading `import.meta.env`
 * directly. Missing production env falls back to a safe local label so the
 * shell still renders.
 */
export function getFrontendBuildInfo(): FrontendBuildInfo {
  const release = readEnv('VITE_APP_RELEASE') || 'dev'
  const commit = readEnv('VITE_COMMIT_SHA') || 'local'

  return {
    release,
    commit,
    shortCommit: toShortCommit(commit) || 'local',
  }
}
