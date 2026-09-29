import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildPublicSiteUrl,
  getPublicSiteOrigin,
  normalizePublicSiteOrigin,
} from './publicSiteOrigin'

describe('normalizePublicSiteOrigin', () => {
  it('reduces a configured URL to its bare origin', () => {
    expect(normalizePublicSiteOrigin('https://sloty.baronlearning.com/')).toBe(
      'https://sloty.baronlearning.com',
    )
    expect(normalizePublicSiteOrigin(' https://sloty.example/some/path?q=1 ')).toBe(
      'https://sloty.example',
    )
  })

  it('rejects missing, relative, and non-http values', () => {
    expect(normalizePublicSiteOrigin(undefined)).toBeNull()
    expect(normalizePublicSiteOrigin('')).toBeNull()
    expect(normalizePublicSiteOrigin('/relative')).toBeNull()
    expect(normalizePublicSiteOrigin('javascript:alert(1)')).toBeNull()
    expect(normalizePublicSiteOrigin('ftp://sloty.example')).toBeNull()
  })
})

describe('getPublicSiteOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads VITE_PUBLIC_SITE_URL, never the browser location', () => {
    vi.stubEnv('VITE_PUBLIC_SITE_URL', 'https://sloty.baronlearning.com/')

    expect(window.location.origin).not.toBe('https://sloty.baronlearning.com')
    expect(getPublicSiteOrigin()).toBe('https://sloty.baronlearning.com')
  })

  it('returns null when the public site URL is not configured', () => {
    vi.stubEnv('VITE_PUBLIC_SITE_URL', '')

    expect(getPublicSiteOrigin()).toBeNull()
  })
})

describe('buildPublicSiteUrl', () => {
  it('joins the origin with a canonical path', () => {
    expect(buildPublicSiteUrl('https://sloty.example', '/assiut/')).toBe(
      'https://sloty.example/assiut/',
    )
  })
})
