# Guest Public Schedule Feature (`/public/.../schedule`)

The Guest Public Schedule provides an unauthenticated, sanitized view of court availability for players and guests at `/public/:clubSlug/courts/:courtId/schedule`.

---

## 1. Product Identity & Architectural Separation

- **Same Schedule Product / Experience:** Public Schedule delivers the identical visual design, brand palette, and layout language as the authenticated operational Schedule.
- **Separate Orchestration & Data Contracts:**
  - Rendered by standalone `PublicSchedulePage` outside `AppShell`.
  - Driven exclusively by the sanitized public availability endpoint.
  - **Zero Dexie / Offline Sync Coupling:** Never reads or writes to `sloty_local_db` or interacts with `OfflineSyncCoordinator`.
  - **Zero Business Mutation Operations:** Guests cannot create bookings, holds, payments, or cancellations.

---

## 2. Anonymous Network Contract

Public availability is fetched via:
```http
GET /api/v1/public/clubs/{club_slug}/courts/{court_id}/availability/?date=YYYY-MM-DD
```

### Network Invariants
1. **No Authorization Header (`omitAuth: true`):**
   `apiRequest()` must never attach an `Authorization: Bearer <token>` header, even if an authenticated token exists in browser storage.
2. **No Token Refresh (`skipAuthRefresh: true`):**
   Public requests must never trigger JWT token refresh attempts or session-expiry modals on 401/403 responses.
3. **Dedicated Wrapper:**
   Calls are encapsulated in `src/features/publicSchedule/publicScheduleApi.ts`.

---

## 3. Sanitized Availability & Privacy Boundary

### Availability States
- **`AVAILABLE` → `متاح`:** Active card. Clicking highlights the slot and displays booking/contact instructions or a login affordance for staff.
- **`UNAVAILABLE` → `غير متاح`:** Muted, disabled card. Non-clickable.

### Public HOLD & Operational Invariants
- Operational `HOLD` (awaiting deposit) surfaces publicly as `UNAVAILABLE` (`غير متاح`).
- The public frontend receives only `AVAILABLE` or `UNAVAILABLE` and never inspects internal booking statuses.
- **Absolute Customer Privacy:** Public payloads never contain, and public UI never renders, customer names, phone numbers, booking notes, prices, deposit amounts, payment statuses, or internal booking IDs.

---

## 4. Date Window & Share Experience

### Bounded 32-Day Navigation
- Navigation is strictly restricted to a 32-day window.
- Navigating to past dates or dates beyond the bounded range is blocked by the UI and route guards.

### Share Experience
- `PageHeaderAction` provides a `مشاركة الجدول` button.
- `PageHeaderAction` provides a single `مشاركة الجدول` button.
- **Canonical Public Share URL (`buildCourtScheduleShareUrl`):** Single source of truth for constructing public court schedule URLs (`/public/:clubSlug/courts/:courtId/schedule`).
- **Exact URL Equality Invariant:**
  ```text
  copiedUrl === sharedUrl === qrEncodedValue
  ```
  The exact same URL string is supplied to clipboard copy, native Web Share, and QR generation.
- **QR Architecture & Presentation:**
  - QR generation owns only encoding and presentation (`generateQrSvg` using `qrcode`); it never constructs or derives URLs.
  - Generates scanner-safe black-on-white SVG with quiet zone margin >= 4 and error correction level 'M'.
  - Branded QR Card presentation wraps the QR code with Sloty branding, court name, and helper copy without altering the QR matrix.
- Uses `navigator.share` on supported mobile devices.
- Falls back to clipboard copy (`navigator.clipboard.writeText`) on desktop/unsupported browsers with toast feedback:
  ```text
  تم نسخ رابط الجدول
  الرابط جاهز للمشاركة مع اللاعبين.
  ```

### Staff Login Affordance
- Public schedule offers a clear bridge for staff members to access the operational schedule:
  ```text
  مش من فريق العمل في الملعب؟
  تقدر تدخل كزائر وتشوف المواعيد المتاحة فقط.
  المتابعة كزائر
  ```

