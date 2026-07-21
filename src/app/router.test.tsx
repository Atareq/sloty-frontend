import { isValidElement, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { RoleRoute } from '../core/auth/RoleRoute'
import { SettlementPreviewPage } from '../features/settlements/SettlementPreviewPage/SettlementPreviewPage'
import { SettlementsHubPage } from '../features/settlements/SettlementsHubPage/SettlementsHubPage'
import { router } from './router'

function getProtectedChildRoute(path: string) {
  const appShellRoute = router.routes.find((route) => route.children)
  const route = appShellRoute?.children?.find((childRoute) => childRoute.path === path)

  if (!route || !isValidElement(route.element)) {
    return null
  }

  return route.element as ReactElement<{
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
