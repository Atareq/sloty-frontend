# Frontend Architecture

This document describes the current application architecture, auth model, API boundaries, and shell composition for the Sloty frontend.

---

## 1. Authentication & Session Model

Authentication identity and application roles are managed centrally via [`useAuth()`](../src/core/auth/useAuth.ts) and [`AuthContext`](../src/core/auth/AuthContext.tsx).

### Current Roles
The system defines exactly three authenticated roles:
- `ADMIN`: Platform administrator. Access to all clubs, court listings, and global administration.
- `OWNER`: Club owner. Full operational and financial management across their owned clubs and courts.
- `STAFF`: Court operator. Operational schedule management and booking handling for assigned courts.

> [!NOTE]
> There is no `MANAGER` role, no `PLATFORM_ADMIN` read-role, and no `memberships[]` or `selectedMembership` array. Club and court scoping are derived directly from verified session state.

### Session State Hydration
Post-login, the session is hydrated from `/api/v1/me/` and exposes:
- `currentUser`: Profile data (`id`, `username`, `first_name`, `last_name`, `phone_number`, `profile_role`).
- `role`: Active `AuthRole` (`ADMIN` | `OWNER` | `STAFF`).
- `accessibleClubs`: Clubs accessible to the authenticated user.
- `selectedClubSlug`: The active club tenant slug.
- `accessibleCourts`: Courts belonging to the selected club that the user has authority to access.
- `selectedCourtId`: The active operational court ID.

### Operational Court Selection
Staff users are not locked to a single court if assigned to multiple courts.
- `canChooseOperationalCourt(role, courts)`: True for `ADMIN`, `OWNER`, or when `accessibleCourts.length > 1`.
- If a staff member has access to multiple courts, they can switch courts using the court selector.

---

## 2. Routing & Application Shell

### Application Composition
Routes are configured in [`src/app/router.tsx`](../src/app/router.tsx) using React Router. Every route is a child of one root layout route, [`SeoRouteBoundary`](../src/core/seo/SeoRouteBoundary.tsx), which owns document SEO (see section 7).

- **Guest Routes:** Public pages outside `AppShell`:
  - `/`: [`HomeRoute`](../src/app/HomeRoute.tsx). Visitors without a session in a normal browser tab (including crawlers) see the public homepage; signed-in users, session loading/errors, and installed-PWA launches get the role-aware `AuthLandingRedirect`.
  - `/assiut/`: Public Assiut landing page (indexable).
  - `/login`: User authentication (`noindex`).
  - `/public/:clubSlug/courts/:courtId/schedule`: Guest public availability schedule (`noindex` in Phase 1).
- **Authenticated Shell (`AppShell`):** Mounts all authenticated application routes:
  - Header: Single top-level `PageHeader` from [`src/layout/AppShell/AppShell.tsx`](../src/layout/AppShell/AppShell.tsx).
  - Navigation: Mobile bottom drawer / desktop sidebar.
  - Action FAB: `NewBookingFAB` on operational pages.
  - Synchronization: Mounts `OfflineSyncProvider` once around all feature pages.
- **Route Guards:**
  - `ProtectedRoute`: Ensures user is authenticated with a valid session.
  - `RoleRoute`: Restricts routes by `AuthRole`.

### Default Route by Role
- `ADMIN` → `/admin/clubs`
- `OWNER` → `/schedule`
- `STAFF` → `/schedule`
- Signed out: browser tab at `/` → public homepage; installed PWA at `/` → `/login`; protected routes → `/login`.

---

## 3. API Client & Endpoint Boundaries

All network traffic flows through the centralized API client.

### API Client (`src/core/api/apiClient.ts`)
- `apiRequest<T>(path, options)`:
  - Automatically attaches `Accept-Language: ar` on all requests.
  - Attaches `Authorization: Bearer <accessToken>` unless `omitAuth: true` is specified.
  - Handles 401 token refresh automatically with a single-flight mutex (`isRefreshingToken`).
  - Dispatches `auth:session-expired` if refresh fails.
  - Returns normalized errors via `SlotyApiError`.

### Endpoint Registry (`src/shared/api/apiEndpoints.ts`)
- All backend endpoints are registered centrally in `apiEndpoints`.
- **Never hardcode URL strings in feature code.**
- Versioned under `/api/v1/`.

---

## 4. Progressive Web App (PWA)

PWA infrastructure lives in [`src/pwa/`](../src/pwa/).

- **Service Worker:** Managed via `vite-plugin-pwa` with Workbox runtime.
- **Cache Policy:** Service Worker precaches compiled static assets (HTML, CSS, JS, approved icons, UI images) only.
- **No Runtime API Caching:** The Service Worker **never** runtime-caches authenticated API responses or business data. Operational data caching is strictly owned by Dexie IndexedDB (`src/offline/`).
- **Update Lifecycle:** Sloty frontend releases update automatically. Discovers deployed releases via [`src/core/release/releaseManager.ts`](../src/core/release/releaseManager.ts) by checking `/version.json` on startup and visibility resume. A mismatch triggers an automatic Service Worker update and single controlled reload without requiring user confirmation ("تحديث الآن" or "لاحقًا"). Reload loops are prevented via session guards.
- **Install Prompts:** Handles Chromium `beforeinstallprompt` and provides iOS Add-to-Home-Screen instructions independently from application updates.
- **Launch at `/`:** The manifest `start_url` stays `/`. `HomeRoute` detects standalone mode, so installed-app launches never show the public homepage.
- **Prerendered HTML & Fallback Shell:** `index.html` and `assiut/index.html` contain build-time prerendered public markup with static SEO heads; `app.html` contains the clean SPA fallback shell (`noindex, nofollow`, empty `#root`). Workbox `navigateFallback` is `app.html`, so private deep links and standalone app launches never fallback to prerendered homepage content. An inline guard in `index.html` additionally protects standalone launches starting at `/` until React replaces it.

---

## 5. Shared-Component Architecture (`KEEP IT UNITED`)

```text
KEEP IT UNITED
same behavior → same shared component
```

- Standardized reusable UI primitives reside in [`src/shared/components/`](../src/shared/components/).
- Feature components must reuse canonical primitives rather than implementing ad-hoc variants:
  - Single shell `PageHeader` (never create page-level custom headers).
  - `AppSheet` for all bottom sheet and modal workflows.
  - `AppButton` for all action buttons.
  - `AppCard` for surface cards.
  - `SearchInput`, `FilterSheet`, `OrderByControl`, `AppPagination` for lists.
- For complete UI specifications, see [`docs/ui-system.md`](ui-system.md).

---

## 6. Production CI/CD

Production is a static Vite build served by Nginx from `/var/www/sloty/frontend`. GitHub Actions on `master` deploys the exact merge SHA via [`scripts/deploy-sloty-frontend`](../scripts/deploy-sloty-frontend). There is no Node production process.

Build metadata is compiled in at build time (`VITE_APP_RELEASE`, `VITE_COMMIT_SHA`) and displayed through [`src/core/config/buildInfo.ts`](../src/core/config/buildInfo.ts) and [`src/shared/components/BuildInfo/`](../src/shared/components/BuildInfo/). Backend version remains a separate `GET /api/system/version/` read.

See [`docs/frontend-ci-cd.md`](frontend-ci-cd.md) for the release and publish contract.

---

## 7. SEO Layer

One SEO system serves every route:

```text
route handle.seo (src/app/router.tsx) → SeoRouteBoundary → applyDocumentSeo() → title, robots, canonical, Open Graph, JSON-LD
```

- Public indexable pages (`/`, `/assiut/`) declare `handle: routeSeo(...)`. Routes without a declaration inherit `privateAppSeo` (`noindex, nofollow`).
- Pages never write `document.title` or head tags.
- The canonical origin comes only from `VITE_PUBLIC_SITE_URL` ([`src/core/seo/publicSiteOrigin.ts`](../src/core/seo/publicSiteOrigin.ts)), never from `window.location`.
- `npm run build` prerenders the public pages and generates `robots.txt` and `sitemap.xml` through [`src/core/seo/seoBuildPlugin.ts`](../src/core/seo/seoBuildPlugin.ts).

See [`docs/seo.md`](seo.md) for the full contract.
