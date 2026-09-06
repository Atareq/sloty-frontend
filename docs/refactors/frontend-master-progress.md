# Sloty Frontend Master Refactor — Progress

## Source of Truth

Product specification: `docs/refactors/frontend-master-refactor.md`

The Product specification controls behavior. This file records engineering status, verified Backend contracts, approved implementation decisions, confirmed current-state facts, blockers, and task readiness only. It must not override Product behavior.

## Current Status

Task 7 — COMPLETE

Task 7 makes the central offline coordinator the single orchestration owner for startup, reconnect, resume, retry, and manual operational sync triggers. The coordinator now runs Booking Request synchronization before authoritative dataset refresh, then refreshes Schedule, Bookings, Transactions, and Current Custody while preserving customer intent and aggregating partial results.

## Task Sequence

1. Task 0 — Master Spec Reconciliation + Baseline Audit
2. Task 1 — Financial Truth + Settlement + Offline Custody
3. Audit A — Financial Integration Audit
4. Task 2 — Access Modes + Offline Cold Start + Account State
5. Task 3 — Offline Freshness + Storage Durability
6. Task 4 — Booking Request Persistence + Migration + Idempotency
7. Task 5 — Booking Request UX + Recurring Intent + Needs Review
8. Task 6 — Auto-Sync + Retry + Historical Booking Synchronization
9. Audit B — Offline Workflow Integration Audit
10. Task 7 — Central Sync + Operational Cache + Reconnect UX
11. Task 8 — Public Home + Public Availability
12. Task 9 — Booking/Transaction Notes + Business History
13. Task 10 — Mobile + Schedule Operational UX
14. Task 11 — Logout + Offboarding + Revocation
15. Audit C — Security / Privacy / Product Boundary Audit
16. Task 12 — PWA + Migration + Isolation + Release Hardening

## Locked Decisions

- Past time alone does not invalidate a Booking Request; past/current/future and one-time/recurring requests are eligible for authenticated automatic synchronization.
- Appointment time passing does not create a review reason or automatic expiry.
- Historical Booking pricing and recurrence remain Backend-authoritative.
- V1 review reasons are `SLOT_UNAVAILABLE`, `INVALID_CUSTOMER_DATA`, and `RECURRING_UNAVAILABLE`.
- Technical failures stay pending; `NEEDS_REVIEW` is for business recovery.
- `client_request_id` is stable across uncertain retries and device/PWA restarts.
- `SESSION_EXPIRED` and `TOKEN_NOT_VALID` preserve data; explicit inactive/deleted state purges the user; `CLUB_ACCESS_REVOKED` purges only the named Club scope.
- Offline freshness is device-local. Backend membership contact time is separate, informational, and not per-device proof.
- More than 72 hours disables only new local request creation; it does not delete cache or existing requests.
- Current Custody is signed Backend truth, independent from period analytics and cached Transactions. All Courts omits `court`.
- The offboarding custody gate applies to operational STAFF and is based on non-zero Backend `net_amount`.
- Public availability and authenticated operational Schedule have separate data/privacy contracts.
- Audit uses Backend list summaries and source-confidence metadata without per-row entity enrichment.

## Verified Backend Contracts

Ready for frontend implementation:

- Booking create accepts `client_request_id`; first creation returns 201 and repeat same-key/same-payload returns 200 with the same Booking.
- Booking idempotency mismatch returns structured `BOOKING_CLIENT_REQUEST_MISMATCH`.
- Booking conflicts expose stable codes for unavailable slots and recurring unavailability.
- Booking validation exposes field-level customer errors the frontend can map to `INVALID_CUSTOMER_DATA`.
- Historical booking pricing and recurrence are Backend-owned; frontend must not recalculate them.
- Booking list supports date range, pagination, and notes.
- Operational Schedule range remains Backend-authoritative and is the source for cached slot snapshots.
- Public availability endpoint exists with sanitized public data.
- Access-token responses include `SESSION_EXPIRED`, `TOKEN_NOT_VALID`, `USER_INACTIVE`, `USER_DELETED`, and `CLUB_ACCESS_REVOKED`.
- Current Custody, Settlement Preview, Settlement Create, can-approve, and Staff custody blocker contracts are ready.
- Audit list summaries, detail-on-open, source labels, and source-confidence metadata are ready.

Pending Backend hardening or field rollout:

- Refresh-token error code parity for explicit inactive/deleted/revoked states.
- Idempotency concurrency hardening under simultaneous same-key create races.
- `ClubMembership.last_sync_at` informational field.

## Confirmed Current-State Facts

- The app is Vite/React/TypeScript with `PwaProvider`, `AuthProvider`, and `RouterProvider`; authenticated business pages run inside `AppShell`.
- The Service Worker is static-shell oriented through `vite-plugin-pwa` `generateSW`; `/api` is excluded and no generic runtime API cache is configured.
- Auth stores access/refresh tokens in `sessionStorage` and selected Club slug in `localStorage`.
- `/me` is the online source of authenticated identity. If a valid token-backed `/me` refresh cannot reach the Backend, `AuthProvider` can hydrate the exact user + selected-Club verified offline context.
- A process-killed installed PWA can cold-open into scoped Offline Operational Mode only when the browser is offline and a selected-Club verified context exists.
- `offline_context` exists as a verified context hint and does not store credentials.
- Dexie database `sloty_local_db` is at schema version 3 with scoped stores for sync metadata, Schedule days, Bookings, Booking details, Transactions, Transaction details, Current Custody snapshots, Booking Requests in the existing `booking_intents` store, and offline context.
- Sensitive offline rows carry canonical user + Club scope keys; Schedule and BookingIntent reads require Court scope.
- Dataset replacements are atomic and preserve prior rows on network or IndexedDB failure.
- `clearScope(scope)` and `clearUserOperationalData(userId)` cleanup primitives exist and are covered by isolation tests.
- Local freshness is now represented by scoped `sync_metadata.operational_last_sync_at`, with existing dataset timestamps retained as independent freshness details.
- Freshness policy is centralized under `src/offline/freshness`: under 12h is fresh, 12h through exactly 72h warns, and more than 72h disables only new local offline request creation.
- PWA startup requests persistent browser storage once where `navigator.storage.persisted()` / `persist()` are supported; denial or unsupported APIs are non-fatal.
- Canonical Booking Request persistence uses `BookingRequestRecord`; `BookingIntentRecord` remains only a transitional type alias.
- Booking Request states are `PENDING_SYNC`, `SYNCING`, `BOOKED`, `NEEDS_REVIEW`, `DISMISSED`, and `EXPIRED`.
- Review reasons are `SLOT_UNAVAILABLE`, `INVALID_CUSTOMER_DATA`, and `RECURRING_UNAVAILABLE`; `PAST_APPOINTMENT` is not used.
- `client_request_id` is generated once for new or migrated local requests and is indexed with `[scope_key+client_request_id]` for future idempotent submission.
- Legacy v2 rows migrate in place: `PENDING_RECHECK` and `READY_TO_BOOK` to `PENDING_SYNC`; `CONFLICT` to `NEEDS_REVIEW / SLOT_UNAVAILABLE`; legacy time-based `EXPIRED` to `PENDING_SYNC`; `BOOKED` and `DISMISSED` preserved.
- Current Task-4 Schedule compatibility saves one-time requests as `PENDING_SYNC`, displays them, and does not auto-submit or expose the old manual-ready confirmation path.
- Sync is centralized in `OfflineSyncProvider`, single-flight by scope/dataset, and runs on startup, online, visible resume, manual trigger, and one delayed retry.
- Current sync order is Booking Request processing first, Schedule refresh second, Bookings and Transactions third, then Current Custody.
- Schedule cache covers today plus 30 Egypt-local days, cache-first, with authoritative post-mutation day refresh.
- Booking cache covers the previous 7 Egypt-local days including today and stores lazy details separately.
- Transaction cache covers the previous 7 Egypt-local days including today and is read-only offline.
- Current Custody offline display uses exact Backend snapshots, not local Transaction reductions.
- Financial settlement flows already use Backend Preview/Create truth and do not send frontend-calculated totals.
- Public Home and public availability routes/adapters are missing.
- Booking notes are present in list/detail surfaces and Transaction notes are present in details.
- Audit pages use list summaries plus detail-on-open and do not appear to N+1 enrich rows.
- Shared phone input and mobile 16px touch control rules are present.
- Explicit logout clears user-scoped data before clearing auth/session; session expiry and token invalidity clear only auth tokens and preserve scoped IndexedDB rows.
- Explicit `USER_INACTIVE` and `USER_DELETED` profile failures clear all local operational rows for the token user.
- Explicit `CLUB_ACCESS_REVOKED` profile failures clear only the named user + Club scope when `details.club_slug` is present.
- Settings offboarding dialogs do not yet present the Staff custody blocker as a dedicated acknowledgement flow.

## Confirmed Superseded Architecture

The following existing behavior is intentionally not the target architecture:

- `PENDING_RECHECK`, `READY_TO_BOOK`, and `CONFLICT` BookingIntent states.
- Treating an appointment time as expired solely because time has passed.
- Manual-only `احجز الآن` completion after local recheck.
- Offline one-time-only BookingIntent creation.
- `local_id` as the only durable local request identifier.
- Local `last_checked_at` recheck semantics.
- Schedule-first request recheck as the final workflow instead of request-first automatic synchronization after authenticated readiness.
- `/me` network failure acting as a hard authentication failure even when verified local context exists.
- Dataset-only freshness labels as a substitute for operational freshness policy.

## Backend Dependencies

- Task 1: ready.
- Audit A: no Backend dependency beyond confirming already-ready finance contracts.
- Task 2: frontend access-token code mapping, offline cold start, and scoped cleanup are implemented; refresh-token parity remains a Backend hardening dependency.
- Task 3: complete. `ClubMembership.last_sync_at` remains Backend-pending for informational staff-last-contact UX only and does not control device-local freshness.
- Task 4: can implement stable local `client_request_id`; simultaneous same-key race hardening remains Backend-pending.
- Task 5: ready once Task 4 request model exists.
- Task 6: ready once Tasks 2, 4, and 5 provide access mode and request model foundations.
- Task 7: complete. Booking Request sync now runs before authoritative operational refresh inside the single coordinator.
- Task 8: ready.
- Task 9: ready.
- Task 10: ready.
- Task 11: partially blocked on refresh-token explicit code parity and `ClubMembership.last_sync_at`.
- Task 12: depends on prior migration, access-mode, freshness, and release-hardening decisions.

## Task Readiness

| Item | Status | Baseline estimate | Notes |
| --- | --- | ---: | --- |
| Task 1 | READY — SMALLER THAN EXPECTED | 90% | Current custody and settlement truth are largely implemented; audit invalidation/freshness edge cases remain. |
| Audit A | AUDIT ONLY | n/a | Run after Task 1. |
| Task 2 | PARTIALLY COMPLETE — BACKEND HARDENING DEPENDENCY | 80% | Frontend handles access-token account-state codes and verified offline context; refresh-token parity still depends on Backend. |
| Task 3 | COMPLETE | 100% | Scoped operational freshness, persistence request, stale warning, and >72h new-request guard are implemented. |
| Task 4 | COMPLETE | 100% | Canonical Booking Request persistence, migration, stable idempotency ID, and cleanup compatibility are implemented. |
| Task 5 | COMPLETE | 100% | Booking Request UX, recurring intent capture, Needs Review recovery, edit locking, and dismissal are implemented. |
| Task 6 | COMPLETE | 100% | Automatic authenticated submission, retry, stale `SYNCING`, idempotent replay, and historical/recurring sync are implemented. |
| Audit B | AUDIT ONLY | n/a | Run after Task 6. |
| Task 7 | COMPLETE | 100% | Central coordinator owns triggers, locking, Booking-Requests-first order, refresh aggregation, and operational freshness updates. |
| Task 8 | READY | 0% | Public Home and public availability are missing. |
| Task 9 | READY — SMALLER THAN EXPECTED | 90% | Notes and audit are mostly complete; final source-confidence UX/test gaps remain. |
| Task 10 | READY — SMALLER THAN EXPECTED | 95% | Mobile and Schedule UX are mostly complete; real-device QA remains. |
| Task 11 | PARTIALLY BLOCKED | 25% | Logout primitives exist; revocation/offboarding copy and code handling need Backend parity. |
| Audit C | AUDIT ONLY | n/a | Run after Task 11. |
| Task 12 | DEPENDS ON PRIOR TASKS | 70% | PWA foundation is strong; final release depends on migrations and device QA. |

## Test Coverage Baseline

Existing useful coverage:

- PWA configuration, install/update prompt behavior, and prompt suppression.
- Offline scope isolation, user cleanup, Club cleanup primitives, and Dexie atomic replacement behavior.
- Current legacy BookingIntent creation, recheck, conflict, dismissal, and manual booking behavior.
- Schedule cache-first behavior and post-mutation refresh persistence.
- Booking and Transaction cache sync/read-only offline behavior.
- Finance/current custody and settlement Preview/Create truth cases.
- Audit list/detail rendering and source-label presentation.
- Shared phone input/mobile typography rules.

Missing or target-specific coverage:

- Real-device cold offline PWA launch into Offline Operational Mode after process kill/reboot.
- Refresh-token failure parity for inactive, deleted, and Club revoked states.
- Real-device durable storage grant/denial behavior and browser eviction/manual device behavior.
- Stable replay, mismatch, response-loss, and stale `SYNCING` network handling.
- Real-device/manual summary UX for processed Booking Requests after reconnect.
- Historical and recurring Booking Request synchronization.
- `NEEDS_REVIEW` reason mapping and edit/retry UX.
- Public Home/public availability privacy boundary.
- Final logout pending-work warning and offboarding custody acknowledgement.

Manual QA still required:

- Installed PWA cold launch after OS/browser restart on Android and iOS.
- iOS Add-to-Home-Screen behavior and Safari zoom behavior.
- Static shell assets, fonts, backgrounds, and icons while offline on real devices.
- Browser storage pressure/eviction behavior.
- Finance/offline custody after real settlement lifecycle on authenticated accounts.

## Baseline Verification

Performed during Task 0:

- Read project guide and product overview documents before editing.
- Read the approved master report, Backend confirmation report, and Task 0 prompt.
- Audited current frontend code across auth, API client, routing, PWA, offline storage, sync, Schedule, Booking requests, Bookings, Transactions, Finance, Settlement, Public routes, Notes, Audit, mobile UX, logout, and Settings offboarding.
- Installed `docs/refactors/frontend-master-refactor.md`.
- Installed this progress tracker at `docs/refactors/frontend-master-progress.md`.
- Confirmed Task 0 changed documentation only.

Pre-existing local changes preserved:

- Modified images in `public/icons/sloty-green-surface-bg.png` and `public/images/sloty-green-surface-bg.png`.
- Staged Schedule changes in `src/features/schedule/SchedulePage.tsx` and `src/features/schedule/SchedulePage/SchedulePage.test.tsx`.
- Unstaged navigation copy change in `src/shared/navigation/navigation.config.ts`.

## Completed Tasks

- Task 0 — Master Spec Reconciliation + Baseline Audit.
- Task 1 — Financial Truth + Settlement + Offline Current Custody Hardening.
- Task 2 — Access Modes + Offline Cold Start + Account State Hardening, partial pending Backend refresh-token parity.
- Task 3 — Offline Freshness, Persistent Storage, and Local Durability.
- Task 4 — Durable Booking Request Persistence, Migration, and Idempotency Foundation.
- Task 5 — Booking Request UX, Recurring Intent, and Needs Review.
- Task 6 — Booking Request Auto-Sync, Retry, and Historical Booking Synchronization.
- Task 7 — Central Offline Sync Coordinator, Refresh Order, and Reconnect Recovery.

## Next Recommended Task

Task 8 — Public Home and Public Availability.

Reason: Task 7 completed central sync ordering and coordinator ownership. The next approved item is the separate public-mode/privacy boundary for public home and public availability.

## Task 1 Durable Findings

- Dashboard period analytics and Current Custody are independent state/query domains.
- Staff own custody uses Backend Settlement Preview; Owner/authorized Manager custody uses grouped `unsettled-summary`.
- Management all-courts scope omits `court`; explicit Court selection sends `court`, and returning to all-courts removes it.
- Current Custody display uses Backend `net_amount`, `transaction_count`, and `totals_by_payment_method`; it does not reduce Transaction History rows.
- Zero-transaction custody and zero-net-with-transactions custody remain distinct.
- Negative Backend custody values remain signed and use neutral presentation while final Arabic negative-custody copy remains a Product question.
- Settlement Create posts only `collected_by`, optional `court`, and trimmed optional `notes`.
- Settlement stale/empty race codes refresh/recover through Backend truth.
- Backend `can_approve` controls settlement action availability.
- Successful payment, refund-producing cancellation, transaction cancellation, settlement creation, and settlement status changes use the existing current-financial-state signal.
- Offline custody renders the last Backend custody snapshot and does not use the seven-day Transaction cache as a calculator.

Task 1 tests added/strengthened:

- `settlementsApi` now asserts Settlement Create omits transaction IDs, frontend totals, periods, payment breakdown, and candidate-row data.
- `SettlementsHubPage` now asserts a cached Transaction sum of 750 cannot override a cached Backend custody snapshot of 1,250.

## Task 2 Durable Findings

- Account-state recovery is now code-driven in `src/core/auth/accountState.ts`.
- Generic 401/403 responses require login but do not delete local operational data.
- `SESSION_EXPIRED` and `TOKEN_NOT_VALID` clear auth/session state without clearing the selected Club or IndexedDB scopes.
- `USER_INACTIVE` and `USER_DELETED` clear all scoped local operational rows owned by the token user.
- `CLUB_ACCESS_REVOKED` clears only the Backend-named `details.club_slug` scope for the token user.
- Offline context reads and cleanup use non-fatal safety wrappers that log only generic messages.
- Cold-start offline hydration uses only a previously saved selected-Club context and does not promote Platform Admin global authority offline.
- Online login and `/me` hydration remain the only source for full online identity, membership, and permission verification.

Task 2 tests added/strengthened:

- `AuthProvider` now covers Backend-unreachable offline hydration, session-only preservation, user deletion cleanup, and Club revocation cleanup.
- `AuthProvider.offline` now covers process-style cold start into verified offline operational access and anonymous denial without context.
- `apiClient` now preserves structured 401 account-state codes when no refresh attempt is available.
- Offline repositories now cover latest selected-Club context reads without crossing Club scope.
- Offline safety tests now cover safe read failure and scoped cleanup failure logging.

## Task 3 Durable Findings

- `src/offline/freshness/offlineFreshness.ts` owns the 12-hour and 72-hour thresholds and the `canCreateNewOfflineRequest` decision.
- `sync_metadata.operational_last_sync_at` is scoped by user + Club and advances only after a complete successful coordinator cycle.
- Existing dataset timestamps stay independent; the helper can use the newest scoped dataset timestamp as a compatibility fallback for older local metadata.
- The AppShell shows the approved stale/restricted warning only in offline-like operational use and does not create a repeated toast loop.
- The Schedule offline save path blocks only new local BookingIntent creation when freshness is more than 72 hours old; online Booking creation is not blocked by cache age.
- Existing BookingIntents are not deleted, expired, or hidden because of freshness age.
- `requestPersistentStorageOnce()` calls the browser persistence API once when supported and treats unsupported, denied, or thrown cases as non-fatal.
- Offline BookingIntent success remains commit-after-IndexedDB-write, and failed writes keep the form context instead of showing success.

Task 3 tests added/strengthened:

- Freshness policy tests cover <12h, exact 12h, 12–72h, exact 72h, >72h, online override, and historical-appointment independence.
- Repository tests cover user + Club-scoped operational freshness and restart survival.
- Coordinator tests cover successful-cycle freshness writes and partial-failure non-advancement.
- PWA storage tests cover already persisted, granted, denied, unsupported, and throwing StorageManager paths.
- AppShell and Schedule tests cover stale notice display, >72h new-request restriction, commit-before-success, and critical write failure behavior.

## Task 4 Durable Findings

- `BookingRequestRecord` is the canonical persisted model; the existing `booking_intents` store name is retained for non-destructive migration safety.
- Schema version 3 adds the unique `[scope_key+client_request_id]` index.
- `local_id` remains local UI/IndexedDB identity. `client_request_id` is stable Backend idempotency identity and is never regenerated by repository update/reopen paths.
- `requested_recurring` is persisted as customer intent and defaults to `false` for legacy one-time rows; cached `can_start_recurring` is not treated as customer intent.
- Version-3 migration preserves unresolved count by mapping legacy `PENDING_RECHECK`, `READY_TO_BOOK`, and time-based `EXPIRED` to `PENDING_SYNC`, and legacy `CONFLICT` to `NEEDS_REVIEW / SLOT_UNAVAILABLE`.
- Legacy `BOOKED` keeps `resolved_booking_id`; legacy `DISMISSED` remains terminal and excluded from submission.
- `updated_at` is initialized from legacy `last_checked_at` when available, otherwise `created_at`; `last_attempt_at` defaults to `null`.
- Task 4 intentionally does not implement automatic submission, retry scheduling, idempotent POST, final Needs Review UX, or recurring capture UI.

Task 4 tests added/strengthened:

- Repository migration tests seed real v2 legacy rows and reopen through v3.
- Migration tests cover unresolved-count preservation, legacy state mappings, generated and preserved `client_request_id`, recurrence defaults/preservation, timestamp migration, scope preservation, terminal status preservation, and reopen stability.
- Repository update tests cover partial status updates preserving `client_request_id`, `requested_recurring`, customer data, and original slot snapshot.
- Schedule compatibility tests cover current offline save producing canonical `PENDING_SYNC` records and pending requests staying visible without auto-sync/manual booking in Task 4.
- Legacy recheck tests cover no time-based expiration and no mutation of canonical requests before Task 6.

## Task 5 Durable Findings

- Offline Booking Request creation still uses the existing Schedule `AddBookingSheet`; online Booking creation remains a direct Backend `createBooking()` call.
- Offline request save now persists the employee/customer recurrence preference as `requested_recurring` only when the cached Backend slot reports `can_start_recurring === true`.
- `can_start_recurring=false` and `null` both disable offline recurring selection; `false` may show Backend-provided conflict context, while `null` explains that fresh Backend information is required.
- Active request cards render `PENDING_SYNC`, `SYNCING`, and `NEEDS_REVIEW` with product copy. `SYNCING` is locked from edit, alternative-slot selection, one-time conversion, and dismissal.
- `NEEDS_REVIEW` is reason-driven:
  - `SLOT_UNAVAILABLE` offers choosing another cached/backend FREE slot or dismissal.
  - `INVALID_CUSTOMER_DATA` offers customer-data editing or dismissal.
  - `RECURRING_UNAVAILABLE` offers one-time conversion, choosing another cached/backend FREE slot, or dismissal.
- Customer-data edits update only name, phone, and notes; they reset the request to `PENDING_SYNC`, clear `review_reason`, and preserve `local_id`, `client_request_id`, requested slot, and `requested_recurring`.
- Alternative slot selection uses already cached Backend FREE slots only. It updates requested date/time and `original_slot_snapshot`, preserves customer data and request identity, and does not generate availability locally.
- If a recurring request selects a FREE alternative whose `can_start_recurring` is not true, the request stays `NEEDS_REVIEW / RECURRING_UNAVAILABLE`; the frontend does not silently downgrade to one-time.
- `احجز مرة واحدة` for `RECURRING_UNAVAILABLE` is a local state edit only: `requested_recurring=false`, `status=PENDING_SYNC`, `review_reason=null`. It does not POST to the Backend.
- Dismissal marks the scoped row `DISMISSED`; it does not delete the row. `BOOKED` and `DISMISSED` remain hidden from the active queue.
- Legacy `EXPIRED` remains compatibility-only and no longer presents time-based expiration copy in active request UX.
- Task 5 intentionally does not implement automatic submission, HTTP replay, retry scheduling, stale `SYNCING` recovery, or Backend contract changes.

Task 5 tests added/strengthened:

- `AddBookingSheet` covers offline recurrence eligibility true/null copy and behavior.
- Schedule tests cover offline recurring request persistence, local customer-data editing, reason-specific Needs Review actions, `SYNCING` edit lock, alternative slot snapshot updates, recurring alternative review, and no manual request `احجز الآن`.
- Legacy recheck tests cover the Task 5 status copy change and non-expiring legacy `EXPIRED` presentation.

## Task 6 Durable Findings

- `src/offline/bookings/bookingRequestSync.ts` owns the specialized Booking Request auto-sync pipeline. It is not a generic offline mutation queue.
- The sync processor re-reads the persisted request immediately before processing, skips live edit-locked rows, and marks an eligible request `SYNCING` with `last_attempt_at` before calling the Backend.
- Eligibility is scoped to current user + Club + authorized Court IDs and includes only `PENDING_SYNC` plus stale `SYNCING` rows. `BOOKED`, `DISMISSED`, `NEEDS_REVIEW`, and compatibility `EXPIRED` are excluded.
- Stale `SYNCING` recovery is age-based: a `SYNCING` request whose `last_attempt_at` is at least five minutes old becomes retryable with the same `client_request_id`. Fresh same-session `SYNCING` is skipped to avoid double submission.
- Queue order is deterministic: `requested_start` ascending, then `created_at`, then `local_id`. This naturally processes historical/past requests before later/future requests without introducing a complex scheduler.
- Booking create payloads are built from customer intent only: `court`, `customer_name`, `customer_phone`, `start_time`, `end_time`, `client_request_id`, `is_recurring`, and optional `notes`. Local IDs, status, review reason, cached slot snapshots, cached price, and generated recurrence data are never sent.
- `requested_recurring=false` posts `is_recurring=false`; `requested_recurring=true` posts `is_recurring=true`. No local recurrence downgrade, occurrence generation, or historical price reconstruction is performed.
- Any successful Booking response, including first-create HTTP 201 or idempotent replay HTTP 200, is treated as success by the shared API wrapper result and marks the request `BOOKED` with `resolved_booking_id`.
- Retryable technical failures (`NETWORK_ERROR`, timeout/network DOM exceptions, 408, 5xx including 502/503/504) return the request to `PENDING_SYNC` with the same `client_request_id` and no `review_reason`.
- Business mappings are centralized and machine-readable:
  - `BOOKING_SLOT_UNAVAILABLE` → `NEEDS_REVIEW / SLOT_UNAVAILABLE`.
  - `RECURRING_UNAVAILABLE` → `NEEDS_REVIEW / RECURRING_UNAVAILABLE`.
  - `VALIDATION_ERROR` with `customer_name`, `customer_phone`, or `phone_number` field errors → `NEEDS_REVIEW / INVALID_CUSTOMER_DATA`.
- Unrelated validation and unknown non-transient client errors become non-retrying `NEEDS_REVIEW` with `review_reason=null`; user-facing integrity copy remains a Product/Engineering follow-up.
- `BOOKING_CLIENT_REQUEST_MISMATCH` becomes non-retrying `NEEDS_REVIEW` with `review_reason=null`, preserves the request and `client_request_id`, and does not generate a replacement UUID.
- `SESSION_EXPIRED`, `TOKEN_NOT_VALID`, `USER_INACTIVE`, `USER_DELETED`, and `CLUB_ACCESS_REVOKED` are classified through the Task-2 account-state helper. The request returns to `PENDING_SYNC`, processing stops for the current run/scope, and destructive cleanup remains delegated to AuthProvider/account-state ownership.
- `OfflineSyncCoordinator` previously invoked Booking Request processing after successful Schedule sync and before Bookings/Transactions/Current Custody. Task 7 moved this single processor earlier without changing the request state machine.
- If request processing stops for auth/account/access recovery, the coordinator skips secondary datasets for that run and reports a partial failure instead of hammering guaranteed unauthorized requests.
- Schedule registers a process-local edit lock while the Booking Request edit sheet is open. This avoids submitting stale values from the current UI session while keeping persisted request state authoritative.
- Task 6 intentionally does not add reconnect summary UI, manual refresh UX, page-level online listeners, Service Worker mutation handling, generic queues, cache window changes, or Backend hardening work.

Task 6 tests added/strengthened:

- New `bookingRequestSync` unit tests cover one-time, recurring, historical one-time/recurring, 200 replay, stale `SYNCING` recovery, response-loss retry identity, technical retry classes, slot/recurring/customer validation mappings, unrelated validation, idempotency mismatch, auth/account/Club stops, dismissed/review/syncing/edit exclusions, deterministic continuation after mixed results, no message parsing, no cached price payload, and no recurrence generation.
- Repository tests cover scoped sync selection and deterministic requested-time ordering.
- Coordinator tests cover the Booking Request processor seam and auth-stop secondary dataset skipping.

## Task 7 Durable Findings

- `OfflineSyncCoordinator` is the single orchestration owner for operational startup, reconnect, resume, retry, and manual sync triggers mounted through `OfflineSyncProvider` and `OfflineSyncLifecycle`.
- Sync order is now business-first: Booking Request processing runs before Schedule refresh, then Bookings and Transactions run after Schedule, then Current Custody refreshes last.
- The coordinator calls the Task-6 `processPendingBookingRequests()` path through one processor seam. It does not duplicate Booking POST logic, idempotency handling, error classification, retry policy, or Needs Review mapping.
- Authorized Court discovery for pre-refresh Booking Request processing reuses the Schedule sync Court-scope resolver so Staff stay limited to the assigned Court and management roles use active selected-Club Courts.
- Startup, browser-online, visible-resume, manual, and delayed retry triggers continue to coalesce through one same-scope full-run lock. Dataset-level single-flight protection remains in place.
- If Booking Request processing stops for auth/account/Club recovery, Schedule, Bookings, Transactions, and Current Custody are skipped for that run and the result is reported as partial failure.
- Booking Request success is not rolled back when a later refresh fails. Dataset failures remain independent and retryable on later coordinator triggers.
- `OperationalSyncRunResult` remains the minimal sync summary for future UI: dataset results, optional Booking Request counts, run status, start time, and completion time.
- `sync_metadata.operational_last_sync_at` remains the approved canonical device-local operational freshness timestamp. It updates only after a fully successful coordinator cycle; dataset-specific timestamps remain independent.
- No `last_successful_operational_sync_at` field, per-device sync table, Service Worker mutation queue, or page-level reconnect listener was added.

Task 7 tests added/strengthened:

- Coordinator tests now assert Booking Requests run before Schedule and secondary dataset refreshes.
- Coordinator tests assert auth/access stop from Booking Request processing skips all refresh datasets.
- Coordinator tests preserve coalescing across startup, online, resume, and manual triggers with the new pre-refresh order.
- Existing focused sync tests continue covering stale `SYNCING`, idempotent replay, response-loss retry, partial request outcomes, scope isolation, and non-destructive refresh failures.
