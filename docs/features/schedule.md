# Operational Schedule Feature (`/schedule`)

The Operational Schedule is the authenticated home workspace (`الرئيسية`) for club owners, administrators, and staff. It renders the live court slot board, manages date/court navigation, and serves as the launchpad for all booking lifecycle actions.

---

## 1. Responsibilities & Layout

- **Page Component:** `SchedulePage` (`src/features/schedule/SchedulePage/SchedulePage.tsx`).
- **Date Navigation:** Integrated `AppDateNavigator` featuring a rolling 7-day strip and quick calendar picker.
- **Court Selection:** Controlled via `canChooseOperationalCourt(role, accessibleCourts)`. Rendered when more than one court is accessible to the user.
- **Slot Board:** Daily court slots split into two visual containers:
  - **AM Container (`مواعيد الصباح`):** Slots starting before 12:00 noon.
  - **PM Container (`مواعيد المساء`):** Slots starting at or after 12:00 noon.
- **Operational Closing Section:** Displays `حجوزات تحتاج إغلاق` for today only (maximum 3 items requiring closeout, excluding `FREE` slots).
- **Public Schedule Share:** Injects `مشاركة الجدول` into `PageHeader` top-left action area for the currently viewed court.

---

## 2. FE-038 Dual-Fetch Lifecycle Rules

The operational schedule uses a **cache-first, background-revalidate** model:

1. **Cache-First != Cache-Only:**
   - For dates within the 31-day bounded window, read `schedule_days` from Dexie first and render cached slots immediately without blocking UI.
   - A foreground network request executes concurrently to pull authoritative real-time slots from the server.
2. **Calendar-Day Extended Query Filter:**
   - In `buildBookingSlotsPath`, the query filter automatically extends the start date to **one calendar day before the requested date**:
     ```ts
     date_from = getPreviousCalendarDate(requestedDate)
     date_to = requestedDate
     ```
   - This ensures slots spanning midnight or timezone boundaries are fetched reliably from the backend contract.
   - The UI continues to filter and render slots matching the user's selected date.
3. **Race Condition Protection:**
   - Active `AbortController` aborts previous in-flight network requests when the user changes dates or switches courts.
   - Out-of-order server responses are discarded; stale responses must never overwrite newer user selections.
4. **Authoritative Post-Mutation Refetch:**
   - After every mutation (booking creation, payment, cancellation, completion, no-show, reschedule, recurrence stop), the fresh day is refetched directly from the server.
   - The server response updates the Dexie cache.
   - Statuses and slot positions are never optimistically mutated or faked locally.

---

## 3. Slot Card Presentation & Interaction

### Visual Design
- **Compact Slot Buttons:** Display start time, human-readable status, and an optional `↻` recurrence indicator.
- **Privacy & Simplicity:** Slot buttons never render customer names, phone numbers, notes, or monetary amounts.
- **Visual Distinction:** Distinct styling for `FREE`, `HOLD`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`, and `RECURRING_RESERVED`.

### Click Action Routing
- **When Offline (`isOfflineLike`):**
  - All interactive slot clicks are intercepted.
  - Displays the read-only notice: mutations cannot be committed offline.
- **When Online:**
  - `FREE` (with `is_available: true`): Opens `AddBookingSheet`.
  - `HOLD`: Opens `BookingActionSheet` (primary action: deposit confirmation).
  - `CONFIRMED`: Opens `BookingActionSheet` (primary action: collect balance or closeout).
  - `COMPLETED` / `CANCELLED` / `NO_SHOW` / `EXPIRED`: Opens `BookingActionSheet` for inspection.
  - `RECURRING_RESERVED`: Opens `VirtualRecurringSlotDetailsSheet` (virtual slot; anchor booking is never treated as a concrete booking row).
  - `UNAVAILABLE`: Disabled and non-clickable.

---

## 4. Public Schedule Sharing

- **Share Action:** Renders in `PageHeader` top-left action area via `PageHeaderAction`.
- **Target URL:** Shares the canonical guest public schedule URL:
  ```text
  /public/:clubSlug/courts/:courtId/schedule
  ```
- **Rules:**
  - Must **never** share authenticated `/schedule`.
  - Uses `navigator.share` on supported mobile devices.
  - Falls back to clipboard copy (`navigator.clipboard.writeText`) on desktop/unsupported browsers with instant feedback toast (`تم نسخ رابط الجدول`).

