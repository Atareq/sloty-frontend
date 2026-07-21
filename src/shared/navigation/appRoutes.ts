type AppRouteId = number | string

/**
 * Shared frontend route paths for navigation helpers and future Summary cards.
 */
export const appRoutes = {
  auditLogs: '/audit-logs',
  bookings: '/bookings',
  dashboard: '/dashboard',
  settlementDetail: (id: AppRouteId) => `/settlements/${id}`,
  settlementPreview: '/settlements/preview',
  settlements: '/settlements',
  settings: '/settings',
  settingsUsers: '/settings/users',
  transactions: '/transactions',
} as const
