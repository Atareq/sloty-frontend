# Offline Subsystem Agent Guide (`src/offline/`)

This document governs local persistence, freshness evaluation, and background synchronization in `src/offline/**`.
For PWA infrastructure under `src/pwa/**`, consult root [`AGENTS.md`](../../AGENTS.md), [`docs/offline-architecture.md`](../../docs/offline-architecture.md), and [`src/pwa/README.md`](../../src/pwa/README.md).

---

## 1. Subsystem Responsibilities

- **`src/offline/`:** Owns the Dexie-backed `sloty_local_db` versioned database, scope isolation keys, freshness evaluation, dataset sync adapters, and automated Booking Request synchronization.

---

## 2. Storage & Database Rules (`sloty_local_db`)

1. **Explicit Versioning:** Current schema version is **3**. Any schema, index, or store modification must increment the version number and supply an explicit Dexie migration.
2. **Deterministic Scoping:** Every sensitive table row must carry `scope_key` produced by `createOfflineScopeKey(userId, clubSlug)`. Never construct raw scope strings or allow unscoped reads.
3. **Atomic Snapshot Replacement:** Dataset synchronization must execute deletions and insertions within a **single Dexie transaction**. A failed transaction preserves the previous snapshot and does not advance the dataset's `_last_sync_at` timestamp.
4. **No Sensitive Auth Persistence:** `offline_context` persists only verified `/me` identity hints (user ID, club slug, assigned court, display name). It **must never** store JWT access/refresh tokens, passwords, PINs, or calculated frontend permissions.
5. **Non-Fatal Error Handling:** IndexedDB failures must log generic error codes without exposing customer names, phone numbers, money amounts, or auth credentials. Transient errors must **never** trigger database deletion or recreation.

---

## 3. Synchronization Coordinator Rules (`src/offline/sync/`)

1. **Centralized Mount:** Synchronization is coordinated by `OfflineSyncCoordinator` and mounted **once** via `OfflineSyncProvider` in `AppShell`. Feature pages (`SchedulePage`, `BookingsPage`, `TransactionsPage`) must **never** attach their own `online`, `offline`, or `visibilitychange` sync listeners.
2. **Fixed Business Priority:**
   1. **Booking Requests Sync (`bookingRequestSync.ts`):** Processes eligible `PENDING_SYNC` and stale `SYNCING` requests first.
   2. **Schedule Window Sync (`scheduleSync.ts`):** Refreshes the 31-day bounded slots window.
   3. **Secondary Datasets:** Bookings (`bookingSync.ts`) and Transactions (`transactionSync.ts`) sync in parallel for the previous 7 days.
   4. **Current Custody Sync (`custodySync.ts`):** Pulls fresh backend custody snapshot.
3. **Single-Flight Coalescing:** Sync tasks coalesce by `scope_key` and `scope_key + dataset`. Concurrent triggers (startup, online, resume, manual) share the running task.
4. **Scope Cancellation:** When `scope_key` changes (user switches clubs or logs out), previous in-flight sync work is aborted. Late responses for an abandoned scope are discarded.
5. **Conservative Retry:** If a sync run fails, one delayed retry is scheduled. The coordinator then waits for user actions or lifecycle events (visibility resume, online event, manual trigger). Continuous polling loops are forbidden.

---

## 4. Freshness Policy Rules (`src/offline/freshness/`)

1. **Centralized Authority:** All freshness calculations must use `getOfflineFreshness(lastSyncAt, now)`. Never write inline timestamp math in components.
2. **Thresholds:**
   - **< 12 hours:** `FRESH`. Normal offline experience.
   - **12 to 72 hours:** `STALE`. Renders informational stale warning banner; offline reads and new Booking Request creation remain available.
   - **> 72 hours:** `EXPIRED`. Preserves cached data and existing requests for review; disables **new** offline Booking Request creation until online sync succeeds.
3. **Invariants:** The 72-hour rule **never** blocks online booking creation and **never** expires or purges existing local requests whose appointment time has passed.

---

## 5. Offline Booking Requests (`src/offline/bookings/`)

1. **Customer Intent Only:** Booking Requests are local customer intent saved when offline (`PENDING_SYNC`). They are **not** Backend Bookings.
2. **Canonical Normal Synchronization Lifecycle:**
   ```text
   PENDING_SYNC
         ↓
   SYNCING
         │
         ├── authoritative success
         │     → BOOKED
         │
         ├── business rejection
         │     → NEEDS_REVIEW
         │
         └── technical failure
               → PENDING_SYNC
               using the SAME client_request_id
   ```
3. **Resolution & Compatibility States:**
   - `DISMISSED`: Terminal user/review resolution state where currently supported.
   - `EXPIRED`: Retained only for legacy/backward compatibility or a future explicitly approved lifecycle reason. Appointment time passing alone must **not** produce `EXPIRED`.
4. **Stable Idempotency Key:** `client_request_id` UUID is generated once at creation. Technical retries **must** reuse the same UUID. Editing customer details, choosing another slot, or converting recurrence generates a **new** UUID.
5. **Traceability:** When dismissing a request linked to a backend `BookingAttempt`, invoke the backend attempt dismissal endpoint.

---

## 6. Offline Mutation Boundary

```text
ALLOWED OFFLINE:
✓ Saving a Booking Request from an available cached FREE slot (PENDING_SYNC)

FORBIDDEN OFFLINE:
✗ Booking creation API call
✗ Payment recording (RecordPaymentSheet)
✗ Transaction cancellation
✗ Settlement creation or confirmation
✗ Booking cancellation, completion, no-show, reschedule, recurrence-stop
```

Detailed technical specification: [`docs/offline-architecture.md`](../../docs/offline-architecture.md).
Lifecycle specification: [`docs/booking-request-lifecycle.md`](../../docs/booking-request-lifecycle.md).
