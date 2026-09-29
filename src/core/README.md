# Core

`src/core` owns cross-feature infrastructure:

- Auth session, `/me` hydration, token helpers, and route guards (`ProtectedRoute`, `RoleRoute`)
- Shared API client and error helpers
- Auth session, `/me` hydration, token storage, and route guards (`ProtectedRoute`, `RoleRoute`)
- Shared API client (`apiRequest`) and error normalization helpers

`AuthProvider` persists the minimal last Backend-verified selected membership
through `src/offline` and awaits user-owned IndexedDB cleanup on explicit
logout. Session-expiry clearing remains separate and does not delete scoped
operational snapshots.
`AuthProvider` persists the minimal last Backend-verified selected club and operational context through `src/offline` and awaits user-owned IndexedDB cleanup on explicit logout. Session-expiry clearing remains separate and does not delete scoped operational snapshots.

`src/core/seo` owns the single SEO system: route SEO types, the head-tag builder shared by runtime and build, `SeoRouteBoundary` (root layout route), the canonical origin from `VITE_PUBLIC_SITE_URL`, and the build-only prerender/robots/sitemap plugin. See `docs/seo.md`.

Do not place feature screens, presentational UI, or domain pages here. Route guards are UX helpers; the backend remains the permission authority.
