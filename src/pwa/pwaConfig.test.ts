import { describe, expect, it } from 'vitest'
import { slotyPwaManifest, slotyPwaOptions } from './pwaConfig'

describe('Sloty PWA configuration', () => {
  it('uses the existing role-aware landing route and standalone identity', () => {
    expect(slotyPwaManifest).toMatchObject({
      name: 'Sloty',
      short_name: 'Sloty',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: '#0B6B3A',
      background_color: '#F8FAFC',
      lang: 'ar',
      dir: 'rtl',
    })
  })

  it('declares normal, large, and safe maskable icon assets', () => {
    expect(slotyPwaManifest.icons).toEqual([
      expect.objectContaining({
        src: '/icons/sloty-192x192.png',
        sizes: '192x192',
        purpose: 'any',
      }),
      expect.objectContaining({
        src: '/icons/sloty-512x512.png',
        sizes: '512x512',
        purpose: 'any',
      }),
      expect.objectContaining({
        src: '/icons/sloty-maskable-512x512.png',
        sizes: '512x512',
        purpose: 'maskable',
      }),
    ])
  })

  it('keeps updates prompt-based and defines no business runtime cache', () => {
    expect(slotyPwaOptions.registerType).toBe('prompt')
    expect(slotyPwaOptions.injectRegister).toBe(false)
    expect(slotyPwaOptions.includeManifestIcons).toBe(false)
    expect(slotyPwaOptions.workbox.navigateFallback).toBe('index.html')
    expect(slotyPwaOptions.workbox.maximumFileSizeToCacheInBytes)
      .toBe(5 * 1024 * 1024)
    expect(slotyPwaOptions.workbox).not.toHaveProperty('runtimeCaching')
  })
})
