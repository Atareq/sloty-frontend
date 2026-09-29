import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEPLOY_SCRIPT, REPO_ROOT } from './helpers'

function readEnvValue(fileName: string, key: string): string | undefined {
  const source = fs.readFileSync(path.join(REPO_ROOT, fileName), 'utf8')
  return source.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim()
}

describe('SEO public site URL', () => {
  it('is configured for production builds', () => {
    expect(readEnvValue('.env.production', 'VITE_PUBLIC_SITE_URL')).toBe(
      'https://sloty.baronlearning.com/',
    )
  })

  it('matches the public URL the deploy script health-checks', () => {
    const deploySource = fs.readFileSync(DEPLOY_SCRIPT, 'utf8')
    const deployUrl = deploySource.match(/SLOTY_PUBLIC_URL:-([^}]+)\}/)?.[1]
    const seoUrl = readEnvValue('.env.production', 'VITE_PUBLIC_SITE_URL')

    expect(deployUrl).toBeDefined()
    expect(new URL(seoUrl ?? '').origin).toBe(new URL(deployUrl ?? '').origin)
  })

  it('keeps robots.txt and sitemap.xml generated, not hand-maintained in public/', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'public/robots.txt'))).toBe(false)
    expect(fs.existsSync(path.join(REPO_ROOT, 'public/sitemap.xml'))).toBe(false)
  })
})
