# Offline Architecture & Storage

This document describes the offline storage foundation, synchronization coordinator, and offline interaction boundaries in the Sloty frontend.

---

## 1. Current Offline Operational Boundary

The frontend enforces strict boundaries when offline or when the backend is unreachable:

```text
offline
→ cached/loaded data remains viewable
→ no operational actions/mutations
→ slots are non-clickable
→ Backend becomes authoritative again after reconnect
```

### Invariants:
- **Read-Only Inspection:** Users can inspect cached schedule days, booking history, transactions, and custody snapshots.
- **No Operational Actions:** Creating bookings, recording payments, cancelling payments/transactions, settlements, booking status transitions (cancel, complete, no-show, reschedule), and recurrence changes **require active internet** and are never queued.
- **Non-Clickable Slots:** Slot buttons on the schedule board are disabled when offline (`isOfflineLike`).
- **Server Authority:** The backend is the single source of truth for all business and financial state upon reconnect.

---

## 2. IndexedDB Storage Architecture (`sloty_local_db`)

Local storage is managed via Dexie in [`src/offline/`](../src/offline/).

- **Database Name:** `sloty_local_db`
- **Schema Version:** `3`
- **Deterministic Scoping:** Every sensitive stored record carries `scope_key` derived via `createOfflineScopeKey(userId, clubSlug)`. Cross-club and cross-user data leakage is prevented at the query level.
- **Atomic Dataset Snapshots:** Snapshot replacement executes deletions and insertions within a **single Dexie transaction**. A failed transaction preserves the previous completed snapshot.
- **Bounded Retention Windows:**
  - **Schedule Days (`schedule_days`):** Bounded to **today + 30 Egypt-local days** (31 days total).
  - **Bookings (`bookings`):** Bounded to the **previous 7 Egypt-local calendar days**.
  - **Transactions (`transactions`):** Bounded to the **previous 7 Egypt-local calendar days**.
  - **Current Custody (`current_custody_snapshots`):** Exactly one cached custody snapshot per scope.
  - **Booking Details (`booking_details`) & Transaction Details (`transaction_details`):** Lazily cached upon explicit user navigation.
- **No Sensitive Credential Storage:** `offline_context` stores only verified identity hints (user ID, club slug, assigned court ID, display name). It **never** stores JWT tokens, passwords, PINs, or calculated permissions.

---

## 3. Freshness Policy (`src/offline/freshness/`)

Freshness is evaluated via `getOfflineFreshness(lastSyncAt, now)`:

- **< 12 hours (`FRESH`):** Normal offline experience.
- **12 to 72 hours (`STALE`):** Informational stale warning banner displayed; cached data remains viewable.
- **> 72 hours (`EXPIRED`):** Stale warning banner displayed; cached data remains viewable.
- The 72-hour threshold never blocks online booking creation and never purges existing local records.

---

## 4. Synchronization Coordinator (`src/offline/sync/`)

Background synchronization is coordinated centrally by `OfflineSyncCoordinator` and mounted **once** in `AppShell` via `OfflineSyncProvider`.

### Execution Order & Business Priority
1. **Booking Requests Sync (`bookingRequestSync.ts`):** Processes eligible existing `PENDING_SYNC` and stale `SYNCING` requests.
2. **Schedule Sync (`scheduleSync.ts`):** Fetches the 31-day window for authorized active courts using the backend slots endpoint.
3. **Secondary Datasets:** Bookings (`bookingSync.ts`) and Transactions (`transactionSync.ts`) sync in parallel for the 7-day period.
4. **Current Custody Sync (`custodySync.ts`):** Pulls fresh backend custody snapshot.

### Synchronization Rules
- **Single-Flight Coalescing:** Concurrent triggers (startup, online, resume, manual refresh) for the same `scope_key + dataset` share the in-flight promise.
- **Scope Cancellation:** Switching clubs or logging out immediately aborts in-flight sync tasks and discards late responses.
- **Conservative Retries:** Failed sync schedules one delayed retry; continuous polling loops are forbidden.
- **Connectivity Detection:** `navigator.onLine` is treated as a browser hint only; backend reachability is determined by actual dataset request outcomes.

---

## 5. Existing Stored Booking Requests Lifecycle

Existing pending or review requests stored locally follow this state machine:

```text
PENDING_SYNC
      ↓
   SYNCING
      │
      ├── authoritative success  → BOOKED
      ├── business rejection     → NEEDS_REVIEW (SLOT_UNAVAILABLE, INVALID_CUSTOMER_DATA, RECURRING_UNAVAILABLE)
      └── technical failure      → PENDING_SYNC (preserves same client_request_id)
```

- **`client_request_id`:** Stable idempotency UUID generated once. Reused on technical retries to prevent duplicate bookings.
- **Resolution:**
  - `BOOKED`: Successfully confirmed on backend.
  - `DISMISSED`: Dismissed by user. Dismissing a request linked to a backend `BookingAttempt` dismisses the attempt via the backend API.

