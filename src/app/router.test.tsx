import { isValidElement, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { RoleRoute } from '../core/auth/RoleRoute'
import { AdminUserDetailsPage } from '../features/adminUsers/AdminUserDetailsPage/AdminUserDetailsPage'
import { AdminUserFormPage } from '../features/adminUsers/AdminUserFormPage/AdminUserFormPage'
import { AdminUsersPage } from '../features/adminUsers/AdminUsersPage/AdminUsersPage'
import { ReportsPage } from '../features/reports/ReportsPage/ReportsPage'
import { SettlementPreviewPage } from '../features/settlements/SettlementPreviewPage/SettlementPreviewPage'
import { SettlementsHubPage } from '../features/settlements/SettlementsHubPage/SettlementsHubPage'
import { SettingsHubPage } from '../features/settings/SettingsHubPage/SettingsHubPage'
import { SettingsUsersPage } from '../features/settings/SettingsUsersPage/SettingsUsersPage'
import { router } from './router'

function getProtectedChildRoute(path: string) {
  const appShellRoute = router.routes.find((route) => route.children)
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
    expect(routeElement?.props.allowedRoles).toEqual(['OWNER', 'MANAGER'])
    expect(routeElement?.props.children.type).toBe(SettingsHubPage)
  })

  it('maps /settings/users to the users and permissions page', () => {
    const routeElement = getProtectedChildRoute('/settings/users')

    expect(routeElement?.type).toBe(RoleRoute)
    expect(routeElement?.props.allowedRoles).toEqual(['OWNER'])
    expect(routeElement?.props.children.type).toBe(SettingsUsersPage)
  })
})

describe('router report routes', () => {
  it('allows owner and manager roles to reach reports', () => {
    const routeElement = getProtectedChildRoute('/reports')

    expect(routeElement?.type).toBe(RoleRoute)
    expect(routeElement?.props.allowedRoles).toEqual(['OWNER', 'MANAGER'])
    expect(routeElement?.props.children.type).toBe(ReportsPage)
  })
})

describe('router leftover bottom-nav routes', () => {
  it('does not keep the obsolete /more placeholder', () => {
    expect(getProtectedChildRoute('/more')).toBeNull()
  })
})

describe('router platform admin users routes', () => {
  it('maps /admin/users to the real admin users page', () => {
    const routeElement = getProtectedChildRoute('/admin/users')

    expect(routeElement?.type).toBe(RoleRoute)
    expect(routeElement?.props.allowedRoles).toEqual(['PLATFORM_ADMIN'])
    expect(routeElement?.props.children.type).toBe(AdminUsersPage)
  })

  it('maps /admin/users/new to the create form page', () => {
    const routeElement = getProtectedChildRoute('/admin/users/new')

    expect(routeElement?.type).toBe(RoleRoute)
    expect(routeElement?.props.allowedRoles).toEqual(['PLATFORM_ADMIN'])
    expect(routeElement?.props.children.type).toBe(AdminUserFormPage)
  })

  it('maps /admin/users/:userId to the detail page', () => {
    const routeElement = getProtectedChildRoute('/admin/users/:userId')

    expect(routeElement?.type).toBe(RoleRoute)
    expect(routeElement?.props.allowedRoles).toEqual(['PLATFORM_ADMIN'])
    expect(routeElement?.props.children.type).toBe(AdminUserDetailsPage)
  })
})
