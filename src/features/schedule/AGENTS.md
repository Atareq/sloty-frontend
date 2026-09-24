# Schedule Feature Agent Guide (`src/features/schedule/`)

This document governs the operational Schedule workspace (`/schedule`) in `src/features/schedule/`.
For the detailed architectural specification, consult [`docs/features/schedule.md`](../../../docs/features/schedule.md).

---

## 1. Feature Responsibilities

- **`SchedulePage`:** The authenticated Home workspace (`الرئيسية`).
- **Slot Board:** Renders daily court slots split into morning (`مواعيد الصباح`) and evening (`مواعيد المساء`) containers.
- **Date Navigation:** Integrates `AppDateNavigator` for rolling 7-day strip and calendar picker navigation.
- **Action Workflows:** Hosts `AddBookingSheet`, `BookingActionSheet`, and `VirtualRecurringSlotDetailsSheet`.
- **Customer phone:** `AddBookingSheet`, `EditBookingDetailsSheet`, and `BookingRequestCustomerEditSheet` use `SlotyPhoneNumberInput` with shared `validatePhoneNumber()` / `getPhoneValidationMessage()`. Do not add sheet-local phone regexes or hardcoded phone errors.
- **Booking player identity:** Phone-based player results are suggestions only and must not replace a name already entered. Name suggestions are limited to the entered phone; the name field stays free-form and does not search all customers. `AddBookingSheet` and `EditBookingDetailsSheet` submit the final entered name and phone without a frontend-selected player ID; identity matching and player/name history belong to the backend. Booking PATCH sends `{ customer_name, customer_phone, notes }` only.

# Backend-Owned Slot Interaction

Schedule slots returned by the backend remain rendered and interactive regardless of their calendar date. FREE slots use only the backend `is_available` field; occupied and recurring-reserved statuses remain interactive according to the backend slot status. Do not add local date or `booking.start_time > now` gates before opening a slot or sending a booking mutation.

# Backend-Owned Booking Date Validity

`AddBookingSheet` and `RescheduleBookingSheet` must not reject a booking or reschedule date because it is past, today, future, or different from the browser date. Render slots returned by the backend and send the selected `start_time` / `end_time`; the backend owns date validity, working hours, and final availability. Local date comparisons may support non-blocking schedule presentation such as the closing section, but must not prevent a booking mutation from reaching the API.
- **Operational Closing:** Renders `حجوزات تحتاج إغلاق` for today only (max 3 items, excluding `FREE` slots).
- **Public Schedule Share:** Injects `مشاركة الجدول` into `PageHeader` top-left action area for the viewed Court.
- **Online recurring reject:** `RECURRING_UNAVAILABLE` on create shows a ~5s amber floating warning (`AppSuccessNotice` tone=`warning`) and keeps `AddBookingSheet` open. Do **not** route this online case into `طلبات حجز محتاجة مراجعة`.

---

## 2. FE-038 Dual-Fetch Lifecycle Rules

1. **Cache-First != Cache-Only:**
   - For dates within the 31-day bounded window, read `schedule_days` from Dexie first and render cached slots immediately.
   - A foreground request to `clubs/{club_slug}/bookings/slots/?court={courtId}&date={YYYY-MM-DD}` **always** executes to pull authoritative real-time slots.
   - A foreground request to `clubs/{club_slug}/bookings/slots/?court={courtId}&date_from={YYYY-MM-DD-minus-1}&date_to={YYYY-MM-DD}` **always** executes to pull authoritative real-time slots (the shared request builder extends the request filter by one calendar day before the requested date).
2. **Race Condition & Stale Response Protection:**
   - Maintain request IDs / abort signals when the user switches dates or courts.
   - Out-of-order server responses must be discarded; stale responses must **never** overwrite newer user selections.
   - A foreground request via `buildBookingSlotsPath` always executes concurrently to pull authoritative real-time slots.
   - The query filter automatically extends the start date by one calendar day before the requested date (`date_from = date - 1`, `date_to = date`).
2. **Race Condition Protection:**
   - Maintain active `AbortController` when switching dates or courts.
   - Out-of-order server responses are discarded; stale responses must never overwrite newer user selections.
3. **Post-Mutation Authoritative Refetch:**
   - After any mutation (booking creation, payment, cancel, complete, no-show, reschedule, recurrence stop), refetch authoritative slots from the backend.
   - Persist the fresh day to IndexedDB if within the 31-day window.
   - Never fake status changes (e.g. mutating HOLD to CONFIRMED or moving slots locally).
   - Never mutate slot status or position optimistically.

---

## 3. Scoping & Permissions
## 3. Scoping & Court Selection

- **Staff Users:**
  - Strictly locked to `selectedMembership.court`.
  - Must **never** see a Court selector on Schedule.
- **Owner & Manager Users:**
  - Render an accessible Court selector above the date navigator.
  - Changing the Court selection cancels prior in-flight day requests and loads the new court's slots.
- Court selection is governed by `canChooseOperationalCourt(role, accessibleCourts)`.
- If the authenticated user has access to more than one court, render the court selector above the date strip.
- Changing the selected court aborts in-flight requests and fetches the new court's slots.

---

## 4. Slot Board & Presentation Rules

1. **AM / PM Split:**
   - AM (< 12:00 noon): Warm daylight surface (`مواعيد الصباح`).
   - PM (≥ 12:00 noon): Calm night surface (`مواعيد المساء`).
   - AM (< 12:00 noon): `مواعيد الصباح`.
   - PM (≥ 12:00 noon): `مواعيد المساء`.
2. **Compact Slot Buttons:**
   - Buttons show **start time**, **human status**, and an optional **`↻` recurrence icon**.
   - **NEVER** render customer names, phone numbers, notes, or money amounts on slot buttons.
3. **Slot Click Actions:**
   - `FREE`: Opens `AddBookingSheet` (or offline Booking Request sheet if offline).
   - `HOLD`: Opens HOLD action sheet (payment or cancel). Does **not** open `AddBookingSheet`.
   - `CONFIRMED` / `COMPLETED` / `NO_SHOW`: Opens canonical `BookingActionSheet`.
   - `RECURRING_RESERVED`: Opens `VirtualRecurringSlotDetailsSheet`. Never treat the anchor booking as the occurrence.
   - Buttons show start time, human status, and optional `↻` recurrence indicator.
   - Never render customer names, phone numbers, notes, or money amounts on slot buttons.
3. **Click Action Routing:**
   - If offline (`isOfflineLike`): all slot clicks show read-only feedback; mutations are blocked.
   - Occupied slots (`HOLD` / `CONFIRMED` / `COMPLETED` / `CANCELLED` / `NO_SHOW`) and `RECURRING_RESERVED` open details according to the backend status, without a frontend calendar-date gate.
   - `FREE` & `is_available`: Opens `AddBookingSheet`.
   - `UNAVAILABLE`: Disabled, non-clickable.

---

## 5. Header Actions (Share Public Schedule)
## 5. Share Public Schedule

- Owner, Manager, and Staff may share the **canonical public URL** for the currently viewed Court:
  ```text
  /public/:clubSlug/courts/:courtId/schedule
  ```
- **Placement:** Must render in the **`PageHeader` top-left action slot** via `PageHeaderAction`.
- **Overlay boundary:** `ShareCourtScheduleSheet` is portaled to `document.body` so the full-screen backdrop/dialog cannot be clipped by the `PageHeader` overflow and stacking context.
- **Implementation & Invariants:**
  - Must **never** share authenticated `/schedule`.
  - Uses the currently viewed/selected Court already owned by `SchedulePage`.
  - Implements native sharing via `navigator.share` on supported platforms, falling back to clipboard copy (`navigator.clipboard.writeText`) on desktop/unsupported environments.
  - Clipboard fallback provides instant button feedback (`✓ تم النسخ`) and displays the canonical confirmation notice:
    ```text
    تم نسخ رابط الجدول
    الرابط جاهز للمشاركة مع اللاعبين.
    ```
- Action renders in `PageHeader` top-left action slot via `PageHeaderAction`.
- Shares the canonical guest public URL: `/public/:clubSlug/courts/:courtId/schedule`.
- Never shares authenticated `/schedule`.
- Uses `navigator.share` on supported platforms, falling back to clipboard copy with confirmation toast.

Detailed architectural specification: [`docs/schedule-architecture.md`](../../../docs/schedule-architecture.md).
Detailed architectural specification: [`docs/features/schedule.md`](../../../docs/features/schedule.md).
