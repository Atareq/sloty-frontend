# Durable Domain Invariants

This document outlines the core business domain rules and invariants enforced on the Sloty frontend.
The backend remains the authoritative source of truth for business logic, permissions, and data constraints.

---

## 1. Bookings

### Lifecycle & Statuses
- **`HOLD`:** Slot reserved pending initial deposit. Blocks other reservations on that slot until deposit is recorded or hold expires.
- **`CONFIRMED`:** Valid booking with payment recorded (meets minimum deposit).
- **`COMPLETED`:** Service rendered. Locked from operational edits, cancellations, and reschedules.
- **`CANCELLED`:** Booking cancelled. Releases the time slot. Requires cancellation reason. Informational refund preview is verified by backend at cancellation time.
- **`NO_SHOW`:** Customer did not arrive. Releases or marks slot as inactive.
- **`EXPIRED`:** Unconfirmed `HOLD` whose start time arrived or internal hold expiry duration elapsed. Releases slot.

### Availability Slots Grid Statuses
On the operational schedule, slots carry backend availability states:
- `FREE`: Slot is open for reservation.
- `UNAVAILABLE`: Court is closed, inactive, or slot is not open.
- `RECURRING_RESERVED`: Protected occurrence of an active weekly recurrence.
- `HOLD`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`, `EXPIRED`: Mirror active booking states.

### Schedule Slot Interaction
- Slots returned by the backend remain rendered and interactive regardless of their calendar date.
- FREE slot interaction follows only the backend `is_available` field; occupied and recurring-reserved interaction follows the backend slot status.
- Do not use local date comparisons or `start_time > now` to hide or disable a returned slot before contacting the backend.

### Booking Date Validity
- The backend is the sole authority for whether a create or reschedule datetime is allowed (working hours, availability, operational restrictions).
- The frontend must not reject a mutation because the date is past, today, future, or different from the browser clock.
- FREE slot clickability on the board still follows backend `is_available`. Displaying only slots returned by the slots API is not date-eligibility validation.

### Recurrence
- Weekly recurrence is created via `is_recurring: true`.
- Recurrence conflicts are evaluated by the backend; frontend never calculates recurring occurrence conflicts.
- Stopping recurrence via `endBookingRecurrence()` stops future weeks while preserving historical and current booking records.

---

## 2. Transactions & Financial Ledger

### Immutable Ledger
- Transactions form an append-only, immutable ledger.
- Existing transactions cannot be edited or hard-deleted.
- Correction is performed exclusively via void/cancellation (`cancelTransaction()`) with an explicit reason.
- Settled transactions cannot be voided.

### Payment Methods
Supported methods:
- `CASH`: Cash on-premise.
- `INSTAPAY`: Electronic transfer via InstaPay (requires digital payment reference if court policy demands it).
- `E_WALLET`: Mobile electronic wallet (Vodafone Cash, Orange Money, etc.).

### Financial Calculations
- Total Price is locked at booking agreed price snapshot.
- Paid Amount = sum of active, non-voided transactions.
- Remaining Amount = `total_price - paid_amount`.
- Frontend displays backend-calculated money amounts and never computes ad-hoc financial ledger math.

---

## 3. Settlements & Current Custody

### Current Custody
- Current custody represents unclosed cash collected by employees (`collected_by`).
- Employee Custody view (`عهدتي`): Scoped to the individual collector's unsettled transactions.
- Club-wide Custody view: Available to `ADMIN` and `OWNER` for all collectors.
- Custody values (`net_amount`, `transaction_count`, `totals_by_payment_method`) come directly from backend snapshots. The frontend never computes custody by reducing local transaction lists.

### Settlement Workflow
- Settle action creates a permanent settlement batch locking all included transactions.
- After a settlement or payment mutation, financial state is invalidated across mounted finance surfaces via the current-financial-state signal.

---

## 4. Courts, Working Hours, & Pricing

### Court Settings
- `slot_duration_minutes`: Slot grid duration interval (typically 60 minutes).
- `minimum_deposit`: Minimum first payment required to confirm a booking or retained on late cancellation.
- `requires_digital_payment_reference`: Policy flag enforcing references for InstaPay and E-wallet payments.

### Pricing Rules
- **Pricing Authority:** The Backend is the sole financial authority for booking totals, slot prices, deposits, and remaining balances. Working Hours pricing periods (`pricing_periods`) are the configuration source edited by operators.
- **Read-Only Court Summaries:** `pricing_configured`, `minimum_slot_price`, and `maximum_slot_price` are legitimate read-only summaries exposed on Court responses for informational presentation only. The frontend renders them (single price, price range, or unconfigured state) but never uses them to calculate booking totals, slot prices, or financial values.
- **No Legacy Pricing Fields:** The frontend strictly ignores `default_price`, and never serializes `opens_at`, `closes_at`, `is_closed`, or `default_price` in write payloads.
- **Closed Day Representation:** `pricing_periods: []` represents a closed day.
- **Pricing Periods Are Opening Windows:** Pricing periods define independent open/priced half-open `[start, end)` intervals aligned to `slot_duration_minutes`. Gaps between periods are valid closed time: the backend generates no slots there and rejects bookings in them. Adjacent periods (`01:00–05:00` + `05:00–09:00`) are valid; overlapping or duplicate periods are invalid. The frontend never sends synthetic gap rows and never generates slots locally.
- **Weekday Contract:** `weekday` uses the backend Saturday-first index: `0` = Saturday, `1` = Sunday, `2` = Monday, `3` = Tuesday, `4` = Wednesday, `5` = Thursday, `6` = Friday (`courtWorkingHours.helpers.ts`).
- **Midnight Semantic:** End time `00:00` represents next-day midnight (`24:00`). Intervals ending at `00:00` belong to the operational start date. Cross-midnight periods (for example `23:00–01:00`) are valid and are resolved by the backend as timezone-aware local datetimes on one operational timeline. A `00:00` start time is the beginning of its operational day; it is not moved to the next day.
- **Slot Booking Instants:** Booking create, offline Booking Requests, and reschedule send the selected slot's backend `start_time` / `end_time` exactly as returned (`getSlotBookingInterval()` in `scheduleBoard.helpers.ts`). Slot `date` is the operational day, not the calendar day of each bound, so the frontend never rebuilds instants from `date` + wall-clock time when the backend has provided them, and never rolls a wall-clock-only end forward on its own.

---

## 5. Players & Customer Identity

- Customer identity fields: `customer_name`, `customer_phone`.
- Booking create and PATCH send those intent fields only. The frontend never sends or stores `club_player_id` or `player_profile_id`.
- Player search is assistance only: selecting a suggestion fills name and phone. The backend resolves PlayerProfile → ClubPlayer.
- Invalid phone on PATCH is `VALIDATION_ERROR` (400, field errors on `customer_phone`). Missing phone without a ClubPlayer ID is `BOOKING_CUSTOMER_IDENTITY_INCOMPLETE` (400). There is no `PLAYER_CONFLICT` code. `BOOKING_CLUB_PLAYER_*` 409 codes apply only if a ClubPlayer ID is sent, which the frontend must not do.
- Phone input formats use the Egyptian mobile format with placeholder `01X XXX XXXX`.
- Player search displays backend club player suggestions in backend order. A phone lookup never replaces the name already entered; the operator changes it by choosing a suggestion or typing a name.
- Booking creation and booking edit send the final entered `customer_name` and `customer_phone`. The frontend does not send a ClubPlayer ID or PlayerProfile ID or resolve identity from suggestion order; the backend owns identity matching and player/name history.
- Player suggestion labels may show a last-used name. Treat it as editable input, not as the canonical current customer name.

---

## 6. Authentication & Session Identity

- **Separation of Account vs. Operational Identity:**
  - `userId`: Authentication account identity (`User.id`). Represents credentials, authentication state, JWT claims, user administration, and local Dexie offline storage scope partitioning.
  - `profileId`: Operational/business actor identity (`Profile.id`). Represents domain entity actors (`Transaction.created_by`, `Settlement.collected_by`, `Settlement.settled_by`).
  - **Not Interchangeable:** The frontend must never infer or alias `profileId = userId`. When comparing business actor ownership (e.g., whether staff can cancel their own transaction), `profileId` is the sole authoritative identifier. If `profile_id` is null or missing, the frontend treats the operational profile as absent rather than guessing or substituting `userId`.
- **Three Distinct Identity Domains (Never Mix):**
  - `User.id`: Authentication account identity. Represents credentials, authentication state, JWT claims, platform user administration, and local Dexie offline storage scope partitioning.
  - `Profile.id`: Operational/business actor identity. Represents domain entity actors across all operations.
  - `ClubPlayer.id`: Customer/player identity. Represents club players and booking customers.
- **Business Actors Always Reference Profile.id:**
  - `created_by`: Profile who created/collected the transaction, or created the booking.
  - `last_status_changed_by`: Profile who executed the booking status transition.
  - `cancelled_by`: Profile who cancelled the transaction or booking.
  - `collected_by`: Profile who collected the transactions under settlement.
  - `settled_by`: Profile who performed/confirmed the financial settlement.
  - `actor`: Profile who performed the audited event.
  - **Forbidden:** Never lookup these IDs through `/users/{id}` and never compare them with `currentUser.id` (`User.id`).
- **Settlement Meanings Remain Distinct:**
  - `settled_by`: The operator who reviewed and confirmed the settlement.
  - `collected_by`: The employee whose collections were settled.
  - These two actor concepts are distinct and never merged.
- **Display Priority & System Events:**
  - Always prefer backend-provided names (`created_by_name`, `collected_by_name`, `last_status_changed_by_name`, `actor_name`, `staff_name`).
  - If an actor ID is `null` (e.g. `{ last_status_changed_by: null, last_status_changed_by_name: "System (Automatic)" }` or `{ actor: null }`), display the backend-provided system label or handle as an automatic system event without inventing names or looking up `/users/`.
- **Not Interchangeable:** The frontend must never infer or alias `profileId = userId`. If `profile_id` is null or missing from `/api/v1/me/`, the frontend treats the operational profile as absent rather than guessing or substituting `userId`.

---

## 7. Collections & Pagination

- **All DRF list endpoints are paginated unless explicitly documented otherwise.**
- **No Array Assumption:** The frontend must never assume `const items = response.data` or that list endpoints return plain arrays. It must consume the canonical `PaginatedResponse<T>` shape (`{ count, next, previous, results }`) and extract results using the centralized helper `extractResults()`.
- **Centralized Pagination Helper:** `extractResults<T>(response)` safely handles both DRF paginated objects (`{ results: [...] }`) and legacy plain arrays, returning an empty array on empty or unexpected shapes.
- **Sequential Multi-Page Loading:** `fetchAllPages<T>(fetcher)` follows `next` URLs sequentially until `next` is `null`. It never appends an unapproved `page_size` parameter.
- **Backend Search Filtering First:** Searchable collections (clubs, courts, users, players) prefer backend query parameters (e.g. `?search=...`) rather than fetching all pages to filter locally on the client.
- **Authoritative Selection Restoration:**
  - Persisted club (`activeSlug`) and court (`persistedCourtId`) selections are authoritatively validated using direct retrieve endpoints (`GET /clubs/{club_slug}/` and `GET /clubs/{club_slug}/courts/{id}/`).
  - **200 OK:** Keep selection (O(1) verification; never depend on page 1 search or evict selections because they were absent from page 1).
  - **403 `CLUB_ACCESS_REVOKED` or 404 Not Found:** Clear selection.
  - **Network / Server Errors:** Preserve selection context to maintain recoverable offline state.

---

## 8. Offline Intent & Synchronization Architecture

- **Core Principle:** Offline records represent user intent. Only backend responses represent business truth.
- **Local Entity Classification:**
  - **Intent (`BookingRequestRecord` / `BookingIntentRecord`):** Stored in `booking_intents`. Represents "The user attempted to create a booking while offline." Has `action_type: 'CREATE_BOOKING'`, customer/slot payload, stable `client_request_id`, and initial status `PENDING_SYNC`. It is **never** a Booking and **never** carries `status: 'CONFIRMED'`.
  - **Authoritative Backend Entities (Read Cache):** `bookings` (`BookingCacheRecord`), `booking_details`, `schedule_days` (`ScheduleDayRecord`), `transactions` (`TransactionCacheRecord`), `transaction_details`, `current_custody_snapshots` (`CurrentCustodySnapshotRecord`). These represent authoritative snapshots accepted by the server.
  - **System Metadata:** `sync_metadata` (timestamps), `offline_context` (last verified identity hints).
- **Strict Offline Mutation Boundary:**
  - Offline is strictly read-only for operational actions.
  - Creating bookings via live API, recording payments (`RecordPaymentSheet`), transaction void/cancellation, settlements, booking status transitions (`CANCELLED`, `COMPLETED`, `NO_SHOW`, reschedules), and recurrence stops require active server connectivity and are never queued offline.
  - Saving a local Booking Request (`PENDING_SYNC`) from a cached `FREE` slot is the sole permitted offline write.
- **Sync Queue Contract & States:**
  - Queue items contain: `{ id, action_type, payload, created_at, retry_count, status }`.
  - Canonical Lifecycle:
    - `PENDING` (`PENDING_SYNC`): Stored locally, waiting for sync.
    - `SYNCING`: Currently being dispatched by `OfflineSyncCoordinator` (locked against concurrent modification).
    - `SYNCED` (`BOOKED`): Server accepted the intent (201 Created or 200 Idempotent Replay); `resolved_booking_id` recorded.
    - `NEEDS_REVIEW`: Server rejected with business reason (`SLOT_UNAVAILABLE`, `RECURRING_UNAVAILABLE`, `INVALID_CUSTOMER_DATA`). Requires operator review/action.
    - `FAILED`: Permanently non-retryable or dismissed item.
- **Duplicate Prevention via Stable Idempotency Key:**
  - Each intent generates a unique `client_request_id` UUID upon creation.
  - Technical retries (network timeouts, 502/503/504) reuse the **exact same** `client_request_id`.
  - The backend uses this ID to deduplicate requests and return the existing booking idempotently without double-booking.
- **Network Recovery & Queue Isolation:**
  - When connectivity returns, the queue processes pending items sequentially.
  - Each queue item is processed independently: a failure or conflict on one item never aborts or blocks subsequent items.
- **Zero Fake Optimistic State:**
  - The frontend never fabricates server states (e.g., setting `status: 'CONFIRMED'`, `is_available: false`, or marking payments paid) offline before backend approval.
