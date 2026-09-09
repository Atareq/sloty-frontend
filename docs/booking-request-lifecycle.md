# Sloty Booking Request Lifecycle & Synchronization Specification

This document is the canonical architectural specification for the lifecycle, states, automated synchronization, and idempotency of offline **Booking Requests** in Sloty frontend.

---

## 1. Conceptual Model: Booking Request vs. Booking

A **Booking Request** (`BookingRequestRecord`) represents local customer intent captured while the client is offline or the backend is temporarily unreachable.

```text
Local Customer Intent (Booking Request)
        ≠
Authoritative Backend Reservation (Booking)
```

### Essential Invariants:
1. **No Hold or Reservation Guarantee:**
   Saving a Booking Request does **not** create a backend booking, hold, reservation, or payment obligation. The slot is not reserved on the server until the request is synchronized and processed by the backend.
2. **Accurate User Feedback:**
   Upon saving a request offline, the UI must display:
   ```text
   تم حفظ طلب الحجز
   بانتظار التأكيد
   ```
   It must **never** display `تم الحجز` or booking confirmation copy until the backend returns HTTP 200/201.
3. **Data Model Identity:**
   - Physical IndexedDB store: `booking_intents` (retained for non-destructive migration safety).
   - Canonical TypeScript interface: `BookingRequestRecord` (in `src/offline/types.ts`).
   - `local_id`: Device-local IndexedDB primary key. **Must never** be sent to the backend as a booking ID.
   - `client_request_id`: Stable UUID idempotency key generated on the client.

---

## 2. Canonical Normal Synchronization Lifecycle

The normal automated synchronization lifecycle proceeds as follows:

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

### State Transitions & Meanings:

| State | Arabic Display Copy | Role in Lifecycle | Meaning & Permitted Actions |
| :--- | :--- | :--- | :--- |
| `PENDING_SYNC` | `بانتظار التأكيد` | Initial / Retry state | Request is waiting for backend sync. Eligible for automated coordinator submission. Can be edited or dismissed by the user. |
| `SYNCING` | `جاري التأكيد...` | Active processing | Request is actively being submitted to the backend. User actions (edit, dismiss, choose alternative) are temporarily disabled. |
| `BOOKED` | `تم الحجز بنجاح` | Authoritative success | Backend accepted the request (HTTP 201) or recognized an idempotent replay (HTTP 200). Stores `resolved_booking_id`. Terminal state; removed from active operational queue. |
| `NEEDS_REVIEW` | `يحتاج مراجعة` | Business rejection | Backend rejected creation due to a domain rule (slot taken, invalid data, recurrence conflict). Requires explicit user action based on `review_reason`. |
| `DISMISSED` | `تم الإلغاء` | User resolution | User dismissed the request (either from `PENDING_SYNC` or `NEEDS_REVIEW`). If linked to a backend `BookingAttempt`, calls backend attempt dismiss API. Terminal state. |
| `EXPIRED` | `منتهي` | Legacy compatibility | Retained **only** for legacy/backward compatibility or a future explicitly approved lifecycle reason. **Appointment time passing alone must NOT produce `EXPIRED`.** |

---

## 3. Needs Review Reasons & User Resolution Paths

When the backend rejects a creation attempt with a business error, the request transitions to `NEEDS_REVIEW` with an authoritative `review_reason`:

### 1. `SLOT_UNAVAILABLE` (Backend: `BOOKING_SLOT_UNAVAILABLE`)
- **Cause:** Another booking or hold took the slot before this request reached the backend.
- **Available User Actions:**
  1. **Choose Alternative Slot:** User selects another available slot from refreshed backend `FREE` slots. Generates a **new** `client_request_id` and resets to `PENDING_SYNC`.
  2. **Dismiss:** Dismisses the request locally and dismisses the backend attempt.

### 2. `INVALID_CUSTOMER_DATA` (Backend: `VALIDATION_ERROR` on customer fields)
- **Cause:** Customer name, phone number, or notes failed backend validation rules.
- **Available User Actions:**
  1. **Edit Customer Details:** User corrects name, phone, or notes. Preserves `local_id` and slot details, generates a **new** `client_request_id`, and resets to `PENDING_SYNC`.
  2. **Dismiss:** Dismisses the request.

### 3. `RECURRING_UNAVAILABLE` (Backend: `RECURRING_UNAVAILABLE`)
- **Cause:** The selected initial slot was free, but future weekly occurrences conflict with existing bookings.
- **Available User Actions:**
  1. **Convert to One-Time Booking:** Converts `requested_recurring` to `false`, generates a **new** `client_request_id`, and resets to `PENDING_SYNC`.
  2. **Choose Alternative Slot:** Picks a slot that supports recurrence.
  3. **Dismiss:** Dismisses the request.

---

## 4. Client Idempotency (`client_request_id`) Rules

`client_request_id` is a stable UUID generated client-side to ensure network retries never produce duplicate bookings:

```typescript
// Initial creation
const request: BookingRequestRecord = {
  local_id: generateLocalId(),
  client_request_id: crypto.randomUUID(), // Stable idempotency key
  status: 'PENDING_SYNC',
  court_id: court.id,
  customer_name: form.name,
  customer_phone: form.phone,
  start_time: slot.start_time,
  end_time: slot.end_time,
  requested_recurring: Boolean(form.is_recurring),
  // ...
};
```

### Idempotency Invariants:
1. **Technical Retries Preserve Key:**
   If a submission fails due to network drop, timeout, server 5xx error, app restart, or session re-authentication, the retry **must use the exact same `client_request_id`**.
2. **User Modifications Generate New Key:**
   If the user edits customer details, chooses a different slot, or converts a recurring request to one-time, it represents a **new logical business intent**. The system **must generate a fresh `client_request_id` UUID** while preserving `local_id`.
3. **Replay Acceptance:**
   Backend returning HTTP 200 with an existing booking (idempotent replay) is treated as success, transitioning the request to `BOOKED` with the matching `resolved_booking_id`.
4. **Mismatch Conflict:**
   Backend returning HTTP 409 `BOOKING_CLIENT_REQUEST_MISMATCH` stops automated retry without generating a new key, flagging an integrity conflict for investigation.

---

## 5. Automated Background Synchronization (`bookingRequestSync.ts`)

Booking Request synchronization is owned by `src/offline/bookings/bookingRequestSync.ts` and executed by the `OfflineSyncCoordinator`:

### Execution Sequence:
1. **Top Coordinator Priority:**
   Runs **first** in the sync lifecycle, before Schedule, Bookings, Transactions, and Custody refresh.
2. **Eligibility Filter:**
   Selects requests matching current `scope_key` where status is:
   - `PENDING_SYNC`
   - Stale `SYNCING` (last attempted > 60 seconds ago without resolution)
3. **Pre-Flight Persistence:**
   Before dispatching the HTTP POST, updates the local record to `SYNCING` with `last_attempt_at = now()`.
4. **Payload Contract:**
   Submits only clean customer intent fields to `POST /api/v1/clubs/{club_slug}/bookings/`:
   ```json
   {
     "court": 12,
     "customer_name": "أحمد محمود",
     "customer_phone": "+201012345678",
     "start_time": "2026-09-10T18:00:00+02:00",
     "end_time": "2026-09-10T19:00:00+02:00",
     "notes": "حجز مسائي",
     "is_recurring": false,
     "client_request_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
   }
   ```
   Local prices, slot snapshots, and generated occurrence series are **never** included in the payload.

---

## 6. Backend Attempts Traceability (`BookingAttempt`)

- Authenticated creation attempts that reach the backend create a historical `BookingAttempt` record.
- When an attempt is rejected, the backend returns an attempt ID. Sloty stores this in `record.attempt_id`.
- **Dismissal Traceability:** When a user dismisses a local request that has an `attempt_id`, the client calls:
  ```http
  POST /api/v1/clubs/{club_slug}/booking-attempts/{attempt_id}/dismiss/
  ```
  This keeps staff audit logs and attempt histories consistent between client and server.

