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
    bookings: {
      list: (clubSlug: string) => `clubs/${clubSlug}/bookings/`,
      detail: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/bookings/${id}/`,
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
    },
    courtWorkingHours: {
      list: (clubSlug: string) => `clubs/${clubSlug}/court-working-hours/`,
      detail: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/court-working-hours/${id}/`,
    },
    memberships: {
      list: (clubSlug: string) => `clubs/${clubSlug}/memberships/`,
      detail: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/memberships/${id}/`,
    },
    transactions: {
      list: (clubSlug: string) => `clubs/${clubSlug}/transactions/`,
      detail: (clubSlug: string, id: ApiId) =>
        `clubs/${clubSlug}/transactions/${id}/`,
    },
  },
  users: {
    list: 'users/',
    detail: (id: ApiId) => `users/${id}/`,
  },
} as const
