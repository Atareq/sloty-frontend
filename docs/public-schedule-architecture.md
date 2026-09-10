# Sloty Guest Public Schedule Architecture

This document is the canonical architectural specification for the unauthenticated Guest Public Schedule (`/public/:clubSlug/courts/:courtId/schedule`) in Sloty frontend.

---

## 1. Product Role & Orchestration Architecture

- **Same Schedule Product / Experience:**
  Public Schedule delivers the exact same visual branding, color system, and schedule experience as the authenticated operational Schedule. It is **not** a separate product or a separate product experience.
- **Separate Orchestration & Data Contracts:**
  - Rendered by standalone `PublicSchedulePage` under `src/features/publicSchedule/`.
  - Lives outside `AppShell` and protected routes.
  - **Zero Dexie / Offline Sync Coupling:** Public Schedule does not interact with IndexedDB (`sloty_local_db`), does not store cached snapshots, and does not register with the `OfflineSyncCoordinator`.
  - **Zero Business Mutation Operations:** Guests cannot create bookings, holds, payments, or cancellations.

```text
Same Schedule PRODUCT / EXPERIENCE
different orchestration surfaces and data contracts
        │
        ├── Guest
        │    ├── PublicSchedulePage (standalone)
        │    ├── Sanitized anonymous public API
        │    ├── Read-only availability
        │    │      AVAILABLE   → متاح
        │    │      UNAVAILABLE → غير متاح
        │    ├── No booking actions
        │    ├── No private customer data
        │    ├── No Dexie / offline sync
        │    └── No operational mutations
        │
        └── Staff / Owner
             ├── Authenticated SchedulePage
             ├── Protected AppShell
             ├── Operational booking-slots API
             ├── Dexie + sync coordinator
             └── Full booking/payment/recurrence operations
```

---

## 2. Anonymous API Contract & Request Isolation

Public availability data is fetched from the deliberate backend endpoint:
```http
GET /api/v1/public/clubs/{club_slug}/courts/{court_id}/availability/?date=YYYY-MM-DD
```

### Non-Negotiable Network Invariants:
1. **No Authorization Header (`omitAuth: true`):**
   `apiRequest()` must be invoked with `omitAuth: true`. It must **never** send an `Authorization: Bearer <token>` header, even if a valid staff or admin JWT exists in `localStorage`.
2. **No Token Refresh (`skipAuthRefresh: true`):**
   Public availability requests must **never** trigger JWT token refresh attempts or session-expired alerts on HTTP 401/403 responses.
3. **Dedicated Wrapper:**
   Public network calls are encapsulated in `src/features/publicSchedule/publicScheduleApi.ts`. Feature code must not use authenticated API wrappers for public availability.

---

## 3. Sanitized Availability States & Strict Privacy

The public API returns sanitized availability slots to protect customer privacy and operational security.

### Response Representation:
```typescript
interface PublicCourtAvailabilitySlot {
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  is_available: boolean;
  status: 'AVAILABLE' | 'UNAVAILABLE';
interface PublicAvailabilitySlot {
  start_time: string
  end_time: string
  availability: 'AVAILABLE' | 'UNAVAILABLE'
}
```

### Visual & Interactive States:
- **`AVAILABLE` → `متاح`:**
  Rendered as an active, clickable card. Clicking highlights the slot with an attention ring and surfaces an informational card explaining how to book (e.g. contacting the club) or offering an affordance to log in if the user is staff.
  - Click shows Staff-only informational notice
  - Login attention hint
  - No Booking form
  - No public booking/contact flow
- **`UNAVAILABLE` → `غير متاح`:**
  Rendered as a muted, disabled card. Unclickable.
  - Disabled/non-clickable

### Public HOLD & Private State Boundary:
- **Sanitized Backend Availability:** Backend-blocked and private operational states are represented through the sanitized public availability contract only.
- The public frontend receives only `AVAILABLE` (`متاح`) or `UNAVAILABLE` (`غير متاح`) and **never** inspects or renders internal booking statuses.
- **Operational `HOLD` (waiting for deposit) is required to surface publicly as `UNAVAILABLE` (`غير متاح`).**
- **Absolute Privacy:** The public view **never** receives, parses, or displays customer names, phone numbers, booking notes, prices, deposit requirements, payment statuses, or internal booking IDs.

---

## 4. Bounded 32-Day Date Navigation

Guest date navigation is strictly bounded:
- **Date Window:** Today through today + 31 days (32 days total).
Guest date navigation is strictly bounded to 32 Egypt-local calendar dates:
- **Date Window:** `today - 1` through `today + 30` inclusive.
- **Navigation Controls:** Uses a customized `AppDateNavigator` constrained to the 32-day window.
- **Boundary Guards:**
  - Navigating to dates before today is disabled.
  - Navigating to dates beyond 31 days in the future is disabled.
  - Manual URL manipulation to out-of-bounds dates redirects or resets to today.
  - Navigating to dates before `today - 1` is disabled.
  - Navigating to dates beyond `today + 30` is disabled.
  - Manual URL manipulation to out-of-bounds dates resets or redirects inside the valid 32-day window.

---

## 5. Public Header & Share Experience

Public Schedule renders a lightweight, branded header with two primary actions:

1. **`مشاركة الجدول` (Share):**
   - Implements native sharing via `navigator.share` on mobile/supported platforms, falling back to clipboard copy (`navigator.clipboard.writeText`) on desktop/unsupported environments.
   - Clipboard fallback provides temporary visual button feedback (`✓ تم النسخ`) and displays the canonical confirmation notice:
     ```text
     تم نسخ رابط الجدول
     الرابط جاهز للمشاركة مع اللاعبين.
     ```
2. **`تسجيل الدخول` (Login):**
   - Directs club staff to `/login`, preserving the current public URL as the return location state (`from`).
   - Directs club staff to `/login`, preserving the current public URL as the return location state (`guestReturnTo`).

---

## 6. Login Page Guest Affordance

To prevent guests or players who landed on the login page from getting trapped, `LoginPage` renders a dedicated guest affordance:
To prevent guests or players who landed on the login page from getting trapped, `LoginPage` renders a dedicated guest affordance when arriving from a verified public court schedule:

### Locked Copy:
```text
مش من فريق العمل في الملعب؟
تقدر تدخل كزائر وتشوف المواعيد المتاحة فقط.

المتابعة كزائر
```

### Navigation Behavior:
- Tapping **`المتابعة كزائر`** navigates the user back to the previously viewed Public Schedule URL if preserved in route state.
- If no previous public URL exists in history, it directs them to a safe fallback or club landing.
- When arriving from a valid Public Schedule origin, `guestReturnTo` is preserved in navigation state (`isValidGuestReturnRoute`). Tapping **`المتابعة كزائر`** navigates back to that exact Public Schedule URL.
- **Direct `/login` with no valid Public Schedule origin:**
  - Guest block hidden
  - No fallback Court
  - No club landing
  - No invented public destination
