// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { WORKFLOW_PATH } from './helpers'

const WORKFLOW_TEXT = fs.readFileSync(WORKFLOW_PATH, 'utf8')

function jobBlock(jobId: string): string {
  const pattern = new RegExp(`^ {2}${jobId}:\\n`, 'm')
  const match = pattern.exec(WORKFLOW_TEXT)
  if (!match || match.index === undefined) {
    throw new Error(`Job ${jobId} not found`)
  }

  const start = match.index
  const rest = WORKFLOW_TEXT.slice(start + match[0].length)
  const nextJob = rest.search(/^ {2}[a-z0-9-]+:/m)
  return nextJob === -1
    ? WORKFLOW_TEXT.slice(start)
    : WORKFLOW_TEXT.slice(start, start + match[0].length + nextJob)
}

const MASTER_ONLY =
  "github.event_name == 'push' && github.ref == 'refs/heads/master'"

describe('Frontend CI/CD workflow', () => {
  it('uses the required workflow name, triggers, permissions, and concurrency', () => {
    expect(WORKFLOW_TEXT).toMatch(/^name: Frontend CI\/CD$/m)
    expect(WORKFLOW_TEXT).toContain('pull_request:')
    expect(WORKFLOW_TEXT).toContain('push:')
    expect(WORKFLOW_TEXT).toMatch(/branches:\n(?:\s+- (?:dev|master)\n){2}/)
    expect(WORKFLOW_TEXT).toContain('contents: read')
    expect(WORKFLOW_TEXT).toContain(
      'group: frontend-ci-cd-${{ github.ref }}',
    )
    expect(WORKFLOW_TEXT).toContain('cancel-in-progress: false')
  })

  it('runs Test with .nvmrc, npm ci, lint, tests, and production build', () => {
    const test = jobBlock('test')

    expect(test).toContain('name: Test')
    expect(test).toContain('actions/checkout@v7')
    expect(test).toContain('actions/setup-node@v7')
    expect(test).toContain('node-version-file: .nvmrc')
    expect(test).toContain('cache: npm')
    expect(test).toContain('npm ci')
    expect(test).toContain('npm run lint')
    expect(test).toContain('npm test')
    expect(test).toContain('npm run build')
    expect(test).toContain('bash -n scripts/deploy-sloty-frontend')
    expect(test).toContain('bash -n scripts/lib/frontend-release.sh')
    expect(test).not.toContain(MASTER_ONLY)
    expect(test).not.toMatch(/npm install(?:\s|$)/)
    expect(test).not.toContain('node-version: 22')
    expect(test).not.toContain('node-version: "22"')
  })

  it('skips production jobs on PRs and on push to dev', () => {
    const prepare = jobBlock('prepare-release')
    const deploy = jobBlock('deploy')
    const release = jobBlock('release')

    expect(prepare).toContain(`if: ${MASTER_ONLY}`)
    expect(deploy).toContain(`if: ${MASTER_ONLY}`)
    expect(release).toContain(`if: ${MASTER_ONLY}`)
    expect(jobBlock('test')).not.toContain('if:')
  })

  it('calculates the release once and reuses that output for deploy and GitHub release', () => {
    const prepare = jobBlock('prepare-release')
    const deploy = jobBlock('deploy')
    const release = jobBlock('release')

    expect(prepare).toContain('name: Prepare Production Release')
    expect(prepare).toContain('needs: test')
    expect(prepare).toContain('release_tag: ${{ steps.calc.outputs.release_tag }}')
    expect(prepare).toContain('resolve_production_release_tag')
    expect(deploy).not.toContain('resolve_production_release_tag')
    expect(release).not.toContain('resolve_production_release_tag')
    expect(deploy).toContain('needs.prepare-release.outputs.release_tag')
    expect(release).toContain('needs.prepare-release.outputs.release_tag')
    expect(deploy).toContain(
      '/srv/sloty/frontend/scripts/deploy-sloty-frontend',
    )
    expect(deploy).toContain('${{ github.sha }}')
    expect(deploy).toContain('${RELEASE_TAG}')
    expect(WORKFLOW_TEXT).not.toContain('/usr/local/sbin')
    expect(release).toContain('COMMIT_SHA: ${{ github.sha }}')
    expect(release).toContain('release_tag_sha_status')
    expect(release).toContain('conflict')
    expect(release).toContain('Sloty Frontend $RELEASE_TAG')
    expect(release).toContain('--generate-notes')
    expect(release).toContain('--target "$COMMIT_SHA"')
    expect(release).toContain('contents: write')
    expect(release).toContain('- prepare-release')
    expect(release).toContain('- deploy')
    expect(deploy).toContain('- test')
    expect(deploy).toContain('- prepare-release')
  })

  it('does not log production env files or invent a second API config', () => {
    expect(WORKFLOW_TEXT).not.toContain('.env.production')
    expect(WORKFLOW_TEXT).not.toContain('VITE_API_BASE_URL')
    expect(WORKFLOW_TEXT).not.toContain('cat ')
    expect(WORKFLOW_TEXT).not.toContain('package.json version')
    expect(WORKFLOW_TEXT).not.toContain('sloty-backend.service')
    expect(WORKFLOW_TEXT).not.toContain('docker')
  })

  it('deploys only on push to master and never from the Test job', () => {
    const test = jobBlock('test')
    const deploy = jobBlock('deploy')

    expect(test).not.toContain(
      '/srv/sloty/frontend/scripts/deploy-sloty-frontend',
    )
    expect(test).not.toContain('PROD_SSH_KEY')
    expect(test).not.toContain('ssh ')
    expect(deploy).toContain(`if: ${MASTER_ONLY}`)
    expect(deploy).toContain(
      '/srv/sloty/frontend/scripts/deploy-sloty-frontend',
    )
    expect(WORKFLOW_TEXT).not.toContain(
      '/usr/local/sbin/deploy-sloty-frontend',
    )
  })
})
