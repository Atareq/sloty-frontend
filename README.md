# Sloty Frontend

Sloty is a React frontend for an Arabic-first, RTL-first, mobile-first sports court management product.
Sloty is a React-based frontend for a sports court management system, starting with football courts in Egypt. It is built as an **Arabic-first, RTL-first, mobile-first** Progressive Web Application (PWA).

This repository is frontend-only. Do not add backend, Django, database, serializer, model, migration, or API implementation changes here.
This repository contains frontend code only. Zero backend or Django code lives here.

## Source of truth
---

1. Current approved local implementation
2. [`AGENTS.md`](./AGENTS.md) engineering guardrails
3. Durable product docs under [`docs/`](./docs/): `product-ux-pattern.md`, `product-copy.md`, `interaction-patterns.md`, `ui-reference.md`, `frontend-current-state.md`, `ux-known-gaps.md`
4. Frontend API wrappers and types under `src/`
## Tech Stack

`docs/business-analysis.txt`, `docs/documentation.txt`, and `docs/sprints.txt` are historical planning documents. Do not treat them as current frontend architecture.
- **Framework:** React 19 + TypeScript (strict mode)
- **Bundler & Build Tool:** Vite
- **Styling:** Tailwind CSS (Arabic/RTL-first)
- **Routing:** React Router 8
- **State & Storage:** Dexie (IndexedDB `sloty_local_db` version 3) + `vite-plugin-pwa`
- **Testing:** Vitest + Testing Library
- **Linting & Formatting:** ESLint + Prettier

## Stack
---

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- ESLint
- Vitest
- Testing Library
## Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm

## Commands

### Installation & Development
```bash
nvm use
# Install dependencies
npm install

# Start local dev server
npm run dev
npm run build

# Run TypeScript check
npx tsc -b --noEmit

# Run linter
npm run lint

# Run tests
npm test
```

For watch-mode tests:
# Run tests in watch mode
npm run test:watch

```bash
npm run test:watch
# Build for production
npm run build
```

## Folder ownership
---

- `src/app` — router and application composition
- `src/core` — auth, API client, route guards
- `src/layout` — authenticated shell
- `src/pwa` — manifest policy, service-worker lifecycle, install UX, and safe update prompts
- `src/offline` — scoped IndexedDB schema, repositories, cleanup, and verified operational context
- `src/shared` — reusable primitives, copy, navigation, helpers
- `src/features` — domain product screens and API wrappers
## Directory Structure

## PWA foundation
```text
src/
├── app/          # App setup, React Router configuration, root providers
├── core/         # Cross-feature infrastructure: auth context, API client, route guards
├── layout/       # Authenticated AppShell, PageHeader, navigation
├── shared/       # Domain-agnostic reusable UI primitives, hooks, helpers, copy
├── features/     # Product feature modules (pages, components, feature API wrappers)
│   ├── schedule/       # Operational Schedule workspace (/schedule)
│   ├── publicSchedule/ # Guest Public Schedule (/public/.../schedule)
│   ├── publicSite/     # Public SEO pages (/ discovery for signed-out visitors, /about/)
│   ├── publicDiscovery/ # Public Court discovery API, mapper, hook, Court cards
│   ├── bookings/       # Bookings list, action sheets, details
│   ├── transactions/   # Financial transactions ledger, payments
│   ├── settlements/    # Employee custody & cash settlement hub
│   ├── courts/         # Court settings, weekly working hours editor
│   ├── clubs/          # Club onboarding, settings
│   ├── dashboard/      # Operational metrics dashboard
│   ├── reports/        # Court usage reports
│   └── audit/          # Read-only audit log
├── offline/      # Dexie database (sloty_local_db), sync coordinator, adapters
└── pwa/          # Service Worker registration, PWA update prompt
```

Production builds generate an installable standalone PWA with a static app-shell Service Worker. The manifest launches at `/`, allowing the existing role-aware auth redirect to choose `/login`, `/schedule`, `/select-club`, `/no-club-access`, or Platform Admin routes safely. In a normal browser tab, signed-out visitors at `/` see public player discovery (Sloty identity and real Courts) instead (see [`docs/seo.md`](./docs/seo.md)).

`npm run build` also prerenders the public pages (`dist/index.html`, `dist/about/index.html`) and generates `dist/robots.txt` and `dist/sitemap.xml`. It requires `VITE_PUBLIC_SITE_URL` (set in `.env.production`).
---

The Service Worker precaches compiled JS/CSS/HTML, approved static UI images, and PWA icons. It intentionally defines no runtime cache for authenticated APIs or business responses.
## Documentation & AI Guides

Chromium uses the browser install prompt when available. iOS Safari shows Add-to-Home-Screen instructions. New application versions wait for explicit `تحديث الآن`; discovery never causes an automatic reload.

After `npm run build`, inspect `dist/manifest.webmanifest`, `dist/sw.js`, the emitted Workbox runtime, and copied icons. Browser/device installability and offline launch still require manual QA through a production preview.

## Offline storage foundation

Dexie owns the versioned `sloty_local_db` IndexedDB database. Its stores prepare scoped snapshots for Schedule, Bookings, Booking details, Transactions, Transaction details, Current Custody, Booking Intents, independent sync metadata, and the minimal last Backend-verified operational context. Every sensitive row belongs to a deterministic `user + Club` scope; Schedule and BookingIntent reads also require a Court.

Schedule now reads its scoped Court/date cache first for the bounded window of today + the next 30 Egypt-local days. Cached rows store backend-generated slot objects plus an optional backend message and `synced_at`; an empty cached row is a valid synchronized day, not missing data.

Booking History has read-only offline resilience for the previous 7 Egypt-local calendar days. The canonical cache is populated by background sync from the complete unfiltered paginated period; current online search/filter/page results never replace it. Offline search is local over cached customer name and phone, safe filters use cached fields only, and Booking details can use lazily cached authoritative `getBooking()` responses when available.

Transactions have read-only offline resilience for the previous 7 Egypt-local calendar days. The canonical cache is populated by background sync from the complete unfiltered paginated period; current online filtered pages never replace it. Online `/transactions` remains backend-backed for the existing filters and pagination. Offline mode searches cached payment references locally, filters/sorts only the bounded cached dataset, opens cached details read-only, and never queues or sends money mutations.

Current Custody has read-only offline resilience from the last successful Backend custody response. Staff/restricted views store settlement preview snapshots; Owner/authorized Manager views store the grouped `unsettled-summary` response in one snapshot. Offline finance UI displays the cached `net_amount`, `transaction_count`, and payment-method breakdown exactly as returned by the Backend, never by reducing the seven-day Transaction cache.

Booking Requests are the only offline operational write. From a cached FREE Schedule slot, the existing booking sheet switches to `احفظ طلب الحجز`, stores the customer request locally as `PENDING_SYNC`, and never calls the Booking API or shows Booking success while offline. After authenticated reconnect/startup/resume, the central coordinator processes eligible Booking Requests first through the specialized request sync processor, then refreshes Backend-authoritative datasets. Business conflicts move to `NEEDS_REVIEW`; technical failures remain retryable.

Resolved (`BOOKED`) and dismissed Booking Requests are hidden from the active operational queue. They remain scoped local records until explicit logout/user cleanup in the current MVP; any separate retention purge or history screen needs a product/security decision.

Full snapshot replacement and its dataset timestamp commit atomically. Explicit logout waits for pending context writes, clears every local operational scope owned by that user, then clears tokens and the selected Club. Session expiry does not delete local snapshots. The minimal context stores no password, PIN, token, refresh credential, or frontend-calculated permission and cannot authenticate or route a user.

## Offline synchronization foundation

Task 3 adds a lightweight connectivity and synchronization coordinator under `src/offline`. The authenticated shell mounts one `OfflineSyncProvider`; pages must not independently attach business-data online/offline/resume listeners.

Synchronization priority is fixed by business order: Booking Request sync first, then Schedule refresh, then Bookings and Transactions together, then Current Custody. Startup, reconnect, resume, retry, and manual triggers coalesce through single-flight guards for the same `scope_key` and dataset. `navigator.onLine` is treated only as a browser hint; Backend reachability comes from real dataset request results.

The Schedule adapter performs authoritative range sync using the backend slots endpoint with `date_from`/`date_to`, partitions slots by backend `slot.date`, and atomically replaces each Court's 31-day window. Staff syncs only the assigned Court; Owner/Manager/selected-Club Platform Admin sync authorized active Courts with the currently viewed Court first.

The Booking adapter runs only after Booking Request sync and Schedule refresh have completed or failed independently. It fetches the complete previous-seven-calendar-day Booking period page by page, then atomically replaces the scoped Booking snapshot and advances `bookings_last_sync_at` only after commit.

The Transaction adapter runs in the same secondary phase as Bookings. It fetches the complete previous-seven-calendar-day Transaction period page by page, then atomically replaces the scoped Transaction snapshot and advances `transactions_last_sync_at` only after commit. Staff synchronization uses the assigned Court from `/me` and does not add a frontend-created `created_by` scope. Financial writes, refunds, transaction cancellation, and settlement actions remain online-only.

The Current Custody adapter runs after the read-only operational datasets and persists one Backend current-custody snapshot for the active scope. A failed fetch or failed IndexedDB write preserves the last successful custody snapshot and timestamp; no offline code reconstructs custody from cached Transaction rows.

## Notes

- Keep UI Arabic-first, RTL-first, and mobile-first.
- Do not invent API contracts or production backend URLs in this frontend.
- `references/v0-prototype/` is a gitignored visual reference, not production code.
- **AI Coding Guidelines:** [`AGENTS.md`](./AGENTS.md)
- **Documentation Index:** [`docs/index.md`](./docs/index.md)
  - [`docs/architecture.md`](./docs/architecture.md) — Auth session, API client, routing, PWA
  - [`docs/domain-rules.md`](./docs/domain-rules.md) — Business invariants, ledger, custody, working hours
  - [`docs/ui-system.md`](./docs/ui-system.md) — Design system, `KEEP IT UNITED`, tokens, components
  - [`docs/offline.md`](./docs/offline.md) — Dexie schema v3, read-only offline boundary, sync coordinator
  - [`docs/copy.md`](./docs/copy.md) — Canonical Egyptian-Arabic terminology and labels
  - [`docs/features/schedule.md`](./docs/features/schedule.md) — Operational schedule architecture
  - [`docs/features/public-schedule.md`](./docs/features/public-schedule.md) — Public schedule architecture
  - [`docs/frontend-ci-cd.md`](./docs/frontend-ci-cd.md) — Production CI/CD and static publication
  - [`docs/seo.md`](./docs/seo.md) — SEO identity, public indexable routes, prerender, robots/sitemap
