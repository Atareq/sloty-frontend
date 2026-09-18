import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)
export const DEPLOY_SCRIPT = path.join(REPO_ROOT, 'scripts/deploy-sloty-frontend')
export const LIB_SCRIPT = path.join(
  REPO_ROOT,
  'scripts/lib/frontend-release.sh',
)
export const WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github/workflows/frontend-ci-cd.yml',
)

export const VALID_COMMIT = 'a13c92e34b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e'
export const VALID_RELEASE = 'v0.3.0'

export function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

export function runGit(cwd: string, ...args: string[]): SpawnSyncReturns<string> {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${result.stderr || result.stdout}`,
    )
  }
  return result
}

export function initGitRepo(repoPath: string): string {
  fs.mkdirSync(repoPath, { recursive: true })
  runGit(repoPath, 'init')
  runGit(repoPath, 'config', 'user.email', 'ci@example.com')
  runGit(repoPath, 'config', 'user.name', 'CI')
  runGit(repoPath, 'config', 'commit.gpgsign', 'false')
  fs.writeFileSync(path.join(repoPath, 'README'), 'init\n', 'utf8')
  runGit(repoPath, 'add', 'README')
  runGit(repoPath, 'commit', '-m', 'init')
  runGit(repoPath, 'branch', '-M', 'master')
  return repoPath
}

export function gitSha(cwd: string): string {
  return spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd,
    encoding: 'utf8',
  }).stdout.trim()
}

export function sourceLib(
  command: string,
  cwd: string,
  extraEnv: Record<string, string> = {},
): SpawnSyncReturns<string> {
  return spawnSync('bash', ['-c', `source '${LIB_SCRIPT}'; ${command}`], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  })
}

export function sourceDeploy(
  command: string,
  extraEnv: Record<string, string> = {},
): SpawnSyncReturns<string> {
  return spawnSync('bash', ['-c', `source '${DEPLOY_SCRIPT}'; ${command}`], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      SLOTY_DEPLOY_SOURCE_ONLY: '1',
      ...extraEnv,
    },
  })
}

export function runDeploy(
  args: string[],
  extraEnv: Record<string, string> = {},
): SpawnSyncReturns<string> {
  const stubDir = extraEnv.SLOTY_DEPLOY_STUB_DIR
  if (stubDir) {
    fs.mkdirSync(stubDir, { recursive: true })
  }

  return spawnSync('bash', [DEPLOY_SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...extraEnv,
    },
  })
}

export function assertBashSyntax(filePath: string): void {
  const result = spawnSync('bash', ['-n', filePath], { encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(
      `bash -n ${filePath} failed: ${result.stderr || result.stdout}`,
    )
  }
}
