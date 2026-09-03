# Offline Storage Architecture

`src/offline` owns Sloty's versioned IndexedDB foundation. The Service Worker
owns only the static application shell; structured operational snapshots belong
here.

- Every sensitive row carries a deterministic `user + Club` scope. Schedule
  reads additionally require an explicit Court and date.
- The current schema is version 2. Future table/index changes must increment the
  Dexie version and add an explicit migration when stored data needs reshaping.
- Snapshot replacement deletes and writes inside one Dexie transaction. A
  failed write therefore preserves the previous completed snapshot.
- Schedule synchronization stores today + the next 30 Egypt-local days. It
  partitions backend slots by authoritative `slot.date` and writes one row per
  date, including empty synchronized days with optional backend messages.
- `replaceScheduleWindow()` is atomic per scope + Court + requested window.
  Manager/Owner/selected-Club Platform Admin sync the currently viewed Court
  first, then other authorized active Courts. Staff syncs only the assigned
  Court.
- `offline_context` is only the last Backend-verified scope hint. It never
  authenticates a user and stores no tokens, password, PIN, or calculated
  permissions.
- Explicit logout clears every operational scope owned by that user before the
  auth session is released. Session expiry does not delete useful local cache.
- Synchronization is coordinated by `src/offline/sync`. Schedule always runs
  first, BookingIntent recheck runs from the successfully refreshed Schedule
  rows, then Bookings and Transactions run after Schedule settles, then Current
  Custody runs from the Backend custody read model. Duplicate startup, online,
  resume, retry, and manual triggers for the same scope coalesce while work is
  active.
- Booking synchronization stores the previous 7 Egypt-local calendar days for
  the current `user + Club` scope. It fetches every paginated server page before
  one atomic `bookings` replacement and updates `bookings_last_sync_at` only
  after that commit.
- Transaction synchronization stores the previous 7 Egypt-local calendar days
  for the current `user + Club` scope. It fetches every paginated server page
  before one atomic `transactions` replacement and updates
  `transactions_last_sync_at` only after that commit. Staff sync uses the
  assigned Court from verified auth context and does not add a frontend
  `created_by=currentUser` filter.
- Booking History uses server search, filters, and pagination online. Offline it
  reads the complete bounded snapshot locally, supports safe cached-field
  filtering/search, and treats backend-derived operational filters as
  internet-required instead of recalculating them.
- Booking detail cache is lazy. Successful online authoritative detail loads may
  write `booking_details`; the canonical list sync does not N+1 prefetch all
  details.
- Transactions use the server filters and pagination online. Offline they read
  the complete bounded snapshot locally, support payment-reference search,
  cached-field filters, and local sort. Transaction detail cache is lazy:
  successful online `getTransaction()` responses may write
  `transaction_details`; the canonical list sync does not N+1 prefetch all
  details.
- Offline Transaction data is read-only. Payment creation, cancellation,
  refunds, settlements, and every financial mutation require internet and are
  not queued.
- Current Custody snapshots are read-only Backend responses. Staff/restricted
  views store settlement preview payloads; Owner/authorized Manager views store
  one grouped `unsettled-summary` payload. The cache key includes user + Club,
  snapshot kind, collector scope, and Court scope, so all-courts and one-Court
  custody do not overwrite each other.
- Offline Current Custody renders cached Backend `net_amount`,
  `transaction_count`, and payment-method breakdowns exactly. It never reads the
  seven-day Transaction cache to reconstruct current money, because older
  unsettled payments can be outside that cache. A failed snapshot write keeps
  the previous successful custody snapshot and `current_custody_last_sync_at`.
- No cached custody snapshot means internet-required/error copy. It must not be
  displayed as zero custody.
- BookingIntents are the sole offline operational write. They store a local
  customer request for a one-time slot and start as `PENDING_RECHECK`. They are
  not Backend Bookings, holds, reservations, or automatic retries.
- BookingIntent recheck must use stable slot identity (`court_id`, date, start,
  end) and the latest successfully persisted Backend Schedule row. Fresh FREE
  and `is_available` slots become `READY_TO_BOOK`, occupied/missing slots in a
  fresh row become `CONFLICT`, and passed appointment times become `EXPIRED`.
- `READY_TO_BOOK` still requires a manual `احجز الآن` action through the
  existing Booking API. Final Backend slot conflicts keep the customer data and
  move the intent back to `CONFLICT`; no background auto-booking or mutation
  replay is allowed.
- `BOOKED` and `DISMISSED` intents are hidden from the active operational queue.
  Current MVP retention keeps those scoped local rows until explicit
  logout/user cleanup. Do not add a history surface or automatic purge without
  a reviewed product/security policy.
- Alternative slots may be ranked from already refreshed Backend FREE slots for
  presentation only. The frontend must not generate availability, calculate
  price, or calculate recurrence.
- Connectivity lives under `src/offline/connectivity`. Browser online/offline
  state is only a hint; Backend reachability comes from real dataset outcomes.
- Future synchronization must keep bounded windows (Schedule 31 days, Bookings
  7 days, Transactions 7 days) rather than assuming unlimited device storage.

Schedule, recent Booking History, recent Transactions, and Current Custody use
these repositories for read-only offline rendering. BookingIntent is the only
offline write; all money and Booking lifecycle mutations remain online-only.
