# Core

`src/core` owns cross-feature infrastructure:

- Auth session, `/me` hydration, token helpers, and route guards (`ProtectedRoute`, `RoleRoute`)
- Shared API client and error helpers

`AuthProvider` persists the minimal last Backend-verified selected membership
through `src/offline` and awaits user-owned IndexedDB cleanup on explicit
logout. Session-expiry clearing remains separate and does not delete scoped
operational snapshots.

Do not place feature screens, presentational UI, or domain pages here. Route guards are UX helpers; the backend remains the permission authority.
