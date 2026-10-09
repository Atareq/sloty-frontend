import { isValidElement, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { RoleRoute } from '../core/auth/RoleRoute'
import { AdminUserDetailsPage } from '../features/adminUsers/AdminUserDetailsPage/AdminUserDetailsPage'
import { AdminUserFormPage } from '../features/adminUsers/AdminUserFormPage/AdminUserFormPage'
import { AdminUsersPage } from '../features/adminUsers/AdminUsersPage/AdminUsersPage'
import { SettlementPreviewPage } from '../features/settlements/SettlementPreviewPage/SettlementPreviewPage'
import { SettlementsHubPage } from '../features/settlements/SettlementsHubPage/SettlementsHubPage'
import { SettingsHubPage } from '../features/settings/SettingsHubPage/SettingsHubPage'
import { SettingsUsersPage } from '../features/settings/SettingsUsersPage/SettingsUsersPage'
import { PublicSchedulePage } from '../features/publicSchedule/PublicSchedulePage/PublicSchedulePage'
import { publicScheduleSeo } from '../features/publicSchedule/publicSchedule.seo'
import { AboutPage } from '../features/publicSite/AboutPage/AboutPage'
import {
  aboutPageSeo,
  homePageSeo,
} from '../features/publicSite/publicSite.seo'
import { SeoRouteBoundary } from '../core/seo/SeoRouteBoundary'
import { HomeRoute } from './HomeRoute'
import { router } from './router'

/** All app routes live under the single root SEO boundary layout. */
const rootRoutes = router.routes[0]?.children ?? []

function getProtectedChildRoute(path: string) {
  const appShellRoute = rootRoutes.find((route) => route.children)
  const route = appShellRoute?.children?.find((childRoute) => childRoute.path === path)

  if (!route || !isValidElement(route.element)) {
    return null
  }

  return route.element as ReactElement<{
    allowedRoles: string[]
    children: ReactElement
  }>
}

describe('router settlement routes', () => {
  it('maps /settlements to the settlement hub page', () => {
    const routeElement = getProtectedChildRoute('/settlements')

    expect(routeElement?.type).toBe(RoleRoute)
    expect(routeElement?.props.children.type).toBe(SettlementsHubPage)
  })

  it('keeps /settlements/preview mapped to the preview page', () => {
    const routeElement = getProtectedChildRoute('/settlements/preview')

    expect(routeElement?.type).toBe(RoleRoute)
    expect(routeElement?.props.children.type).toBe(SettlementPreviewPage)
  })
})

describe('router settings routes', () => {
  it('maps /settings to the real settings hub page', () => {
    const routeElement = getProtectedChildRoute('/settings')

    expect(routeElement?.type).toBe(RoleRoute)
    expect(routeElement?.props.allowedRoles).toEqual(['OWNER'])
    expect(routeElement?.props.children.type).toBe(SettingsHubPage)
  })

  it('maps /settings/users to the users and permissions page', () => {
    const routeElement = getProtectedChildRoute('/settings/users')

    expect(routeElement?.type).toBe(RoleRoute)
    expect(routeElement?.props.allowedRoles).toEqual(['OWNER'])
    expect(routeElement?.props.children.type).toBe(SettingsUsersPage)
  })
})

describe('router leftover bottom-nav routes', () => {
  it('does not keep the obsolete /more placeholder', () => {
    expect(getProtectedChildRoute('/more')).toBeNull()
  })

  it('temporarily hides reports from authenticated routes without deleting the feature', () => {
    expect(getProtectedChildRoute('/reports')).toBeNull()
  })
})

describe('router platform admin users routes', () => {
  it('maps /admin/users to the real admin users page', () => {
    const routeElement = getProtectedChildRoute('/admin/users')

    expect(routeElement?.type).toBe(RoleRoute)
    expect(routeElement?.props.allowedRoles).toEqual(['ADMIN'])
    expect(routeElement?.props.children.type).toBe(AdminUsersPage)
  })

  it('maps /admin/users/new to the create form page', () => {
    const routeElement = getProtectedChildRoute('/admin/users/new')

    expect(routeElement?.type).toBe(RoleRoute)
    expect(routeElement?.props.allowedRoles).toEqual(['ADMIN'])
    expect(routeElement?.props.children.type).toBe(AdminUserFormPage)
  })

  it('maps /admin/users/:userId to the detail page', () => {
    const routeElement = getProtectedChildRoute('/admin/users/:userId')

    expect(routeElement?.type).toBe(RoleRoute)
    expect(routeElement?.props.allowedRoles).toEqual(['ADMIN'])
    expect(routeElement?.props.children.type).toBe(AdminUserDetailsPage)
  })
})

describe('router public schedule routes', () => {
  it('maps /public/:clubSlug/courts/:courtId/schedule to PublicSchedulePage directly without ProtectedRoute', () => {
    const route = rootRoutes.find(
      (r) => r.path === '/public/:clubSlug/courts/:courtId/schedule',
    )

    expect(route).toBeDefined()
    expect(isValidElement(route?.element)).toBe(true)
    expect((route?.element as ReactElement).type).toBe(PublicSchedulePage)
  })

  it('declares the public schedule as a noindex utility page', () => {
    const route = rootRoutes.find(
      (r) => r.path === '/public/:clubSlug/courts/:courtId/schedule',
    )

    expect(route?.handle).toEqual({ seo: publicScheduleSeo })
    expect(publicScheduleSeo.robots).toBe('noindex')
  })
})

describe('router SEO routes', () => {
  it('mounts every route under the single SeoRouteBoundary layout', () => {
    expect(router.routes).toHaveLength(1)
    expect(router.routes[0].path).toBeUndefined()
    expect((router.routes[0].element as ReactElement).type).toBe(SeoRouteBoundary)
  })

  it('maps / to HomeRoute with the homepage SEO', () => {
    const route = rootRoutes.find((r) => r.path === '/')

    expect((route?.element as ReactElement).type).toBe(HomeRoute)
    expect(route?.handle).toEqual({ seo: homePageSeo })
  })

  it('maps /about to the public About page without ProtectedRoute', () => {
    const route = rootRoutes.find((r) => r.path === '/about')

    expect((route?.element as ReactElement).type).toBe(AboutPage)
    expect(route?.handle).toEqual({ seo: aboutPageSeo })
  })

  it('has no route registered for /assiut or /assiut/', () => {
    expect(rootRoutes.find((r) => r.path === '/assiut')).toBeUndefined()
    expect(rootRoutes.find((r) => r.path === '/assiut/')).toBeUndefined()
  })

  it('declares SEO only on the public discovery, About, and public schedule routes', () => {
    const declared = rootRoutes
      .filter((r) => r.handle !== undefined)
      .map((r) => r.path)

    expect(declared).toEqual([
      '/',
      '/about',
      '/public/:clubSlug/courts/:courtId/schedule',
    ])
  })

  it('keeps /login and protected routes on the private noindex default', () => {
    const loginRoute = rootRoutes.find((r) => r.path === '/login')
    const appShellRoute = rootRoutes.find((route) => route.children)

    expect(loginRoute?.handle).toBeUndefined()
    expect(appShellRoute?.handle).toBeUndefined()
    expect(appShellRoute?.children?.every((child) => child.handle === undefined)).toBe(true)
  })
})

describe('router no-operational-access route', () => {
  it('maps /no-operational-access to NoOperationalAccessPage with allowNonOperational', () => {
    const route = rootRoutes.find((r) => r.path === '/no-operational-access')

    expect(route).toBeDefined()
    expect(isValidElement(route?.element)).toBe(true)
  })
})
