# Core

`src/core` owns cross-feature infrastructure:

- Auth session, `/me` hydration, token helpers, and route guards (`ProtectedRoute`, `RoleRoute`)
- Shared API client and error helpers

Do not place feature screens, presentational UI, or domain pages here. Route guards are UX helpers; the backend remains the permission authority.
