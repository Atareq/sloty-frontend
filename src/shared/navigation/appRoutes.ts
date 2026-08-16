type AppRouteId = number | string

/**
 * Shared frontend route paths for navigation helpers and future Summary cards.
 */
export const appRoutes = {
  adminClubs: '/admin/clubs',
  adminUsers: '/admin/users',
  adminUserNew: '/admin/users/new',
  adminUserDetail: (id: AppRouteId) => `/admin/users/${id}`,
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
