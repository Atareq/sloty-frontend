# Sloty Frontend Master Refactor

## Status and authority

**PRODUCT APPROVED — CONSOLIDATED FRONTEND IMPLEMENTATION SOURCE OF TRUTH**

This document consolidates the approved **Sloty Frontend Master Refactor Report** and the later approved **Sloty Frontend — Response to Backend Confirmation Report**. The Backend-confirmation report supersedes every conflicting rule from the earlier report.

This is the permanent Product specification for the refactor. Implementation state, verified repository facts, blockers, and task readiness belong in `frontend-master-progress.md`; they do not change the behavior specified here.

The work is a controlled in-place refactor of the existing React application. Reuse the existing routes, feature modules, API wrappers, shell, PWA foundation, and IndexedDB layer. Do not create parallel `/v2`, new Schedule, new Finance, new Offline app, or giant snapshot architecture.

## 1. Product boundary and governing principles

Sloty remains Arabic-first, RTL-first, mobile-first, and focused on MVP 1 court operations. Marketplace, player-app, payment-gateway, and platform-commission flows remain out of scope until explicitly approved.

Two rules govern the refactor:

1. **Backend decides business truth; Frontend consumes it.** Backend owns working hours, slots, availability, conflicts, recurrence, pricing, Booking lifecycle, phone validation, permissions, Transactions, Current Custody, Settlement eligibility, account state, and mutation results. Frontend presents, validates early where safe, caches authoritative responses, and coordinates refreshes. It must not create a second business engine.
2. **Offline Sloty preserves customer intent; authenticated Online Sloty commits it.** Cached Backend truth may be displayed offline. Local Booking Requests may be created, edited, and dismissed offline. Actual Backend mutations require current authentication and authorization. A local Booking Request is never a Booking, hold, reservation, or confirmation.

The application has three Product experiences: `PUBLIC`, `ONLINE_OPERATIONAL`, and `OFFLINE_OPERATIONAL`. Browser network state, Backend reachability, authentication, Backend account state, local freshness, and pending request state are distinct concepts; do not collapse them into one global Boolean.

## 2. Startup, access, and public mode

Startup resolves Backend reachability, current session, prior verified operational context, and explicit Backend account-state responses.

- If the Backend is usable and the session is valid, enter Online Operational Mode.
- If the Backend is usable but authentication is not valid, require login.
- If the Backend is unavailable and the device has a still-trusted, previously verified operational context, allow Offline Operational Mode for that user and Club scope.
- If no verified operational context exists, show Public Mode. Anonymous offline users see calm internet-required copy and never receive private cached data.

A previously verified employee in Offline Operational Mode may, subject to freshness policy:

- read cached Schedule, Booking context, Transactions, and Current Custody;
- create local Booking Requests;
- edit or dismiss unresolved local Booking Requests.

Offline Operational Mode is device-local continuity, not offline Backend authentication. It must never authorize or send a Backend mutation.

### Public Home and availability

Public availability uses the sanitized Backend contract:

`GET /api/v1/public/clubs/{club_slug}/courts/{court_id}/availability/`

Public users may see only Court, date, start/end time, and the concepts `متاح` / `غير متاح`, plus a login call to action. They must not receive Booking IDs, customer identity, phones, notes, internal statuses such as HOLD or NO_SHOW, recurring context, staff, payments, Transactions, or Settlement data.

Public Schedule is not the authenticated operational Schedule with fields hidden visually. Public and operational adapters may share presentational components, but their data contracts and cache/security boundaries remain separate.

## 3. PWA and Service Worker boundary

The Service Worker owns the static application shell and update lifecycle:

- HTML, JavaScript, CSS;
- icons, fonts, backgrounds, and approved core illustrations;
- installable PWA metadata and shell navigation fallback.

It must not become the authoritative store for auth, `/me`, Schedule, Bookings, Transactions, Current Custody, Settlement, users, or other business APIs. Do not add generic API runtime caching or a Service Worker mutation queue.

Cold offline launch after an initial successful online load must retain the Sloty logo, Arabic fonts, Schedule background, CSS, icons, PWA icons, and core illustrations. Physical cold launch, install, reboot, update, and offline navigation require real-device/browser verification.

Chromium uses the captured browser install prompt. iOS Safari receives concise Add-to-Home-Screen guidance. Unsupported and standalone environments stay quiet. Install copy may promise faster Home Screen access and explain saved customer requests only when it also makes clear that they still require confirmation.

Application updates are prompted and deferred. Discovery never forces a reload. Do not apply a waiting update while the employee is typing, editing a local request, using an unsaved sheet/modal, or performing other operational work.

## 4. IndexedDB ownership, classification, and durability

Structured private business data belongs in the versioned Dexie database `sloty_local_db` under `src/offline`.

Conceptual stores include:

- verified offline context;
- dataset-specific synchronization metadata;
- Schedule days;
- Booking list and lazy Booking details;
- Transaction list and lazy Transaction details;
- Current Custody snapshots;
- local Booking Requests.

### Data classes

**Rebuildable Backend cache:** Schedule, Bookings, Transactions, Current Custody, and operational metadata.

**Critical local business data:** unresolved local Booking Requests, particularly `PENDING_SYNC`, `SYNCING`, and `NEEDS_REVIEW`. These records may exist nowhere except the device.

Cleanup and migration APIs must make that distinction explicit. Do not use destructive fallback migration such as `deleteDatabase()` when critical requests exist. Schema upgrades must preserve unresolved requests or transform them through an approved explicit migration.

Every private row carries a canonical user + Club scope. Schedule and Booking Request access also requires the relevant Court. Reads must never fall back to another user, Club, or Court. Switching Club must not briefly render the previous Club's data under the new identity.

Snapshot replacement follows fetch-complete, validate, transactional replace, commit. A failed request, partial pagination result, or IndexedDB transaction keeps the last completed dataset and timestamp. UI success for a local Booking Request is shown only after its IndexedDB transaction commits.

The app attempts `navigator.storage.persisted()` and, where appropriate, `navigator.storage.persist()`. Denial is non-fatal and must not be presented as proof that browser eviction cannot happen.

## 5. Device-local offline freshness

Frontend owns a device-local operational freshness timestamp, conceptually `last_successful_operational_sync_at`. It is independent from Backend `ClubMembership.last_sync_at`.

The local timestamp records a defined successful authenticated operational contact/refresh on this device. It does not require a Backend acknowledgement that every dataset or every device completed one global synchronization, and one incidental API success must not be misrepresented as comprehensive freshness. Dataset timestamps remain independent. Exact commit/update ownership must be centralized and tested.

Policy:

- **Less than 12 hours:** normal Offline Operational Mode. Cached reads and local request create/edit/dismiss are allowed.
- **12–72 hours:** show the stale-data warning on each PWA opening. Cached reads and local request create/edit/dismiss remain allowed.
- **More than 72 hours:** keep cached data and all existing requests visible; keep edit/dismiss available; disable only creation of new local Booking Requests until successful online refresh.

Age never deletes cached data or requests.

## 6. Local Booking Request model

The target persisted model contains:

```text
local_id
client_request_id
scope_key
user_id
club_slug
court_id
requested_date
requested_start
requested_end
customer_name
customer_phone
notes
requested_recurring
original_slot_snapshot
status
review_reason
created_at
updated_at
last_attempt_at
resolved_booking_id
```

`local_id` is the IndexedDB/UI identity. `client_request_id` is the stable Backend idempotency identity for the logical request.

Target states are:

- `PENDING_SYNC`
- `SYNCING`
- `BOOKED`
- `NEEDS_REVIEW`
- `DISMISSED`
- `EXPIRED`

The initial V1 review reasons are exactly:

- `SLOT_UNAVAILABLE`
- `INVALID_CUSTOMER_DATA`
- `RECURRING_UNAVAILABLE`

`EXPIRED` is retained only for migration/backward compatibility or a future explicitly approved lifecycle reason. Appointment time passing does not transition a request to `EXPIRED`.

### Offline capture

The existing Booking form is reused. It captures the selected cached slot, customer name, E.164-normalized phone, optional notes, and recurring preference when the cached Backend eligibility explicitly permits it. The primary action is `احفظ طلب الحجز`.

Flow:

1. perform safe local field validation;
2. generate durable local and idempotency identities;
3. commit the full request in one IndexedDB transaction;
4. only after commit, show `تم حفظ طلب الحجز` and `بانتظار التأكيد`.

Do not show Booking-success language such as `تم الحجز` before the Backend Booking exists.

Unresolved requests may be edited and dismissed. `DISMISSED` is durable and permanently excludes the request from automatic submission. A request being edited is excluded from sync until its current version is safely saved. An actively or uncertainly submitted logical payload must not be silently changed or retried under a regenerated idempotency key.

## 7. Historical, current, future, and recurring requests

Past time alone is not an invalid Booking condition. Historical Booking is legitimate for forgotten entries, operational corrections, delayed offline capture, already-played customers, and later payment recording.

Eligible past, current, and future Booking Requests all follow normal authenticated automatic synchronization. The frontend must not reject, manually divert, or expire a request merely because its requested start time passed.

A historical recurring anchor is also valid. Submit `requested_recurring = true` as Booking creation with `is_recurring = true`. Backend may create the historical anchor and continue future weekly recurrence from that pattern. Frontend never generates missed occurrences or calculates recurrence.

Historical Booking creation uses the Backend's current configured working-hour/pricing rules. The original cached slot/price remains context only. Frontend must not reconstruct historical prices, force an old cached price, or build a pricing reconciliation engine.

### Cached recurring eligibility

- `can_start_recurring = true`: allow the offline weekly preference and persist `requested_recurring = true`; explain that eligibility comes from the last update and will be checked online.
- `can_start_recurring = false`: disable recurrence.
- `can_start_recurring = null` or unknown: disable recurrence and require Internet to verify it.

Never silently downgrade a recurring request to one-time. If the base slot is still usable but recurrence is rejected, move to `NEEDS_REVIEW / RECURRING_UNAVAILABLE` and offer explicit one-time booking, another slot, or dismissal.

## 8. Automatic synchronization and idempotency

Connectivity alone does not authorize a mutation. The sequence is:

1. Backend becomes reachable;
2. authenticate or re-authenticate;
3. resolve current account and Club authorization;
4. automatically submit eligible local Booking Requests;
5. refresh authoritative operational datasets;
6. present a lightweight request-processing summary when requests were processed.

There is no second receptionist confirmation for an otherwise eligible request. Automatic submission applies to one-time, recurring, past, current, and future requests.

Technical failures—network loss, timeout, 502, 503, 504, or temporary Backend unavailability—leave the request `PENDING_SYNC`. They do not require a human business decision. `NEEDS_REVIEW` is reserved for business recovery.

Backend-to-local mapping:

- `BOOKING_SLOT_UNAVAILABLE` → `NEEDS_REVIEW / SLOT_UNAVAILABLE`.
- `RECURRING_UNAVAILABLE` → `NEEDS_REVIEW / RECURRING_UNAVAILABLE`.
- `VALIDATION_ERROR` with relevant `customer_name` or `customer_phone` field errors → `NEEDS_REVIEW / INVALID_CUSTOMER_DATA`.
- `BOOKING_CLIENT_REQUEST_MISMATCH` → exceptional integrity/manual-resolution state; never generate a new UUID and blindly retry.

Backend idempotency contract:

- first accepted create returns HTTP 201;
- same Club + same `client_request_id` + same logical payload returns the existing Booking with HTTP 200;
- same Club + same `client_request_id` + different logical payload returns HTTP 409 `BOOKING_CLIENT_REQUEST_MISMATCH`.

Both HTTP 200 replay and HTTP 201 create are Booking success. `client_request_id` survives retry, timeout, response loss, app kill, process termination, phone reboot, session expiry, reconnect, and PWA reopen.

A stale `SYNCING` request found after restart becomes retryable with the same `client_request_id`. The frontend must assume the prior Backend request may have succeeded and use idempotency to resolve uncertainty.

Processing must be deterministic and sequential at current scale. Historical unresolved requests may be prioritized before future requests, then future requests nearest-first; a simpler deterministic safe order is acceptable if product testing does not show urgency problems. UI review-card order is separate from mutation processing order.

## 9. Account-state and revocation semantics

Only explicit machine-readable Backend semantics may trigger destructive cleanup:

- **Network failure:** preserve everything.
- **`SESSION_EXPIRED`:** preserve private cache and local Booking Requests; require login; resume synchronization after successful authentication.
- **`TOKEN_NOT_VALID`:** treat as authentication failure; preserve data; re-authenticate; do not infer inactive/deleted status.
- **`USER_INACTIVE`:** purge all private operational data and local Booking Requests for that user, remove trusted offline identity, then return to Login/Public.
- **`USER_DELETED`:** same full user-level purge.
- **`CLUB_ACCESS_REVOKED` with `details.club_slug`:** purge only that user's affected Club scope, including its requests and Club-specific context; preserve other valid Club scopes.

Do not map every 401/403/404 or refresh failure to one generic purge.

Refresh-token consistency for explicit inactive/deleted/session codes is a Backend hardening dependency; frontend logic must use stable codes rather than SimpleJWT message text.

## 10. Central synchronization and cache policy

One central coordinator owns startup, reconnect, resume/visibility, bounded retry, manual refresh, auth recovery, request submission, Schedule, Bookings, Transactions, Current Custody, and reconnect summary. Pages must not create independent business-data online/offline/resume listeners.

Final target order:

```text
Resolve authentication and account state
→ process eligible local Booking Requests
→ Schedule
→ Bookings
→ Transactions
→ Current Custody
→ secondary refreshes
→ summary
```

One dataset failure must not destroy previous cache or block every independent later refresh. Same-scope work is single-flight. Scope changes prevent stale work from publishing into the newly visible user/Club context.

Existing bounded APIs are preferred. V1 does not require `/operational-snapshot`, `/finance-snapshot`, or similar giant endpoints. Avoid one request per slot, day, card, or employee when bounded range/list/grouped contracts exist.

Manual refresh synchronizes through the coordinator; it is not a browser reload. Cached UI remains visible. A failed refresh reports failure while retaining previous data.

## 11. Operational caches

### Schedule

- Synchronize Backend slots for today + the next 30 Egypt-local calendar days.
- Preserve authoritative slot objects, `slot_status`, `is_available`, recurrence eligibility/context, price context, and synchronized empty days.
- Never turn `RECURRING_RESERVED` into `FREE` because a related local entity is absent.
- Do not invalidate a previously synchronized still-relevant day merely because midnight passed.
- Staff is limited to the assigned Court. Other authorized roles remain limited to active Courts in the selected Club, with the currently viewed Court prioritized.
- Render cache-first. Distinguish cached slots, cached synchronized empty day, and no cache. No cache is not “no slots.”
- Booking lifecycle mutations refresh and persist authoritative Backend day data; do not locally patch slot business state.

### Bookings

- Cache approximately the previous seven Egypt-local calendar days plus current/future Booking list records referenced by cached Schedule.
- Every occupied cached Schedule slot must have enough Booking list context for a useful read-only offline Booking experience.
- Fetch every paginated page for a complete replacement. Do not commit partial pagination.
- Do not detail-fetch each Booking. Detail cache is lazy for lifecycle-only fields.
- Online Booking History remains server-backed for search, filters, and pagination. Offline filtering is restricted to complete cached authoritative fields.
- Offline Booking actions are read-only; no mutation queue.

### Transactions

- Cache approximately the previous seven Egypt-local calendar days.
- Fetch all paginated pages before atomic replacement.
- Online filtering and pagination remain server-backed. Offline search/filter/sort is limited to the complete bounded cached fields.
- Details may be cached lazily; do not N+1 fetch Booking context.
- All payment, refund, cancellation, and Settlement mutations require Internet and are never queued.

## 12. Financial truth and Current Custody

Period Financial Activity answers what happened during a selected date range. Current Custody answers how much unsettled money is with an employee now. They are separate query/state domains.

Current Custody is the Backend-authoritative, all-time signed state of currently unsettled, non-cancelled Transactions in the requested Backend scope. It must not be derived from Dashboard dates, Transaction History, the seven-day cache, payment-method filters, Settlement History, last Settlement, or any loaded page.

For the same Club, employee, explicit Court scope, and point in time, Staff `عهدتي`, Owner/Manager money management, grouped summary, Settlement Preview before intervening mutation, Settlement result, and offline snapshot must agree.

Management defaults to `كل الملاعب`; canonical All-Courts requests omit `court`. Never silently select `courts[0]`, send `court=0`, or use an accidental first-Court fallback. An explicit Court selection sends its ID; returning to All Courts removes the parameter.

Payment methods are a breakdown and do not redefine the primary custody total. Refund amounts and negative custody remain signed. Never use `Math.abs`, clamp, hide an employee, or recompute custody from PAYMENT/REFUND rows.

Presentation states:

- `transaction_count == 0`: `لا توجد مبالغ مستحقة للتسليم حاليًا`.
- `transaction_count > 0 && net_amount == 0`: `صافي المبلغ المستحق حاليًا: 0 ج.م`.
- `net_amount > 0`: `المبلغ المستحق للتسليم: X ج.م`.
- `net_amount < 0`: preserve the signed Backend value and use a neutral presentation until final Arabic copy is approved.

Offline Current Custody is the last successful Backend custody response for the exact user + Club + snapshot kind + collector + Court scope. It is not reconstructed from cached Transactions. Display freshness context and never present a missing snapshot as zero.

Owner/authorized Manager all-employee money uses one grouped Backend request, then loads one employee's Preview lazily. Do not issue one custody request per employee card.

### Mandatory financial acceptance dataset

Given unsettled PAYMENT +500, unsettled PAYMENT +900, signed REFUND -150, cancelled PAYMENT +300, and already-settled PAYMENT +400, Current Custody includes the first three only:

- `transaction_count = 3`
- `net_amount = 1,250 ج.م`

That Backend result remains 1,250 across Staff, Owner, Manager, Preview, and offline snapshot even if the bounded Transaction cache happens to sum to 750.

## 13. Settlement

Settlement follows:

```text
Current Custody summary
→ fresh Backend Preview
→ explicit confirmation
→ Backend Create re-evaluates and locks current candidates
→ success or structured race response
→ authoritative refetch
```

Preview is Backend truth for the review surface but is not a frozen client-side authority. Create sends only confirmed business identifiers and optional notes supported by the API. It must not send frontend totals, transaction IDs, periods, payment-method totals, or a locally selected candidate set.

Action availability follows Backend `can_approve`; role-based UX helpers do not replace this capability. On success, refetch Current Custody, employee summary, relevant Transactions, Preview/Settlement History as applicable. Never subtract the preview amount locally or mark candidate rows settled in client state.

Structured stale/candidate-changed errors such as `SETTLEMENT_CONFLICT` or `NO_UNSETTLED_TRANSACTIONS` trigger calm recovery and refresh of current Backend truth.

## 14. Booking and Transaction notes

Booking List cards display non-empty Backend list `booking.notes` directly, after the primary identity/status context, with secondary hierarchy and a one-to-two-line clamp. Full meaningful notes appear in Booking details. Blank notes render no Notes block.

Never fetch Booking Detail per list card to obtain notes. Booking Detail is reserved for lifecycle-specific fields when the UI actually needs them.

Transaction Detail displays full meaningful notes and omits the section when empty. Transaction list cards do not gain notes unless separately approved.

## 15. Audit as Business History

Audit is business history, not a developer log or database inspector. List cards answer what happened, who/what was affected, important business context, actor, and time. One Audit List response renders the cards; opening one card may make one Audit Detail request. No per-row User, Court, Booking, Transaction, Settlement, or recurrence enrichment is allowed.

Prefer event-time names and values. Respect Backend source semantics:

- `EVENT_SNAPSHOT`: highest historical confidence; display normally.
- `EXISTING_EVENT_DATA`: reliable event-carried data; display normally.
- `CURRENT_RELATION_FALLBACK`: current relation, not guaranteed historical identity; avoid claiming historical certainty.
- `UNAVAILABLE`: omit or show neutral unavailable copy; never fabricate.

Old rows may have partial summaries or missing names and must not crash. Human-readable Backend context takes precedence over numeric IDs. Recurrence is Booking-native metadata; do not restore `RecurringAgreement` UI/API concepts.

## 16. Phone, Schedule tone, and mobile operation

Customer phone remains required for Booking. The UI may accept familiar Egyptian local input but must normalize the persisted/submitted value to Backend E.164 form such as `+201012345678`; Backend remains final validator.

The canonical customer label is `رقم الموبايل` and placeholder is `01X XXX XXXX`. The placeholder is muted example text, never a value or realistic full number.

Morning and Evening Schedule distinction belongs to the period container/header:

- Morning: warm, light, cream/daylight.
- Evening: deeper, calm, blue-gray/night-like.

Slot button colors continue to represent business status in both periods.

Editable controls remain at least 16px on touch/coarse-pointer devices, including tablet widths and installed PWA. Pinch zoom remains enabled. Do not use `user-scalable=no`, `maximum-scale=1`, or JavaScript zoom workarounds. Tappable-control optimization must not break scrolling or accessibility.

## 17. Logout, offboarding, and Backend membership contact

Explicit logout with unresolved device-only requests must warn how many requests have not reached Sloty and offer return or destructive logout-and-clear. Cleanup finishes before auth/session and selected Club are released. Session expiry is not explicit logout and does not delete local work.

Backend `ClubMembership.last_sync_at` is a separate informational concept: the last known Sloty contact for that employee/membership in that Club. Owner/Manager UI may show `آخر اتصال معروف للموظف كان من 4 ساعات` when the field exists. It is not proof that all local requests or devices synchronized, that no unsent work exists, or that deletion is safe. V1 has no per-device management architecture.

The Current Custody offboarding blocker applies specifically to operational STAFF membership deactivation/removal:

- positive `net_amount` blocks;
- negative `net_amount` blocks;
- zero `net_amount` does not block merely because `transaction_count > 0`;
- no candidates does not block.

Use Backend `MEMBERSHIP_CURRENT_CUSTODY_NOT_SETTLED` and returned details as authority. Do not calculate this condition from Transactions. OWNER/MANAGER lifecycle follows separate existing Backend authorization and business rules.

When Staff prerequisites pass, show the warning that access will cease and device-only unsent requests will be deleted after server contact; require explicit acknowledgement before the destructive action, in addition to Backend permission.

## 18. Backend contract readiness

Approved as ready for frontend integration:

- Booking create, HTTP 201 create, and HTTP 200 idempotent replay;
- `client_request_id` uniqueness per Club and `BOOKING_CLIENT_REQUEST_MISMATCH`;
- `BOOKING_SLOT_UNAVAILABLE`, `RECURRING_UNAVAILABLE`, and `VALIDATION_ERROR` field errors;
- Schedule range fields including recurrence eligibility/context;
- Booking List date range, Court scope, pagination, notes, and operational list context;
- sanitized public availability;
- access-token account-state codes including `SESSION_EXPIRED`, `TOKEN_NOT_VALID`, `USER_INACTIVE`, `USER_DELETED`, and `CLUB_ACCESS_REVOKED`;
- grouped Current Custody, `can_approve`, Settlement Preview/Create, and STAFF custody blocker;
- Audit List summary, Audit Detail, and snapshot-source labels.

Remaining Backend hardening/dependencies:

1. `ClubMembership.last_sync_at` field for informational Owner/Manager UI.
2. Consistent explicit account-state codes during refresh-token flows.
3. Concurrent same-UUID Booking-create `IntegrityError` fallback and coverage.

These do not justify frontend business-logic workarounds or giant APIs.

## 19. Implementation sequence

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

Each task must audit current local code first, preserve already-correct behavior, and keep its PR boundary narrow. Audit tasks verify integration; they do not create a second implementation track.

## 20. Combined acceptance and release gate

The refactor is complete only when all of the following are demonstrated:

- A previously verified employee can cold-open installed Sloty without Internet after process termination/reboot, reach only their authorized private cache, and continue local request work within freshness rules.
- An anonymous user never receives private cached operational data.
- Local request success occurs only after durable IndexedDB commit, survives restart/reboot, and preserves its stable `client_request_id`.
- Eligible past/current/future, one-time/recurring requests automatically synchronize only after authentication; technical failures remain pending; business failures map to the approved review reasons; stale `SYNCING` recovers; dismissed requests never submit.
- Historical Booking and recurrence use Backend validation and current pricing rules without frontend recurrence/pricing calculation.
- Schedule remains a faithful 31-day Backend snapshot; failed refreshes preserve prior completed data.
- Booking cache covers the seven-day history plus enough referenced current/future context; Transaction cache is bounded and read-only; partial pagination never replaces a complete cache.
- Current Custody is identical across equivalent scopes, independent of period analytics, signed, All-Courts by default, and never reconstructed from Transactions.
- Settlement uses fresh Backend Preview/Create, Backend `can_approve`, structured race recovery, and authoritative post-mutation refetch.
- Booking notes and Audit Business History render from list/event-time Backend data without per-row enrichment.
- Public availability exposes only sanitized availability concepts.
- Phone normalization, touch typography, pinch zoom, and Schedule period tone meet the mobile rules.
- Logout warns before deleting device-only work; explicit user/Club revocation purges exactly the Backend-revoked scope; STAFF offboarding uses Backend custody truth and acknowledgement.
- IndexedDB migrations preserve critical requests; user/Club isolation holds; PWA assets and prompted updates survive offline operation safely.
- Existing online Schedule, Booking, recurrence, Transaction, Settlement, reporting, permissions, filters, navigation, and responsive behavior do not regress.

Automated tests must cover the machine-verifiable contracts. Physical reboot, browser storage eviction, iOS/Android installed-PWA behavior, offline asset rendering, reconnect races against a real Backend, and Safari focus zoom remain real-device QA requirements.

## Final direction

Backend decides business truth; Frontend consumes it.

Offline Sloty remembers customer intent; authenticated Online Sloty commits it.

Use the existing Sloty application and bounded Backend APIs. Do not create parallel product architecture or frontend substitutes for Backend truth.
