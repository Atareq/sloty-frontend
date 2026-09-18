import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFrontendBuildInfo, toShortCommit } from './buildInfo'

describe('toShortCommit', () => {
  it('returns the first 7 characters of a commit SHA', () => {
    expect(toShortCommit('a13c92e34abcdef')).toBe('a13c92e')
    expect(toShortCommit('91bd3aa28e123456')).toBe('91bd3aa')
  })

  it('returns an empty string for blank input', () => {
    expect(toShortCommit('')).toBe('')
    expect(toShortCommit('   ')).toBe('')
  })
})

describe('getFrontendBuildInfo', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads release and short commit from Vite env', () => {
    vi.stubEnv('VITE_APP_RELEASE', 'v0.4.0')
    vi.stubEnv('VITE_COMMIT_SHA', 'a13c92e34abcdef')

    expect(getFrontendBuildInfo()).toEqual({
      release: 'v0.4.0',
      commit: 'a13c92e34abcdef',
      shortCommit: 'a13c92e',
    })
  })

  it('falls back to local development labels when env is missing', () => {
    vi.stubEnv('VITE_APP_RELEASE', '')
    vi.stubEnv('VITE_COMMIT_SHA', '')

    expect(getFrontendBuildInfo()).toEqual({
      release: 'dev',
      commit: 'local',
      shortCommit: 'local',
    })
  })
})
