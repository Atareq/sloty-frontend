# Schedule Feature Agent Guide (`src/features/schedule/`)

This document governs the operational Schedule workspace (`/schedule`) in `src/features/schedule/`.

---

## 1. Feature Responsibilities

- **`SchedulePage`:** The authenticated Home workspace (`الرئيسية`).
- **Slot Board:** Renders daily court slots split into morning (`مواعيد الصباح`) and evening (`مواعيد المساء`) containers.
- **Date Navigation:** Integrates `AppDateNavigator` for rolling 7-day strip and calendar picker navigation.
- **Action Workflows:** Hosts `AddBookingSheet`, `BookingActionSheet`, and `VirtualRecurringSlotDetailsSheet`.
- **Operational Closing:** Renders `حجوزات تحتاج إغلاق` for today only (max 3 items).
- **Public Schedule Share:** Injects `مشاركة الجدول` into `PageHeader` top-left action area for the viewed Court.

---

## 2. FE-038 Dual-Fetch Lifecycle Rules

1. **Cache-First != Cache-Only:**
   - For dates within the 31-day bounded window, read `schedule_days` from Dexie first and render cached slots immediately.
   - A foreground request to `clubs/{club_slug}/bookings/slots/?court={courtId}&date={YYYY-MM-DD}` **always** executes to pull authoritative real-time slots.
2. **Race Condition & Stale Response Protection:**
   - Maintain request IDs / abort signals when the user switches dates or courts.
   - Out-of-order server responses must be discarded; stale responses must **never** overwrite newer user selections.
3. **Post-Mutation Authoritative Refetch:**
   - After any mutation (booking creation, payment, cancel, complete, no-show, reschedule, recurrence stop), refetch authoritative slots from the backend.
   - Persist the fresh day to IndexedDB if within the 31-day window.
   - Never fake status changes (e.g. mutating HOLD to CONFIRMED or moving slots locally).

---

## 3. Scoping & Permissions

- **Staff Users:**
  - Strictly locked to `selectedMembership.court`.
  - Must **never** see a Court selector on Schedule.
- **Owner & Manager Users:**
  - Render an accessible Court selector above the date navigator.
  - Changing the Court selection cancels prior in-flight day requests and loads the new court's slots.

---

## 4. Slot Board & Presentation Rules

1. **AM / PM Split:**
   - AM (< 12:00 noon): Warm daylight surface (`مواعيد الصباح`).
   - PM (≥ 12:00 noon): Calm night surface (`مواعيد المساء`).
2. **Compact Slot Buttons:**
   - Buttons show **start time**, **human status**, and an optional **`↻` recurrence icon**.
   - **NEVER** render customer names, phone numbers, notes, or money amounts on slot buttons.
3. **Slot Click Actions:**
   - `FREE`: Opens `AddBookingSheet` (or offline Booking Request sheet if offline).
   - `HOLD`: Opens HOLD action sheet (payment or cancel). Does **not** open `AddBookingSheet`.
   - `CONFIRMED` / `COMPLETED` / `NO_SHOW`: Opens canonical `BookingActionSheet`.
   - `RECURRING_RESERVED`: Opens `VirtualRecurringSlotDetailsSheet`. Never treat the anchor booking as the occurrence.
   - `UNAVAILABLE`: Disabled, non-clickable.

---

## 5. Header Actions (Share Public Schedule)

- Owner, Manager, and Staff may share the **canonical public URL** for the currently viewed Court:
  ```text
  /public/:clubSlug/courts/:courtId/schedule
  ```
- **Placement:** Must render in the **`PageHeader` top-left action slot** via `PageHeaderAction`.
- **Implementation & Invariants:**
  - Must **never** share authenticated `/schedule`.
  - Uses the currently viewed/selected Court already owned by `SchedulePage`.
  - Implements native sharing via `navigator.share` on supported platforms, falling back to clipboard copy (`navigator.clipboard.writeText`) on desktop/unsupported environments.
  - Clipboard fallback provides instant button feedback (`✓ تم النسخ`) and displays the canonical confirmation notice:
    ```text
    تم نسخ رابط الجدول
    الرابط جاهز للمشاركة مع اللاعبين.
    ```

Detailed architectural specification: [`docs/schedule-architecture.md`](../../../docs/schedule-architecture.md).
