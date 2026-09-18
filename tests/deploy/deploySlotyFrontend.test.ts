// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEPLOY_SCRIPT,
  LIB_SCRIPT,
  REPO_ROOT,
  VALID_COMMIT,
  VALID_RELEASE,
  assertBashSyntax,
  gitSha,
  initGitRepo,
  makeTempDir,
  runDeploy,
  runGit,
  sourceDeploy,
} from './helpers'

function writeExecutable(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, contents, 'utf8')
  fs.chmodSync(filePath, 0o755)
}

describe('deploy-sloty-frontend', () => {
  it('rejects an invalid SHA before modifying production', () => {
    const publishDir = makeTempDir('sloty-fe-publish-sha-')
    fs.writeFileSync(path.join(publishDir, 'keep.html'), 'live\n', 'utf8')

    const result = runDeploy(['abc', VALID_RELEASE], {
      SLOTY_FRONTEND_PUBLISH_DIR: publishDir,
      SLOTY_DEPLOY_STUB_DIR: path.join(publishDir, 'stubs'),
    })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(/Invalid commit SHA/)
    expect(fs.readFileSync(path.join(publishDir, 'keep.html'), 'utf8')).toBe(
      'live\n',
    )
  })

  it('rejects an invalid release tag before modifying production', () => {
    const publishDir = makeTempDir('sloty-fe-publish-tag-')
    fs.writeFileSync(path.join(publishDir, 'keep.html'), 'live\n', 'utf8')

    const result = runDeploy([VALID_COMMIT, 'production'], {
      SLOTY_FRONTEND_PUBLISH_DIR: publishDir,
      SLOTY_DEPLOY_STUB_DIR: path.join(publishDir, 'stubs'),
    })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(/Invalid release tag/)
    expect(fs.readFileSync(path.join(publishDir, 'keep.html'), 'utf8')).toBe(
      'live\n',
    )
  })

  it('refuses a dirty production worktree', () => {
    const repo = initGitRepo(makeTempDir('sloty-fe-dirty-'))
    fs.writeFileSync(path.join(repo, 'README'), 'dirty\n', 'utf8')

    const result = sourceDeploy('deploy_worktree', {
      SLOTY_FRONTEND_DIR: repo,
    })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(/unexpected changes/)
  })

  it('allows ignored runtime files during the worktree check', () => {
    const repo = initGitRepo(makeTempDir('sloty-fe-ignored-'))
    fs.writeFileSync(path.join(repo, '.gitignore'), 'runtime.log\n', 'utf8')
    runGit(repo, 'add', '.gitignore')
    runGit(repo, 'commit', '-m', 'ignore runtime')
    fs.writeFileSync(path.join(repo, 'runtime.log'), 'ignored\n', 'utf8')

    const result = sourceDeploy('deploy_worktree', {
      SLOTY_FRONTEND_DIR: repo,
    })

    expect(result.status).toBe(0)
  })

  it('requires the requested SHA to belong to origin/master', () => {
    const tmp = makeTempDir('sloty-fe-ancestor-')
    const repo = initGitRepo(path.join(tmp, 'repo'))
    const bare = path.join(tmp, 'origin.git')
    runGit(repo, 'clone', '--bare', repo, bare)
    runGit(repo, 'remote', 'add', 'origin', bare)
    runGit(repo, 'fetch', 'origin')
    const ancestor = gitSha(repo)

    fs.writeFileSync(path.join(repo, 'README'), 'ahead\n', 'utf8')
    runGit(repo, 'add', 'README')
    runGit(repo, 'commit', '-m', 'ahead of origin')
    const descendant = gitSha(repo)

    const ok = sourceDeploy(`COMMIT_SHA="${ancestor}"; deploy_ancestor`, {
      SLOTY_FRONTEND_DIR: repo,
    })
    const blocked = sourceDeploy(
      `COMMIT_SHA="${descendant}"; deploy_ancestor`,
      { SLOTY_FRONTEND_DIR: repo },
    )

    expect(ok.status).toBe(0)
    expect(blocked.status).not.toBe(0)
    expect(blocked.stderr).toMatch(/not an ancestor/)
  })

  it('accepts the inspected GitHub origin over HTTPS or SSH', () => {
    const httpsOk = sourceDeploy(
      'origins_equivalent "https://github.com/Atareq/sloty-frontend.git" "git@github.com:Atareq/sloty-frontend.git"',
    )
    const otherRepo = sourceDeploy(
      'origins_equivalent "https://github.com/Atareq/sloty-frontend.git" "https://github.com/Atareq/sloty-backend.git"',
    )

    expect(httpsOk.status).toBe(0)
    expect(otherRepo.status).not.toBe(0)
  })

  it('rejects an unexpected git origin before changing HEAD', () => {
    const repo = initGitRepo(makeTempDir('sloty-fe-origin-'))
    runGit(
      repo,
      'remote',
      'add',
      'origin',
      'https://github.com/Atareq/sloty-backend.git',
    )

    const blocked = sourceDeploy('deploy_origin', {
      SLOTY_FRONTEND_DIR: repo,
    })
    expect(blocked.status).not.toBe(0)
    expect(blocked.stderr).toMatch(/Unexpected git origin/)

    runGit(
      repo,
      'remote',
      'set-url',
      'origin',
      'git@github.com:Atareq/sloty-frontend.git',
    )
    const allowed = sourceDeploy('deploy_origin', {
      SLOTY_FRONTEND_DIR: repo,
    })
    expect(allowed.status, allowed.stderr).toBe(0)
  })

  it('rejects a SHA that is not present as a commit', () => {
    const repo = initGitRepo(makeTempDir('sloty-fe-missing-sha-'))
    const missing = 'a'.repeat(40)

    const result = sourceDeploy(`COMMIT_SHA="${missing}"; deploy_verify`, {
      SLOTY_FRONTEND_DIR: repo,
    })

    expect(result.status).not.toBe(0)
  })

  it('runs npm ci and refuses a mutated lockfile', () => {
    const repo = makeTempDir('sloty-fe-npm-ci-')
    const marker = path.join(repo, 'npm-ci.txt')
    fs.writeFileSync(path.join(repo, 'package.json'), '{}\n', 'utf8')
    fs.writeFileSync(path.join(repo, 'package-lock.json'), '{"lockfileVersion":3}\n', 'utf8')

    const ok = sourceDeploy(
      [
        `npm() {`,
        `  if [ "$1" = ci ]; then`,
        `    printf 'ci\\n' > '${marker}'`,
        `    return 0`,
        `  fi`,
        `  command npm "$@"`,
        `}`,
        'deploy_install',
      ].join('\n'),
      { SLOTY_FRONTEND_DIR: repo },
    )

    const mutated = sourceDeploy(
      [
        `npm() {`,
        `  if [ "$1" = ci ]; then`,
        `    printf 'mutated\\n' > package-lock.json`,
        `    return 0`,
        `  fi`,
        `  command npm "$@"`,
        `}`,
        'deploy_install',
      ].join('\n'),
      { SLOTY_FRONTEND_DIR: repo },
    )

    expect(ok.status, ok.stderr).toBe(0)
    expect(fs.readFileSync(marker, 'utf8').trim()).toBe('ci')
    expect(mutated.status).not.toBe(0)
    expect(mutated.stderr).toMatch(/mutated package-lock.json/)
  })

  it('injects VITE_APP_RELEASE and VITE_COMMIT_SHA into the production build', () => {
    const repo = makeTempDir('sloty-fe-build-env-')
    const marker = path.join(repo, 'vite-env.txt')
    fs.writeFileSync(path.join(repo, 'package.json'), '{}\n', 'utf8')

    const result = sourceDeploy(
      [
        `npm() {`,
        `  if [ "$1" = run ] && [ "$2" = build ]; then`,
        `    printf '%s\\n' "\${VITE_APP_RELEASE}" > '${marker}'`,
        `    printf '%s\\n' "\${VITE_COMMIT_SHA}" >> '${marker}'`,
        `    return 0`,
        `  fi`,
        `  command npm "$@"`,
        `}`,
        `RELEASE_TAG="${VALID_RELEASE}"`,
        `COMMIT_SHA="${VALID_COMMIT}"`,
        `deploy_build`,
      ].join('\n'),
      { SLOTY_FRONTEND_DIR: repo },
    )

    expect(result.status, result.stderr).toBe(0)
    expect(fs.readFileSync(marker, 'utf8').trim().split('\n')).toEqual([
      VALID_RELEASE,
      VALID_COMMIT,
    ])
  })

  it('requires dist/index.html before publishing', () => {
    const repo = makeTempDir('sloty-fe-dist-missing-')
    const missingDir = sourceDeploy('deploy_validate_dist', {
      SLOTY_FRONTEND_DIR: repo,
    })

    fs.mkdirSync(path.join(repo, 'dist'))
    const missingIndex = sourceDeploy('deploy_validate_dist', {
      SLOTY_FRONTEND_DIR: repo,
    })

    fs.writeFileSync(path.join(repo, 'dist/index.html'), '<html></html>\n', 'utf8')
    const ok = sourceDeploy('deploy_validate_dist', {
      SLOTY_FRONTEND_DIR: repo,
    })

    expect(missingDir.status).not.toBe(0)
    expect(missingDir.stderr).toMatch(/dist/)
    expect(missingIndex.status).not.toBe(0)
    expect(missingIndex.stderr).toMatch(/index\.html/)
    expect(ok.status).toBe(0)
  })

  it('publishes the complete dist/ tree and deletes stale files', () => {
    const repo = makeTempDir('sloty-fe-publish-src-')
    const dest = makeTempDir('sloty-fe-publish-dest-')
    const dist = path.join(repo, 'dist')
    fs.mkdirSync(path.join(dist, 'assets'), { recursive: true })
    fs.writeFileSync(path.join(dist, 'index.html'), '<html>new</html>\n', 'utf8')
    fs.writeFileSync(path.join(dist, 'sw.js'), 'service-worker\n', 'utf8')
    fs.writeFileSync(
      path.join(dist, 'manifest.webmanifest'),
      '{"name":"Sloty"}\n',
      'utf8',
    )
    fs.writeFileSync(path.join(dist, 'assets/app.js'), 'hashed\n', 'utf8')
    fs.writeFileSync(path.join(dest, 'stale.js'), 'old hashed asset\n', 'utf8')
    fs.writeFileSync(path.join(dest, '.env'), 'should-be-removed\n', 'utf8')

    const result = sourceDeploy('deploy_publish', {
      SLOTY_FRONTEND_DIR: repo,
      SLOTY_FRONTEND_PUBLISH_DIR: dest,
    })

    expect(result.status, result.stderr).toBe(0)
    expect(fs.existsSync(path.join(dest, 'index.html'))).toBe(true)
    expect(fs.existsSync(path.join(dest, 'sw.js'))).toBe(true)
    expect(fs.existsSync(path.join(dest, 'manifest.webmanifest'))).toBe(true)
    expect(fs.existsSync(path.join(dest, 'assets/app.js'))).toBe(true)
    expect(fs.existsSync(path.join(dest, 'stale.js'))).toBe(false)
    expect(fs.existsSync(path.join(dest, '.env'))).toBe(false)
    expect(fs.existsSync(path.join(dest, 'node_modules'))).toBe(false)
    expect(fs.existsSync(path.join(dest, '.git'))).toBe(false)
  })

  it('does not publish when dist validation fails', () => {
    const publishDir = makeTempDir('sloty-fe-no-publish-')
    fs.writeFileSync(path.join(publishDir, 'keep.html'), 'live\n', 'utf8')
    const stubDir = path.join(publishDir, 'stubs')
    writeExecutable(
      path.join(stubDir, 'publish'),
      '#!/usr/bin/env bash\necho published > /tmp/should-not-exist\n',
    )

    const result = runDeploy([VALID_COMMIT, VALID_RELEASE], {
      SLOTY_FRONTEND_PUBLISH_DIR: publishDir,
      SLOTY_DEPLOY_STUB_DIR: stubDir,
      SLOTY_DEPLOY_FAIL_STAGE: 'validate',
    })

    expect(result.status).not.toBe(0)
    expect(fs.readFileSync(path.join(publishDir, 'keep.html'), 'utf8')).toBe(
      'live\n',
    )
  })

  it.each(['301', '302', '404', '500', '502', '503'])(
    'rejects public HTTP %s',
    (httpCode) => {
      const result = sourceDeploy(
        `curl() { printf '%s' "\${FAKE_CURL_HTTP_CODE}"; }; deploy_health`,
        {
          FAKE_CURL_HTTP_CODE: httpCode,
          SLOTY_HEALTH_ATTEMPTS: '1',
          SLOTY_HEALTH_RETRY_SLEEP: '0',
        },
      )

      expect(result.status).not.toBe(0)
      expect(result.stderr).toMatch(/HTTP 200/)
      expect(result.stderr).toContain(httpCode)
    },
  )

  it('accepts public HTTP 200', () => {
    const result = sourceDeploy(
      `curl() { printf '%s' 200; }; deploy_health`,
      {
        SLOTY_HEALTH_ATTEMPTS: '1',
        SLOTY_HEALTH_RETRY_SLEEP: '0',
      },
    )

    expect(result.status, result.stderr).toBe(0)
  })

  it('discovers the git repository from the script location', () => {
    const result = sourceDeploy('discover_sloty_frontend_dir')
    const expected = runGit(REPO_ROOT, 'rev-parse', '--show-toplevel').stdout.trim()

    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout.trim()).toBe(expected)
  })

  it('snapshots once, then cleans up the temporary directory', () => {
    const tmp = makeTempDir('sloty-fe-snapshot-')
    const trace = path.join(tmp, 'snapshot-trace')
    const marker = path.join(tmp, 'from-snapshot')
    const stubDir = path.join(tmp, 'stubs')
    writeExecutable(
      path.join(stubDir, 'health'),
      [
        '#!/usr/bin/env bash',
        'set -euo pipefail',
        `printf '%s\\n' "\${SLOTY_DEPLOY_RUNNING_FROM_SNAPSHOT}" > '${marker}'`,
        `printf '%s\\n' "\${SLOTY_DEPLOY_SNAPSHOT_DIR}" >> '${marker}'`,
        'test -f "${SLOTY_DEPLOY_SNAPSHOT_DIR}/deploy-sloty-frontend"',
        'test -f "${SLOTY_DEPLOY_SNAPSHOT_DIR}/lib/frontend-release.sh"',
        '',
      ].join('\n'),
    )

    const result = runDeploy([VALID_COMMIT, VALID_RELEASE], {
      SLOTY_DEPLOY_STUB_DIR: stubDir,
      SLOTY_DEPLOY_SNAPSHOT_TRACE: trace,
      SLOTY_FRONTEND_PUBLISH_DIR: path.join(tmp, 'www'),
    })

    expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0)
    const lines = fs.readFileSync(trace, 'utf8').trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(fs.readFileSync(marker, 'utf8').split('\n')[0]).toBe('1')
    expect(fs.existsSync(lines[0])).toBe(false)
  })

  it('does not recursively snapshot itself', () => {
    const tmp = makeTempDir('sloty-fe-snapshot-once-')
    const trace = path.join(tmp, 'snapshot-trace')

    const result = runDeploy([VALID_COMMIT, VALID_RELEASE], {
      SLOTY_DEPLOY_STUB_DIR: path.join(tmp, 'stubs'),
      SLOTY_DEPLOY_SNAPSHOT_TRACE: trace,
      SLOTY_FRONTEND_PUBLISH_DIR: path.join(tmp, 'www'),
    })

    expect(result.status, result.stderr).toBe(0)
    expect(fs.readFileSync(trace, 'utf8').trim().split('\n')).toHaveLength(1)
  })

  it('keeps deployment isolated to frontend static publication', () => {
    const script = fs.readFileSync(DEPLOY_SCRIPT, 'utf8')
    const lib = fs.readFileSync(LIB_SCRIPT, 'utf8')
    const combined = `${script}\n${lib}`

    expect(script).toContain('git -C')
    expect(script).toContain('rev-parse --show-toplevel')
    expect(script).toContain('fetch origin --prune')
    expect(script).toContain('checkout --detach')
    expect(script).toContain('merge-base --is-ancestor')
    expect(script).toContain('npm ci')
    expect(script).toContain('cat-file -e')
    expect(script).toContain('VITE_APP_RELEASE')
    expect(script).toContain('VITE_COMMIT_SHA')
    expect(script).toContain('npm run build')
    expect(script).toContain('dist/index.html')
    expect(script).toContain('rsync -a --delete')
    expect(script).toContain('/var/www/sloty/frontend')
    expect(script).toContain('https://sloty.baronlearning.com/')
    expect(script).toContain('--write-out')
    expect(script).toContain('%{http_code}')

    expect(script).not.toContain('git pull')
    expect(script).not.toMatch(/npm install(?:\s|$)/)
    expect(script).not.toContain('/usr/local/sbin')
    expect(script).not.toContain('/srv/sloty/frontend')
    expect(script).not.toContain('/srv/sloty/backend')
    expect(script).not.toContain('sloty-backend.service')
    expect(script).not.toContain('backend-release.json')
    expect(script).not.toContain('backend.env')
    expect(script).not.toContain('npm run preview')
    expect(script.toLowerCase()).not.toContain('pm2')
    expect(script).not.toMatch(/systemctl/)
    expect(script).not.toMatch(/nginx\s+-/)
    expect(script).not.toContain('docker')
    expect(combined).not.toContain('package.json version')
    expect(script).not.toContain('.env.production')
    expect(script.toLowerCase()).not.toContain('lotfy')
    expect(script.toLowerCase()).not.toContain('postgresql')
    expect(script.toLowerCase()).not.toContain('pg_ctl')
    expect(script.toLowerCase()).not.toContain('firewall')
    expect(script).not.toContain('manage.py')
    expect(script).not.toContain('migrate')
  })

  it('has valid Bash syntax', () => {
    assertBashSyntax(DEPLOY_SCRIPT)
    assertBashSyntax(LIB_SCRIPT)
  })
})
