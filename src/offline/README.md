# Offline Storage Architecture

`src/offline` owns Sloty's versioned IndexedDB foundation. The Service Worker
owns only the static application shell; structured operational snapshots belong
here.

- Every sensitive row carries a deterministic `user + Club` scope. Schedule
  reads additionally require an explicit Court and date.
- The current schema is version 3. Future table/index changes must increment the
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
- `sync_metadata.operational_last_sync_at` is the device-local user + Club
  freshness marker. It advances only after a fully successful operational sync
  cycle and is separate from dataset timestamps and Backend
  `ClubMembership.last_sync_at`.
- Offline freshness policy is centralized under `src/offline/freshness`: under
  12 hours is normal, 12 through exactly 72 hours warns without blocking, and
  more than 72 hours disables only new local BookingIntent creation while
  preserving cached data and existing intents.
- Synchronization is coordinated by `src/offline/sync`. Booking Requests run
  first because they can create new Backend truth, then Schedule refreshes,
  Bookings and Transactions run after Schedule, then Current Custody runs from
  the Backend custody read model. Legacy BookingIntent recheck remains as a
  transitional no-mutation adapter after Schedule refresh only. Duplicate
  startup, online, resume, retry, and manual triggers for the same scope
  coalesce while work is active.
- Booking synchronization stores the previous 7 Egypt-local calendar days for
  the current `user + Club` scope after Booking Request processing and Schedule
  refresh. It fetches every paginated server page before one atomic `bookings`
  replacement and updates `bookings_last_sync_at` only after that commit.
- Transaction synchronization stores the previous 7 Egypt-local calendar days
  for the current `user + Club` scope after Booking Request processing and
  Schedule refresh. It fetches every paginated server page before one atomic
  `transactions` replacement and updates `transactions_last_sync_at` only after
  that commit. Staff sync uses the assigned Court from verified auth context and
  does not add a frontend `created_by=currentUser` filter.
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
- Booking Requests are the sole offline operational write. They store local
  customer intent and start as `PENDING_SYNC`. They are not Backend Bookings,
  holds, reservations, confirmations, or proof of availability.
- `BookingRequestRecord` is the canonical persisted type. `BookingIntentRecord`
  remains a temporary compatibility alias, and the physical store remains
  `booking_intents` so schema upgrades do not drop customer requests.
- `local_id` is local IndexedDB/UI identity. `client_request_id` is the stable
  Backend idempotency key for the logical request and is generated once, then
  preserved across retry, response loss, app restart, session expiry, and
  re-authentication.
- `requested_recurring` records what the customer asked for. Do not infer it
  from cached Backend recurrence eligibility, and do not generate `+7 day`
  occurrences locally.
- Booking Request save success appears only after the IndexedDB write resolves.
  A storage/quota/IndexedDB failure keeps the sheet context open where
  practical, shows an error, and must not delete or recreate local storage.
- Offline Booking Request creation may capture a weekly recurrence preference
  only from a cached Backend slot where `can_start_recurring === true`. A
  `false` or `null` value disables the checkbox; the frontend must not infer
  recurrence availability or generate future occurrences locally.
- Active Booking Request UX is local-only until the automatic submission task:
  `PENDING_SYNC` means awaiting future confirmation, `SYNCING` is locked from
  edit/slot/dismiss actions, and `NEEDS_REVIEW` must render actions from the
  explicit `review_reason`.
- Supported review reasons are `SLOT_UNAVAILABLE`, `INVALID_CUSTOMER_DATA`, and
  `RECURRING_UNAVAILABLE`. There is no active `PAST_APPOINTMENT` reason.
- Editing a local Booking Request changes only customer name, phone, and notes,
  then resets the row to `PENDING_SYNC` while preserving `local_id`,
  `client_request_id`, requested slot, and `requested_recurring`.
- Alternative slot recovery uses only already refreshed cached/backend FREE
  slots. It updates requested slot fields and `original_slot_snapshot`, and it
  never silently changes a recurring request to one-time when the new slot
  cannot start recurrence.
- Booking Request synchronization is a specialized automatic pipeline in
  `src/offline/bookings/bookingRequestSync.ts`, not a generic offline mutation
  queue. It runs from the centralized sync coordinator, not page-level
  `online` listeners.
- Eligible synchronization rows are `PENDING_SYNC` plus stale `SYNCING` rows
  for the current user + Club + authorized Courts. `BOOKED`, `DISMISSED`,
  `NEEDS_REVIEW`, and compatibility `EXPIRED` are never auto-submitted.
- A request is marked durable `SYNCING` with `last_attempt_at` before the
  Booking POST. Stale `SYNCING` recovery uses a five-minute threshold and
  retries with the same `client_request_id`; fresh same-session `SYNCING` rows
  are skipped to avoid double submission.
- The Booking create payload sends customer intent only: Court, customer name,
  phone, requested start/end, optional notes, `is_recurring` from
  `requested_recurring`, and the stable `client_request_id`. It never sends
  local IDs, review state, cached prices, slot snapshots, or generated
  recurrence details.
- HTTP 201 create and HTTP 200 idempotent replay both mark the local request
  `BOOKED` with the returned Backend Booking ID.
- Network/timeout/temporary server failures return the request to
  `PENDING_SYNC` for a later trigger. Business failures move to Task-5 review
  states by stable code only; error message text must not drive behavior.
- Version 3 migrates legacy v2 BookingIntent rows in place: `PENDING_RECHECK`
  and `READY_TO_BOOK` become `PENDING_SYNC`; `CONFLICT` becomes
  `NEEDS_REVIEW / SLOT_UNAVAILABLE`; legacy time-based `EXPIRED` becomes
  `PENDING_SYNC`; `BOOKED` and `DISMISSED` are preserved.
- Appointment time passing does not expire a Booking Request. `EXPIRED` is kept
  only for backward compatibility or a future explicitly approved lifecycle
  reason.
- `BOOKED` and `DISMISSED` requests are hidden from the active operational queue.
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
