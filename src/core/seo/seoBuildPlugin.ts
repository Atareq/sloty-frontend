import react from '@vitejs/plugin-react'
import { createServer, loadEnv, type Plugin, type ResolvedConfig } from 'vite'

/** Root-relative module rendered at build time (see `src/app/seoPrerender.tsx`). */
const SEO_PRERENDER_ENTRY = '/src/app/seoPrerender.tsx'

interface StaticSeoFile {
  fileName: string
  source: string
}

/** Structural contract of the SSR-loaded prerender module. */
interface SeoPrerenderModule {
  renderStaticSeoFiles(input: {
    template: string
    siteUrl: string | undefined
  }): StaticSeoFile[]
}

/**
 * Build-only Vite plugin that emits Sloty's static SEO files.
 *
 * During `generateBundle` it renders the public pages with React on the
 * server, then rewrites `index.html` and emits `about/index.html`,
 * `app.html`, `robots.txt`, and `sitemap.xml`. Running before `closeBundle` matters:
 * vite-plugin-pwa generates the service worker there, so the precache
 * manifest sees the final HTML revisions. `version.json` and the PWA
 * manifest are never touched.
 *
 * The public origin comes from `VITE_PUBLIC_SITE_URL`; the build fails when it
 * is missing instead of publishing a sitemap for the wrong host.
 */
export function slotySeoPrerenderPlugin(): Plugin {
  let resolvedConfig: ResolvedConfig

  return {
    name: 'sloty:seo-prerender',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      resolvedConfig = config
    },
    async generateBundle(_outputOptions, bundle) {
      if (resolvedConfig.build.ssr) {
        return
      }

      const indexAsset = bundle['index.html']
      if (!indexAsset || indexAsset.type !== 'asset') {
        this.error('SEO prerender: index.html was not emitted by the build.')
      }

      const template =
        typeof indexAsset.source === 'string'
          ? indexAsset.source
          : new TextDecoder().decode(indexAsset.source)
      const env = loadEnv(
        resolvedConfig.mode,
        resolvedConfig.envDir || resolvedConfig.root,
        'VITE_',
      )

      const server = await createServer({
        configFile: false,
        root: resolvedConfig.root,
        mode: resolvedConfig.mode,
        logLevel: 'error',
        appType: 'custom',
        plugins: [react()],
        server: { middlewareMode: true, hmr: false, ws: false, watch: null },
        optimizeDeps: { noDiscovery: true, include: [] },
      })

      try {
        const prerenderModule = (await server.ssrLoadModule(
          SEO_PRERENDER_ENTRY,
        )) as unknown as SeoPrerenderModule
        const files = prerenderModule.renderStaticSeoFiles({
          template,
          siteUrl: env.VITE_PUBLIC_SITE_URL,
        })

        for (const file of files) {
          if (file.fileName === 'index.html') {
            indexAsset.source = file.source
          } else {
            this.emitFile({
              type: 'asset',
              fileName: file.fileName,
              source: file.source,
            })
          }
        }
      } finally {
        await server.close()
      }
    },
  }
}
