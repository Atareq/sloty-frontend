# Guest Public Schedule Agent Guide (`src/features/publicSchedule/`)

This document governs the unauthenticated Guest Public Schedule feature (`/public/:clubSlug/courts/:courtId/schedule`) in `src/features/publicSchedule/`.
For the detailed architectural specification, consult [`docs/features/public-schedule.md`](../../../docs/features/public-schedule.md).

---

## 1. Feature Responsibilities & Architectural Identity
## 1. Feature Responsibilities & Identity

- **Same Schedule Product / Experience:** Public Schedule and Authenticated Schedule deliver the same canonical Sloty schedule visual design, layout language, and branding.
- **Same Schedule Experience:** Delivers the identical Sloty visual design, brand palette, and schedule layout.
- **Separate Orchestration & Data Contracts:**
  - Public Schedule is rendered by standalone `PublicSchedulePage` outside `AppShell`.
  - Rendered by standalone `PublicSchedulePage` outside `AppShell`.
  - Driven by the sanitized public availability endpoint.
  - **Zero Dexie / Offline Sync Coupling:** Must **never** read or write to `sloty_local_db` or register with `OfflineSyncCoordinator`.
  - **Zero Dexie / Offline Sync Coupling:** Never reads or writes to `sloty_local_db` or registers with `OfflineSyncCoordinator`.
  - **Zero Business Mutations:** Guests cannot create bookings, holds, payments, or cancellations.

---

## 2. Truly Anonymous Requests

- Public requests must pass `omitAuth: true` and `skipAuthRefresh: true` to `apiRequest()`.
- Must **never** send an `Authorization: Bearer <token>` header, even if an access token exists in browser storage.
- Must **never** trigger token-refresh attempts or session-expired dialogs on HTTP 401/403 responses.

---

## 3. Sanitized Availability & Privacy Rules

1. **Sanitized States Only:**
   - **`AVAILABLE` → `متاح`:** Clickable slot. Highlights with an attention ring and displays localized booking instructions.
   - **`AVAILABLE` → `متاح`:** Clickable slot. Highlights and displays booking/contact instructions.
   - **`UNAVAILABLE` → `غير متاح`:** Disabled, non-clickable card.
2. **Public HOLD & Private State Boundary:**
   - Backend-blocked and private operational states are represented through the sanitized public availability contract only.
   - The public frontend receives only `AVAILABLE` (`متاح`) or `UNAVAILABLE` (`غير متاح`) and never inspects or renders internal booking statuses.
   - Operational `HOLD` (waiting for deposit) is required to surface publicly as `UNAVAILABLE` (`غير متاح`).
2. **Public HOLD Boundary:**
   - Operational `HOLD` (waiting for deposit) surfaces publicly as `UNAVAILABLE` (`غير متاح`).
   - The public frontend receives only `AVAILABLE` or `UNAVAILABLE` and never inspects internal booking statuses.
3. **Absolute Privacy:**
   - The public view must **never** receive, parse, or display customer names, phone numbers, notes, prices, deposits, payment statuses, or internal booking IDs.
   - The public view never receives, parses, or displays customer names, phone numbers, notes, prices, deposits, payment statuses, or internal booking IDs.

---

## 4. Bounded 32-Day Date Navigation

- Restricts date navigation strictly to **today through today + 31 days** (32 days total).
- Navigating to past dates or dates beyond 31 days in the future is prevented by the UI and route guards.
- Restricts date navigation strictly to **today - 1 through today + 30 inclusive** (32 Egypt-local dates total).
- Navigating to dates before yesterday (`today - 1`) or beyond 30 days in the future (`today + 30`) is prevented by the UI and route guards.
- Restricts date navigation strictly to a 32-day window.
- Navigating to past dates or dates beyond the 32-day window is prevented by the UI and route guards.

---

## 5. Share Experience & Login Affordance

1. **Share Action (`مشاركة الجدول`):**
   - Single canonical public schedule URL builder: `buildCourtScheduleShareUrl({ clubSlug, courtId, origin? })`.
   - **Invariant:** `copiedUrl === sharedUrl === qrEncodedValue` (exact string equality).
   - QR generation owns only encoding and presentation (`generateQrSvg` using `qrcode`); it never constructs or derives URLs.
   - Uses `navigator.share` on supported platforms, falling back to clipboard copy (`navigator.clipboard.writeText`) on desktop/unsupported environments.
   - Clipboard fallback provides instant button feedback (`✓ تم النسخ`) and displays the canonical confirmation notice:
     ```text
     تم نسخ رابط الجدول
     الرابط جاهز للمشاركة مع اللاعبين.
     ```
2. **Guest Header Actions & Login Affordance:**
   - **Mobile Layout:** Unauthenticated visitors see the compact `LogIn` icon button and compact `Share2` icon button (`mobileIconOnly`) placed together at the top-left (`endAction` in RTL `PageHeader`).
   - **Responsive Enhancement:** On tablet and desktop viewports (`sm:`), both actions expand to display their full Arabic labels (`تسجيل الدخول` and `مشاركة الجدول`).
   - **Slot Click Guidance:** Clicking an available slot on public schedule opens the `PublicScheduleVisitorPopup` (`AppSheet` modal/dialog) with exact Arabic guidance for players and staff. It does not open the booking flow, does not redirect, does not trigger login button highlights, and strictly preserves the user's scroll and schedule position. There is **zero booking flow** on guest public schedule.
   - **Isolation Boundary:** Authenticated schedule retains its standalone share button with full text and never adopts guest compact icon styling.
   - **Login Page Affordance (`/login`):**
     - Matches the locked copy for unauthenticated visitors returning to public schedule:
       ```text
       مش من فريق العمل في الملعب؟
       تقدر تدخل كزائر وتشوف المواعيد المتاحة فقط.
       المتابعة كزائر
       ```
     - Tapping `المتابعة كزائر` returns the guest to the public court schedule.

---

## 6. Search Indexing (SEO)

- Public schedule pages are `noindex` in Phase 1 via `publicScheduleSeo` (`publicSchedule.seo.ts`), declared on the route in `src/app/router.tsx`.
- Never set `document.title` or head tags from this feature; SEO is owned by `src/core/seo` (see [`docs/seo.md`](../../../docs/seo.md)).
- Do not make these pages indexable or add them to the sitemap without the Club/Court SEO phase described in `docs/seo.md`.

Detailed architectural specification: [`docs/public-schedule-architecture.md`](../../../docs/public-schedule-architecture.md).
Detailed architectural specification: [`docs/features/public-schedule.md`](../../../docs/features/public-schedule.md).
