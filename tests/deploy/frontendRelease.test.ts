// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  gitSha,
  initGitRepo,
  makeTempDir,
  runGit,
  sourceLib,
} from './helpers'

describe('frontend release calculation', () => {
  it('reuses an existing release tag on the same SHA', () => {
    const repo = initGitRepo(makeTempDir('sloty-fe-release-reuse-'))
    const sha = gitSha(repo)
    runGit(repo, 'tag', 'v0.4.0', sha)

    const result = sourceLib(`resolve_production_release_tag "${sha}"`, repo)

    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe('v0.4.0')
  })

  it('increments minor and resets patch for an untagged SHA', () => {
    const repo = initGitRepo(makeTempDir('sloty-fe-release-next-'))
    const first = gitSha(repo)
    runGit(repo, 'tag', 'v0.2.0', first)
    fs.writeFileSync(path.join(repo, 'README'), 'next\n', 'utf8')
    runGit(repo, 'add', 'README')
    runGit(repo, 'commit', '-m', 'next')
    const second = gitSha(repo)

    const result = sourceLib(`resolve_production_release_tag "${second}"`, repo)

    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe('v0.3.0')
  })

  it('starts at v0.1.0 when no frontend release exists', () => {
    const repo = initGitRepo(makeTempDir('sloty-fe-release-first-'))
    const sha = gitSha(repo)

    const result = sourceLib(`resolve_production_release_tag "${sha}"`, repo)

    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe('v0.1.0')
  })

  it('treats a tag on the same SHA as a rerun-safe match', () => {
    const repo = initGitRepo(makeTempDir('sloty-fe-release-match-'))
    const sha = gitSha(repo)
    runGit(repo, 'tag', 'v0.4.0', sha)

    const result = sourceLib(`release_tag_sha_status "v0.4.0" "${sha}"`, repo)

    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe('match')
  })

  it('reports conflict when a release tag points at a different SHA', () => {
    const repo = initGitRepo(makeTempDir('sloty-fe-release-conflict-'))
    const first = gitSha(repo)
    runGit(repo, 'tag', 'v0.4.0', first)
    fs.writeFileSync(path.join(repo, 'README'), 'other\n', 'utf8')
    runGit(repo, 'add', 'README')
    runGit(repo, 'commit', '-m', 'other')
    const second = gitSha(repo)

    const result = sourceLib(
      `release_tag_sha_status "v0.4.0" "${second}"`,
      repo,
    )

    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe('conflict')
  })

  it('rejects invalid SHA and release arguments', () => {
    const repo = initGitRepo(makeTempDir('sloty-fe-release-args-'))
    const badSha = sourceLib(
      'validate_frontend_release_args "abc" "v0.1.0"',
      repo,
    )
    const badTag = sourceLib(
      `validate_frontend_release_args "${'a'.repeat(40)}" "production"`,
      repo,
    )

    expect(badSha.status).not.toBe(0)
    expect(badSha.stderr).toMatch(/Invalid commit SHA/)
    expect(badTag.status).not.toBe(0)
    expect(badTag.stderr).toMatch(/Invalid release tag/)
  })
})
