import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { slotyPwaOptions } from './src/pwa/pwaConfig.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA(slotyPwaOptions)],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.ts',
  },
})
