# Guest Public Schedule Agent Guide (`src/features/publicSchedule/`)

This document governs the unauthenticated Guest Public Schedule feature (`/public/:clubSlug/courts/:courtId/schedule`) in `src/features/publicSchedule/`.

---

## 1. Feature Responsibilities & Architectural Identity

- **Same Schedule Product / Experience:** Public Schedule and Authenticated Schedule deliver the same canonical Sloty schedule visual design, layout language, and branding.
- **Separate Orchestration & Data Contracts:**
  - Public Schedule is rendered by standalone `PublicSchedulePage` outside `AppShell`.
  - Driven by the sanitized public availability endpoint.
  - **Zero Dexie / Offline Sync Coupling:** Must **never** read or write to `sloty_local_db` or register with `OfflineSyncCoordinator`.
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
   - **`UNAVAILABLE` → `غير متاح`:** Disabled, non-clickable card.
2. **Public HOLD & Private State Boundary:**
   - Backend-blocked and private operational states are represented through the sanitized public availability contract only.
   - The public frontend receives only `AVAILABLE` (`متاح`) or `UNAVAILABLE` (`غير متاح`) and never inspects or renders internal booking statuses.
   - Operational `HOLD` (waiting for deposit) is required to surface publicly as `UNAVAILABLE` (`غير متاح`).
3. **Absolute Privacy:**
   - The public view must **never** receive, parse, or display customer names, phone numbers, notes, prices, deposits, payment statuses, or internal booking IDs.

---

## 4. Bounded 32-Day Date Navigation

- Restricts date navigation strictly to **today through today + 31 days** (32 days total).
- Navigating to past dates or dates beyond 31 days in the future is prevented by the UI and route guards.
- Restricts date navigation strictly to **today - 1 through today + 30 inclusive** (32 Egypt-local dates total).
- Navigating to dates before yesterday (`today - 1`) or beyond 30 days in the future (`today + 30`) is prevented by the UI and route guards.

---

## 5. Share Experience & Login Affordance

1. **Share Action (`مشاركة الجدول`):**
   - Uses `navigator.share` on supported platforms, falling back to clipboard copy (`navigator.clipboard.writeText`) on desktop/unsupported environments.
   - Clipboard fallback provides instant button feedback (`✓ تم النسخ`) and displays the canonical confirmation notice:
     ```text
     تم نسخ رابط الجدول
     الرابط جاهز للمشاركة مع اللاعبين.
     ```
2. **Login Affordance on `/login`:**
   - Matches the exact locked copy:
     ```text
     مش من فريق العمل في الملعب؟
     تقدر تدخل كزائر وتشوف المواعيد المتاحة فقط.

     المتابعة كزائر
     ```
   - Tapping `المتابعة كزائر` returns the guest to the public court schedule.

Detailed architectural specification: [`docs/public-schedule-architecture.md`](../../../docs/public-schedule-architecture.md).
