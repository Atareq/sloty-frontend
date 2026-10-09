# Sloty React Frontend Agent Guide
# Sloty Frontend Agent Guide (`AGENTS.md`)

This file is the living root guide for AI coding agents and human engineers working in the Sloty frontend repository.
Always read this file and [`docs/index.md`](docs/index.md) before planning or executing code changes.
This file is the living root guide for AI coding agents and engineers working in the Sloty frontend repository.
Always consult [`docs/index.md`](docs/index.md) for detailed subsystem and domain guides.

---

## 1. Repository Identity & Stack

This is the **Sloty frontend** repository. It is frontend-only and must never contain backend, Django, database, serializer, model, migration, or backend settings changes.

- **Framework & Language:** React 19 + TypeScript (strict mode, no `any`)
- **Framework & Language:** React 19 + TypeScript (strict mode, zero `any`)
- **Build Tool & Bundler:** Vite
- **Styling:** Tailwind CSS (Arabic-first, RTL-first, mobile-first)
- **Routing:** React Router 8
- **Testing:** Vitest + Testing Library
- **Local Storage & Offline:** Dexie (IndexedDB `sloty_local_db` version 3) + `vite-plugin-pwa`
- **Linting & Formatting:** ESLint + Prettier

---

## 2. Source of Truth & Precedence Semantics

When engineering in this repository, clearly distinguish between **instruction precedence** (how agents and engineers must operate) and **implementation truth** (what the system currently does):
When engineering in this repository, resolve conflicts using this strict hierarchy:

### A. Engineering Instruction Precedence
Governs engineering conduct, non-negotiable boundaries, safety rules, and architectural constraints:
1. **Root `AGENTS.md` (this file) & nearest applicable Scoped `AGENTS.md`:**
   - Offline Subsystem: [`src/offline/AGENTS.md`](src/offline/AGENTS.md) (governs `src/offline/**` only; `src/pwa/**` is governed by root `AGENTS.md`, [`docs/offline-architecture.md`](docs/offline-architecture.md), and [`src/pwa/README.md`](src/pwa/README.md)).
   - Operational Schedule: [`src/features/schedule/AGENTS.md`](src/features/schedule/AGENTS.md) (governs `src/features/schedule/**`).
   - Guest Public Schedule: [`src/features/publicSchedule/AGENTS.md`](src/features/publicSchedule/AGENTS.md) (governs `src/features/publicSchedule/**`).
2. **Current Durable Specifications** (under `docs/`): Detailed architecture and UX standards indexed in [`docs/index.md`](docs/index.md).
3. **Current Durable Product & UX Specifications** (under `docs/`).
```text
Code + Tests + Active OpenAPI Contracts
                  ↓
          Root AGENTS.md
                  ↓
         Scoped Feature Guides
                  ↓
       Target Architecture Docs (docs/)
```

### B. Implementation & Architecture Truth
When determining factual system behavior, what features exist, and how contracts behave:
1. **Current Approved Local Working Tree:** Active implementation source of truth for approved staged/unstaged changes. Never revert or replace newer approved local implementation with stale documentation or remote branches.
2. **Current Tests Describing Approved Behavior:** Tests encode verified behavioral contracts.
3. **Current APIs & Contracts Actually Consumed:** Live endpoint contracts consumed by the frontend.
4. **Current Durable Architecture & Product Documentation:** High-level architectural specifications.
5. **Historical / Reference Documentation:** Context only; never authoritative over current code.
### Key Principles
1. **Implementation Truth:** Active code, unit tests, and live OpenAPI contracts are authoritative for current behavior.
2. **Never Force Regressions:** If any documentation or past guideline conflicts with active approved code, **the code wins**. Update the documentation to reflect reality.
3. **Target vs. Active:** Architecture docs under `docs/` describe durable standards. Do not force code changes based on historical reference notes.

> [!IMPORTANT]
> A stale domain statement in documentation must **never** force current approved code back to old behavior. When code and documentation diverge on approved behavior, update the documentation to match code reality.

---

## 3. Non-Negotiable Engineering Boundaries

### 1. Strict Frontend Scope
- This repository contains **zero** backend code. Do not propose or execute backend Django, model, migration, or Python edits.
- This repository contains **zero backend code**. Never propose, touch, or execute backend Django, model, migration, or Python edits.

### 2. Worktree Safety & Non-Destructive Operation
- **NEVER run destructive git commands:** `git reset --hard`, `git checkout .`, `git restore .`, `git clean`, or `git stash`.
- Preserve all existing user modifications in the working tree.

### 3. Arabic-First, RTL-First, Mobile-First
- Start layouts from mobile viewports and progressively enhance for tablet and desktop using responsive Tailwind prefixes (`sm:`, `md:`, `lg:`).
- Never ship a desktop page that resembles a centered phone mockup.
- Mobile text-entry controls (`input`, `textarea`, `select`) must remain at least 16px to prevent mobile browser auto-zoom.
- Start layouts from mobile viewports and progressively enhance for tablet/desktop using responsive Tailwind prefixes (`sm:`, `md:`, `lg:`).
- Never ship desktop layouts that look like a narrow, centered mobile screen.
- Mobile text inputs (`input`, `textarea`, `select`) must remain at least 16px to prevent mobile browser auto-zoom.

### 4. Unified Design System Integrity
- **One PageHeader:** All authenticated shell pages use the single shell-level `PageHeader` from `AppShell`. Never create custom page headers.
- **One AppSheet:** Non-full-page temporary flows use `AppSheet` (mobile bottom sheet / desktop modal).
- **Header actions and overlays:** A full-screen `AppSheet` opened from `PageHeaderAction` must portal its overlay to `document.body`; the shell header owns overflow, sticky, and stacking styles and must contain only the trigger/action presentation.
- **One Brand Palette:** Use Sloty's canonical green palette and surface tokens documented in [`docs/ui-reference.md`](docs/ui-reference.md).
- **No Rogue Primitives:** Do not copy V0 prototype components or add unapproved UI component libraries.
### 4. Unified Design System (`KEEP IT UNITED`)
- **One PageHeader:** Authenticated pages use the shell-level `PageHeader` from `AppShell`. Never build custom page headers.
- **One AppSheet:** Non-full-page flows use `AppSheet` (mobile bottom sheet / desktop dialog).
- **One Brand Palette:** Use canonical Sloty green and surface tokens documented in [`docs/ui-system.md`](docs/ui-system.md).
- **No Rogue Primitives:** Do not introduce unapproved UI libraries or copy raw V0 components.

### 5. Schedule Orchestration Separation (Same Schedule Product / Experience)
- **Same Product Experience:** Guest Public Schedule and Authenticated Operational Schedule share the same Sloty visual design, brand palette, and schedule identity.
- **Separate Orchestration & Data Contracts:**
  - **Guest (`/public/:clubSlug/courts/:courtId/schedule`):** Standalone `PublicSchedulePage`, truly anonymous network requests (`omitAuth: true`, `skipAuthRefresh: true`), sanitized availability (`AVAILABLE` → `متاح`, `UNAVAILABLE` → `غير متاح`), zero private customer data, and **zero coupling with Dexie or offline sync**. Detailed in [`docs/public-schedule-architecture.md`](docs/public-schedule-architecture.md).
  - **Staff / Owner (`/schedule`):** Protected workspace, FE-038 dual-fetch lifecycle (cache-first != cache-only), operational slot states, Dexie persistence, and full mutations. Detailed in [`docs/schedule-architecture.md`](docs/schedule-architecture.md).
### 5. Backend is the Security Authority
- Role authorization, court access, and pricing rules are enforced by the server.
- The frontend adapts UI visibility based on `currentUser.profile_role` (`ADMIN`, `OWNER`, `STAFF`) and accessible clubs/courts, but never invents security policies.
- Before changing API, identity, finance, booking, or offline behavior, inspect the sibling backend at `../sloty-backend`. Follow [`.cursor/rules/backend-contract-awareness.mdc`](.cursor/rules/backend-contract-awareness.mdc).
- Never modify `../sloty-backend` from this repository. Backend changes require a separate backend task.
- Backend inspection order: tests → serializers → ViewSets/API views → URL routing → domain docs → OpenAPI. Runtime behavior, serializers, and tests are the final contract; OpenAPI may be incomplete or outdated.
- Never invent endpoints, assume `User.id == Profile.id`, or treat paginated list responses as raw arrays. Respect backend nullability. Prefer minimal V1-safe changes; do not introduce new patterns, libraries, or architecture migrations unless explicitly requested.
- V1 critical-flow hardening: `/` and protected routes must show `sessionError` with retry/logout when tokens remain but session hydration failed. Online booking create must reuse `client_request_id` for the same payload retry. Historical settlement detail is read-only; there is no `mark-settled` action.

### 6. Offline Operational Mutation Boundary
- **Allowed Offline:** Saving a local **Booking Request** (`BookingRequestRecord`) from an available cached `FREE` slot (`PENDING_SYNC`).
- **Forbidden Offline:** Booking creation, payments, transaction cancels, settlements, booking cancellations, completions, no-shows, reschedules, and recurrence stops **require active internet** and must never be queued. Detailed in [`docs/offline-architecture.md`](docs/offline-architecture.md).
### 6. Offline Boundary
- **Offline is Read-Only for Operational Actions:** Cached data in Dexie (`sloty_local_db` v3) is viewable offline.
- Operational mutations (booking creation, holds, payments, cancellations, completions, no-shows, reschedules, settlements) require active server connectivity and are blocked when offline.
- Detailed in [`docs/offline.md`](docs/offline.md).

### 7. One SEO System
- Route SEO is declared on the route (`handle: routeSeo(...)` in `src/app/router.tsx`) and applied only by `SeoRouteBoundary` (`src/core/seo`). Never set `document.title` or head tags from pages or components.
- Routes without `handle.seo` are `noindex, nofollow` by default. Only real public pages registered in `indexablePublicPages` are indexable and listed in the generated sitemap (currently `/` and `/about/`).
- The primary SEO entity is Sloty / سلوتي and the primary SEO surface is public player discovery at `/`: identity, then `ملاعب كرة القدم`, then real Courts from `GET public/courts/` linking to the existing Public Schedule. Court pages are downstream destinations (noindex), never a programmatic SEO strategy. Never ship sample or fallback Courts; fixtures belong in tests only.
- `/` is shared: signed-out visitors in a browser tab see public discovery; signed-in users, session errors, and installed-PWA launches keep `AuthLandingRedirect`.
- The canonical origin comes only from `VITE_PUBLIC_SITE_URL`, never from `window.location`. `robots.txt` and `sitemap.xml` are generated at build time; do not add them to `public/`.
- No `<meta name="keywords">`, hidden text, fake city/Club/Court pages, or invented structured data (addresses, phones, ratings, prices, `LocalBusiness` for Sloty). Detailed in [`docs/seo.md`](docs/seo.md).

---

## 4. Codebase Structure & Responsibilities
## 4. Codebase Structure

```text
src/
├── app/          # Root application setup, React Router config, providers
├── core/         # Cross-feature infrastructure: auth context, API client, route guards
├── layout/       # Authenticated shell (AppShell), PageHeader, sidebar, drawer
├── shared/       # Domain-agnostic reusable UI primitives, hooks, helpers, and copy
├── features/     # Domain product modules (pages, components, feature API wrappers)
│   ├── schedule/       # Operational Schedule workspace (/schedule)
│   ├── publicSchedule/ # Guest Public Schedule (/public/.../schedule)
│   ├── publicSite/     # Public SEO pages (/ discovery for signed-out visitors, /about/)
│   ├── publicDiscovery/ # Public Court discovery API, mapper, hook, Court cards
│   ├── bookings/       # Bookings list, BookingActionSheet, lifecycle dialogs
│   ├── transactions/   # Transactions ledger, RecordPaymentSheet, cancel payment
│   ├── settlements/    # Settlement review, confirmation, employee custody
│   ├── dashboard/      # Analytics dashboard (/dashboard)
│   ├── courts/         # Court settings, weekly working-hours editor
│   ├── clubs/          # Club onboarding, settings, location helpers
│   ├── settings/       # Settings hub, users & permissions management
│   ├── audit/          # Read-only business audit logs
│   └── reports/        # Court usage reports
├── offline/      # Dexie sloty_local_db, sync coordinator, adapters, requests
├── core/         # Infrastructure: auth context, API client, route guards
├── layout/       # Authenticated shell (AppShell), PageHeader, navigation
├── shared/       # Domain-agnostic reusable primitives, hooks, helpers, copy
├── features/     # Product modules (schedule, bookings, transactions, settlements, etc.)
├── offline/      # Dexie sloty_local_db, sync coordinator, adapters
└── pwa/          # Service Worker registration, install prompts, update dialogs

scripts/          # Production deploy + release helpers (CI/CD)
tests/deploy/     # Workflow and deploy-script contract tests
```

---

## 5. Cross-Cutting Engineering Conventions
## 5. Verification Commands

### Auth & Permissions
- Authentication context is accessed exclusively via `useAuth()`. Never decode JWTs in components.
- Post-login user context is hydrated from `/api/v1/me/`. Club-scoped access depends on the active `selectedMembership`.
- Permissions default to false and are enforced per selected club membership: `can_change_pricing`, `can_manage_working_hours`, `can_manage_settlements`. Backend remains the security authority.
- **Booking player identity:** Player search results are suggestions in backend order. Suggestions are loaded only for the entered phone; typing a customer name does not run a global name search and does not reject an unknown name. A phone lookup must not overwrite entered `customer_name`. Booking create and booking edit send the final entered `customer_name` and `customer_phone`, without a frontend-selected `club_player_id` or `player_profile_id`. The backend owns identity matching and player/name history.
- **Booking slot interaction:** Schedule slots returned by the backend remain rendered and interactive regardless of their calendar date. FREE slots use only the backend `is_available` field; backend booking statuses determine occupied-slot interaction. Do not add local date or `start_time > now` gates before opening a slot or sending a booking mutation.
- **Booking date validity:** Do not block create, update, or reschedule because a date is past, today, future, or different from the browser clock. Send the selected `start_time` / `end_time` and show backend codes (`BOOKING_OUTSIDE_WORKING_HOURS`, `BOOKING_SLOT_UNAVAILABLE`, `VALIDATION_ERROR`). Slot board display still follows backend `is_available` for FREE slots.
- **Weekday contract:** Court working-hours and audit weekday values are Saturday-first (`0` = Saturday through `6` = Friday); browser date conversion must explicitly convert JavaScript's Sunday-first index.
Run targeted validation commands before reporting completion:
- **TypeScript:** `npx tsc -b --noEmit`
- **Linting:** `npm run lint`
- **Tests:** `npm test`
- **Production Build:** `npm run build`

### API Client (`src/core/api/apiClient.ts`)
- All endpoints are centralized in `src/shared/api/apiEndpoints.ts`. Never hardcode API URL strings in feature code.
- `apiRequest()` automatically sends `Accept-Language: ar` and attaches the Bearer token unless `omitAuth: true` is passed. JSON bodies get `Content-Type: application/json`; `FormData` bodies pass through untouched (never set a multipart `Content-Type` manually — the browser owns the boundary).
- Token refresh runs once on 401s; concurrent requests share the in-flight refresh. Login and refresh paths never trigger refresh.
- Admin shell diagnostics use `GET /api/system/version/` (`apiEndpoints.systemVersion`) once per session via `src/core/system/`. FE release/commit come only from `src/core/config/buildInfo.ts` (`VITE_APP_RELEASE`, `VITE_COMMIT_SHA`) — never hardcode production versions in UI. ADMIN burger and desktop sidebar reuse `AdminBuildInfoFooter` below logout.

### Production CI/CD
- Workflow: [`.github/workflows/frontend-ci-cd.yml`](.github/workflows/frontend-ci-cd.yml). PR/push to `dev` and PR to `master` run Test only. Production jobs (`prepare-release`, `deploy`, `release`) run only when `github.event_name == push` and `github.ref == refs/heads/master`.
- Canonical executable is [`scripts/deploy-sloty-frontend`](scripts/deploy-sloty-frontend). Production CI runs `sudo /srv/sloty/frontend/scripts/deploy-sloty-frontend <SHA> <TAG>`. Never install a `/usr/local/sbin` copy.
- The deploy script discovers the git root from its own path, then copies itself plus [`scripts/lib/frontend-release.sh`](scripts/lib/frontend-release.sh) into `/tmp` and re-execs that snapshot before `git checkout --detach`.
- Node version authority is [`.nvmrc`](.nvmrc). CI and production deploy must use `npm ci` from `package-lock.json`, never `npm install`.
- Frontend GitHub Releases are independent of Backend. Tags `vMAJOR.MINOR.PATCH` are calculated once in [`scripts/lib/frontend-release.sh`](scripts/lib/frontend-release.sh); `package.json` `version` is not the authority. Same SHA reuses the existing tag; a tag on a different SHA is a hard failure.
- Production builds inject `VITE_APP_RELEASE` and `VITE_COMMIT_SHA`. Vite already consumes `.env.production` for `VITE_API_BASE_URL` through [`src/shared/config/api.ts`](src/shared/config/api.ts).
- Publish the complete `dist/` tree to `/var/www/sloty/frontend` with `rsync -a --delete`. Do not start a Node server, restart Nginx, or touch Backend.
- Durable contract: [`docs/frontend-ci-cd.md`](docs/frontend-ci-cd.md).

### Coding Style & Refactoring
- **Refactor in Place:** Do not introduce parallel `V2`, `New`, or wizard variants for existing pages, sheets, or flows.
- **Educational Comments & JSDoc:** Add clear JSDoc explanations to services, hooks, reusable components, and API modules. Avoid noisy comments that restate obvious syntax.
- **Strict Typing:** Always define explicit interfaces and avoid `any`.
- **Phone numbers:** All phone fields use `SlotyPhoneNumberInput` plus `validatePhoneNumber()` in `src/shared/validation/phone.ts`. Localized validation copy comes from `getPhoneValidationMessage()` / `phoneValidationCopy`. Do not add page-specific phone regexes or hardcoded Arabic/English phone errors. Backend field errors still flow through the existing API error helpers.
- **Court-management Club phone:** The Admin Court form loads its parent through `getClub(clubSlug)`. `phone_number` is Club-owned: validate it locally and PATCH only the Club when it changed; never add it to `Court`, `CourtPayload`, or a Court save request.
- **Settlements identity:** `unsettled-summary` rows use `user` / `user_name`. Preview and create keep Backend `collected_by` / `collected_by_name`. Collector UI copy is `المحصل`.

---

## 6. Subsystem Architecture Map

| Subsystem | Scoped Guide | Technical Specification |
| :--- | :--- | :--- |
| **Offline Storage** | [`src/offline/AGENTS.md`](src/offline/AGENTS.md) | [`docs/offline-architecture.md`](docs/offline-architecture.md) |
| **Booking Requests & Sync** | [`src/offline/AGENTS.md`](src/offline/AGENTS.md) | [`docs/booking-request-lifecycle.md`](docs/booking-request-lifecycle.md) |
| **Operational Schedule** | [`src/features/schedule/AGENTS.md`](src/features/schedule/AGENTS.md) | [`docs/schedule-architecture.md`](docs/schedule-architecture.md) |
| **Guest Public Schedule** | [`src/features/publicSchedule/AGENTS.md`](src/features/publicSchedule/AGENTS.md) | [`docs/public-schedule-architecture.md`](docs/public-schedule-architecture.md) |
| **Product UX & Layout** | — | [`docs/product-ux-pattern.md`](docs/product-ux-pattern.md) |
| **Interaction Patterns** | — | [`docs/interaction-patterns.md`](docs/interaction-patterns.md) |
| **Arabic Copy Standards** | — | [`docs/product-copy.md`](docs/product-copy.md) |
| **UI Design System** | — | [`docs/ui-reference.md`](docs/ui-reference.md) |
| **Production CI/CD** | — | [`docs/frontend-ci-cd.md`](docs/frontend-ci-cd.md) |
| **SEO & Public Site** | — | [`docs/seo.md`](docs/seo.md) |

---

## 7. Change Review Protocol

After every engineering change:
1. Verify that **no backend files** were modified.
2. Verify that **no destructive git commands** were run.
3. Review whether the corresponding scoped `AGENTS.md` or durable architecture document requires an update to stay synchronized with code reality.
For detailed domain rules, UI specifications, and feature guides, consult [`docs/index.md`](docs/index.md).
