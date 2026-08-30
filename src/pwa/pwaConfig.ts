import type { ManifestOptions, VitePWAOptions } from 'vite-plugin-pwa'

/**
 * Sloty's manifest deliberately launches at `/` so the existing auth landing
 * redirect can choose the correct destination for every role and club state.
 */
export const slotyPwaManifest = {
  name: 'Sloty',
  short_name: 'Sloty',
  description: 'نظام سلوتي لإدارة حجوزات الملاعب',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  theme_color: '#0B6B3A',
  background_color: '#F8FAFC',
  lang: 'ar',
  dir: 'rtl',
  icons: [
    {
      src: '/icons/sloty-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/sloty-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/sloty-maskable-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
} satisfies Partial<ManifestOptions>

/**
 * The generated service worker owns only the static application shell.
 * There is intentionally no runtimeCaching policy for API or authenticated
 * business responses; later offline tasks will store approved data explicitly.
 */
export const slotyPwaOptions = {
  strategies: 'generateSW',
  registerType: 'prompt',
  injectRegister: false,
  manifestFilename: 'manifest.webmanifest',
  includeManifestIcons: false,
  manifest: slotyPwaManifest,
  workbox: {
    cleanupOutdatedCaches: true,
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    navigateFallback: 'index.html',
    navigateFallbackDenylist: [/^\/api(?:\/|$)/],
  },
  devOptions: {
    enabled: false,
  },
} satisfies Partial<VitePWAOptions>
