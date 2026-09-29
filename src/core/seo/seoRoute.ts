import { privateAppSeo } from './seoConfig'
import type { PageSeo } from './seo.types'

/** Shape of a React Router `handle` that declares route SEO. */
export interface SeoRouteHandle {
  seo: PageSeo
}

/**
 * Declares SEO for a route in the router table: `handle: routeSeo(homePageSeo)`.
 *
 * Keeping SEO on the route (not inside page components) makes the router the
 * single place to audit which URLs are indexable.
 */
export function routeSeo(seo: PageSeo): SeoRouteHandle {
  return { seo }
}

function isSeoRouteHandle(handle: unknown): handle is SeoRouteHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    'seo' in handle &&
    typeof (handle as { seo: unknown }).seo === 'object'
  )
}

/**
 * Resolves the SEO for the current route matches.
 *
 * The deepest route with `handle.seo` wins. Routes without a declaration use
 * the private `noindex` default.
 */
export function resolveRouteSeo(
  matches: readonly { handle: unknown }[],
): PageSeo {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const { handle } = matches[index]
    if (isSeoRouteHandle(handle)) {
      return handle.seo
    }
  }

  return privateAppSeo
}
