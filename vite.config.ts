import net from 'node:net'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { slotyPwaOptions } from './src/pwa/pwaConfig.js'

// Workaround for Vite internal port checking bug on Linux:
// Vite's internal isPortAvailable() opens and immediately closes dummy sockets on all wildcard hosts
// ('0.0.0.0', '::', '0000:0000:0000:0000:0000:0000:0000:0000'). Because '::' and the uncompressed
// IPv6 address are identical, the second check fails with EADDRINUSE, and lingering socket TIME_WAIT
// causes every single port to be marked as in use, resulting in an infinite port increment loop.
// We intercept net.createServer so the probe immediately reports available without opening dummy sockets.
// The actual server binding still happens via http.createServer and correctly detects occupied ports.
const origNetCreateServer = net.createServer
// @ts-expect-error Monkey-patching net.createServer for Vite internal probe
net.createServer = function (...args: Parameters<typeof origNetCreateServer>) {
  const s = origNetCreateServer.apply(this, args)
  const stack = new Error().stack || ''
  if (stack.includes('tryListen')) {
    s.listen = function () {
      process.nextTick(() => {
        s.emit('listening')
      })
      return s
    }
  }
  return s
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA(slotyPwaOptions)],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.ts',
  },
})
