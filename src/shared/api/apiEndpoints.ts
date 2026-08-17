type ApiId = number | string

/**
 * Shared registry for agreed Sloty API endpoint paths.
 *
 * Keep components and feature pages dependent on these builders instead of
 * hardcoding URL strings. The paths stay relative to `API_BASE_URL`.
 */
export const apiEndpoints = {
  auth: {
    token: 'auth/token/',
    refresh: 'auth/token/refresh/',
    me: 'me/',
  },
  egyptLocations: 'egypt-locations/',
  clubs: {
    list: 'clubs/',
    detail: (id: ApiId) => `clubs/${id}/`,
    auditLogs: {
      list: (clubSlug: string) => `clubs/${clubSlug}/audit-logs/`,
    },
    bookings: {
      list: (clubSlug: string) => `clubs/${clubSlug}/bookings/`,
      slots: (clubSlug: string) => `clubs/${clubSlug}/bookings/slots/`,
      detail: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/bookings/${id}/`,
      cancellationPreview: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/bookings/${id}/cancellation-preview/`,
      cancel: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/bookings/${id}/cancel/`,
      complete: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/bookings/${id}/complete/`,
      expire: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/bookings/${id}/expire/`,
      noShow: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/bookings/${id}/no-show/`,
    },
    courts: {
      list: (clubSlug: string) => `clubs/${clubSlug}/courts/`,
      detail: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/courts/${id}/`,
      workingHours: {
        detail: (clubSlug: string, courtId: ApiId) =>
          `clubs/${clubSlug}/courts/${courtId}/working-hours/`,
      },
    },
    dashboard: {
      summary: (clubSlug: string) => `clubs/${clubSlug}/dashboard/summary/`,
    },
    memberships: {
      list: (clubSlug: string) => `clubs/${clubSlug}/memberships/`,
      detail: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/memberships/${id}/`,
    },
    reports: {
      list: (clubSlug: string) => `clubs/${clubSlug}/reports/`,
      courtUsage: (clubSlug: string) =>
        `clubs/${clubSlug}/reports/court-usage/`,
    },
    recurringAgreements: {
      list: (clubSlug: string) => `clubs/${clubSlug}/recurring-agreements/`,
      detail: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/recurring-agreements/${id}/`,
      availability: (clubSlug: string) =>
        `clubs/${clubSlug}/recurring-agreements/availability/`,
      cancellationPreview: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/recurring-agreements/${id}/cancellation-preview/`,
      cancel: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/recurring-agreements/${id}/cancel/`,
      refundDeposit: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/recurring-agreements/${id}/refund-deposit/`,
    },
    settlements: {
      list: (clubSlug: string) => `clubs/${clubSlug}/settlements/`,
      preview: (clubSlug: string) =>
        `clubs/${clubSlug}/settlements/preview/`,
      detail: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/settlements/${id}/`,
      markSettled: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/settlements/${id}/mark-settled/`,
    },
    transactions: {
      list: (clubSlug: string) => `clubs/${clubSlug}/transactions/`,
      detail: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/transactions/${id}/`,
      cancel: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/transactions/${id}/cancel/`,
    },
    users: {
      list: (clubSlug: string) => `clubs/${clubSlug}/users/`,
    },
  },
  users: {
    list: 'users/',
    detail: (id: ApiId) => `users/${id}/`,
  },
} as const
