# Sloty Frontend

Sloty is a React frontend for an Arabic-first, RTL-first, mobile-first sports court management product.

This repository is frontend-only. Do not add backend, Django, database, serializer, model, migration, or API implementation changes here.

## Source of truth

1. Current approved local implementation
2. [`AGENTS.md`](./AGENTS.md) engineering guardrails
3. Durable product docs under [`docs/`](./docs/): `product-ux-pattern.md`, `product-copy.md`, `interaction-patterns.md`, `ui-reference.md`, `frontend-current-state.md`, `ux-known-gaps.md`
4. Frontend API wrappers and types under `src/`

`docs/business-analysis.txt`, `docs/documentation.txt`, and `docs/sprints.txt` are historical planning documents. Do not treat them as current frontend architecture.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- ESLint
- Vitest
- Testing Library
- npm

## Commands

```bash
nvm use
npm install
npm run dev
npm run build
npm run lint
npm test
```

For watch-mode tests:

```bash
npm run test:watch
```

## Folder ownership

- `src/app` — router and application composition
- `src/core` — auth, API client, route guards
- `src/layout` — authenticated shell
- `src/pwa` — manifest policy, service-worker lifecycle, install UX, and safe update prompts
- `src/offline` — scoped IndexedDB schema, repositories, cleanup, and verified operational context
- `src/shared` — reusable primitives, copy, navigation, helpers
- `src/features` — domain product screens and API wrappers

## PWA foundation

Production builds generate an installable standalone PWA with a static app-shell Service Worker. The manifest launches at `/`, allowing the existing role-aware auth redirect to choose `/login`, `/schedule`, `/select-club`, `/no-club-access`, or Platform Admin routes safely.

The Service Worker precaches compiled JS/CSS/HTML, approved static UI images, and PWA icons. It intentionally defines no runtime cache for authenticated APIs or business responses.

Chromium uses the browser install prompt when available. iOS Safari shows Add-to-Home-Screen instructions. New application versions wait for explicit `تحديث الآن`; discovery never causes an automatic reload.

After `npm run build`, inspect `dist/manifest.webmanifest`, `dist/sw.js`, the emitted Workbox runtime, and copied icons. Browser/device installability and offline launch still require manual QA through a production preview.

## Offline storage foundation

Dexie owns the versioned `sloty_local_db` IndexedDB database. Its stores prepare scoped snapshots for Schedule, Bookings, Booking details, Transactions, Transaction details, Current Custody, Booking Intents, independent sync metadata, and the minimal last Backend-verified operational context. Every sensitive row belongs to a deterministic `user + Club` scope; Schedule and BookingIntent reads also require a Court.

Schedule now reads its scoped Court/date cache first for the bounded window of today + the next 30 Egypt-local days. Cached rows store backend-generated slot objects plus an optional backend message and `synced_at`; an empty cached row is a valid synchronized day, not missing data.

Booking History has read-only offline resilience for the previous 7 Egypt-local calendar days. The canonical cache is populated by background sync from the complete unfiltered paginated period; current online search/filter/page results never replace it. Offline search is local over cached customer name and phone, safe filters use cached fields only, and Booking details can use lazily cached authoritative `getBooking()` responses when available.

Transactions have read-only offline resilience for the previous 7 Egypt-local calendar days. The canonical cache is populated by background sync from the complete unfiltered paginated period; current online filtered pages never replace it. Online `/transactions` remains backend-backed for the existing filters and pagination. Offline mode searches cached payment references locally, filters/sorts only the bounded cached dataset, opens cached details read-only, and never queues or sends money mutations.

Current Custody has read-only offline resilience from the last successful Backend custody response. Staff/restricted views store settlement preview snapshots; Owner/authorized Manager views store the grouped `unsettled-summary` response in one snapshot. Offline finance UI displays the cached `net_amount`, `transaction_count`, and payment-method breakdown exactly as returned by the Backend, never by reducing the seven-day Transaction cache.

BookingIntent is the only offline operational write. From a cached FREE Schedule slot, the existing booking sheet switches to `احفظ طلب الحجز`, stores the customer request locally as `PENDING_RECHECK`, and never calls the Booking API or shows Booking success while offline. After reconnect, Schedule sync runs first; intents are classified from the freshly persisted backend slot snapshots as `READY_TO_BOOK`, `CONFLICT`, or `EXPIRED`. Final booking remains manual through the existing `createBooking()` API, and conflict/alternative-slot recovery preserves the customer data.

Resolved (`BOOKED`) and dismissed BookingIntents are hidden from the active operational queue. They remain scoped local records until explicit logout/user cleanup in the current MVP; any separate retention purge or history screen needs a product/security decision.

Full snapshot replacement and its dataset timestamp commit atomically. Explicit logout waits for pending context writes, clears every local operational scope owned by that user, then clears tokens and the selected Club. Session expiry does not delete local snapshots. The minimal context stores no password, PIN, token, refresh credential, or frontend-calculated permission and cannot authenticate or route a user.

## Offline synchronization foundation

Task 3 adds a lightweight connectivity and synchronization coordinator under `src/offline`. The authenticated shell mounts one `OfflineSyncProvider`; pages must not independently attach business-data online/offline/resume listeners.

Synchronization priority is fixed: Schedule first, BookingIntent recheck from successfully refreshed Schedule rows second, then Bookings and Transactions together after Schedule settles, then Current Custody. Startup, reconnect, resume, retry, and manual triggers coalesce through single-flight guards for the same `scope_key` and dataset. `navigator.onLine` is treated only as a browser hint; Backend reachability comes from real dataset request results.

The Schedule adapter performs authoritative range sync using the backend slots endpoint with `date_from`/`date_to`, partitions slots by backend `slot.date`, and atomically replaces each Court's 31-day window. Staff syncs only the assigned Court; Owner/Manager/selected-Club Platform Admin sync authorized active Courts with the currently viewed Court first.

The Booking adapter runs only after Schedule settles. It fetches the complete previous-seven-calendar-day Booking period page by page, then atomically replaces the scoped Booking snapshot and advances `bookings_last_sync_at` only after commit.

The Transaction adapter runs in the same secondary phase as Bookings. It fetches the complete previous-seven-calendar-day Transaction period page by page, then atomically replaces the scoped Transaction snapshot and advances `transactions_last_sync_at` only after commit. Staff synchronization uses the assigned Court from `/me` and does not add a frontend-created `created_by` scope. Financial writes, refunds, transaction cancellation, and settlement actions remain online-only.

The Current Custody adapter runs after the read-only operational datasets and persists one Backend current-custody snapshot for the active scope. A failed fetch or failed IndexedDB write preserves the last successful custody snapshot and timestamp; no offline code reconstructs custody from cached Transaction rows.

## Notes

- Keep UI Arabic-first, RTL-first, and mobile-first.
- Do not invent API contracts or production backend URLs in this frontend.
- `references/v0-prototype/` is a gitignored visual reference, not production code.
