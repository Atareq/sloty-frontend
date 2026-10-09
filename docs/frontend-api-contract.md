# Sloty Frontend API Contract Matrix

This document provides the definitive inventory of backend APIs consumed by the Sloty React frontend, mapped directly to the authoritative Django REST Framework viewsets, URL routers, and serializers from `sloty-backend`.

The frontend must consume **only confirmed backend capabilities**:
- **No invented endpoints.**
- **No guessed payloads.**
- **No duplicated backend behavior.**

---

## 1. Core Division of Responsibilities

```text
Frontend Responsibility:
  Collect User Intent + Render Presentation + Local Resilience + User Feedback

Backend Responsibility:
  Business Rules + Availability + Pricing + Identity Resolution + Status Machine + Financial Truth
```

---

## 2. API Contract Inventory Matrix

| Feature Domain | Endpoint URL (`apiEndpoints`) | Method | Confirmed? | Request Payload | Response DTO | Pagination / Return |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `auth/token/` | `POST` | **YES** | `{ phone_number, password, club_slug? }` | `{ access, refresh }` | TokenPair |
| **Auth** | `auth/token/refresh/` | `POST` | **YES** | `{ refresh }` | `{ access, refresh }` | TokenPair |
| **Auth** | `auth/password/change/` | `POST` | **YES** | `{ current_password, new_password, new_password_confirmation }` | None (204) | `void` |
| **Auth** | `me/` | `GET` | **YES** | None | `CurrentUserProfile` | Object DTO |
| **Auth** | `me/` | `PATCH` | **YES** | `{ first_name?, last_name?, email? }` | `CurrentUserProfile` | Object DTO |
| **System** | `../system/version/` | `GET` | **YES** | None | `BackendVersion` | Object DTO |
| **Locations** | `egypt-locations/` | `GET` | **YES** | None | `{ governorates: EgyptGovernorate[] }` | Object DTO |
| **Clubs** | `clubs/` | `GET` | **YES** | Query: `search`, `page` | `Club` | `PaginatedResponse<Club>` |
| **Clubs** | `clubs/` | `POST` | **YES** | `ClubPayload` | `Club` | Object DTO |
| **Clubs** | `clubs/{id-or-slug}/` | `GET` | **YES** | None | `Club` | Object DTO |
| **Clubs** | `clubs/{id-or-slug}/` | `PATCH` | **YES** | `Partial<ClubPayload>` | `Club` | Object DTO |
| **Courts** | `clubs/{slug}/courts/` | `GET` | **YES** | Query: `search`, `is_active`, `page` | `Court` | `PaginatedResponse<Court>` |
| **Courts** | `clubs/{slug}/courts/` | `POST` | **YES** | `CourtPayload` | `Court` | Object DTO |
| **Courts** | `clubs/{slug}/courts/{id}/` | `GET` | **YES** | None | `Court` | Object DTO |
| **Courts** | `clubs/{slug}/courts/{id}/` | `PATCH` | **YES** | `Partial<CourtPayload>` | `Court` | Object DTO |
| **Court Images** | `clubs/{slug}/courts/{id}/images/` | `GET` | **APPROVED, PENDING DEPLOY** | None | `CourtImage` (`position` order; first = primary) | `CourtImage[]` (unpaginated) |
| **Court Images** | `clubs/{slug}/courts/{id}/images/` | `POST` | **APPROVED, PENDING DEPLOY** | `multipart/form-data` with one `image: File` field | `CourtImage` | Object DTO (201) |
| **Court Images** | `clubs/{slug}/courts/{id}/images/{courtImageId}/` | `DELETE` | **APPROVED, PENDING DEPLOY** | None | None (204) | `void` |
| **Working Hours** | `clubs/{slug}/courts/{id}/working-hours/` | `GET` | **YES** | None | `CourtWorkingHoursApiResponse` | Object DTO |
| **Working Hours** | `clubs/{slug}/courts/{id}/working-hours/` | `PUT` | **YES** | `UpdateCourtWorkingHoursPayload` | `CourtWorkingHoursApiResponse` | Object DTO |
| **Club Staff** | `clubs/{slug}/staff/` | `GET` | **YES** | Query: `search`, `is_active`, `page` | `ClubStaff` / `StaffDetail` | `PaginatedResponse<ClubUser>` |
| **Club Staff** | `clubs/{slug}/staff/` | `POST` | **YES** | `StaffCreateSerializer` | `StaffDetail` | Object DTO |
| **Club Staff** | `clubs/{slug}/staff/{profileId}/` | `GET` | **YES** | None | `StaffDetail` | Object DTO |
| **Club Staff** | `clubs/{slug}/staff/{profileId}/` | `PATCH` | **YES** | `StaffUpdateSerializer` | `StaffDetail` | Object DTO |
| **Club Staff** | `clubs/{slug}/staff/{profileId}/courts/` | `PUT` | **YES** | `{ court_ids: number[] }` | None (200) | `void` |
| **Players** | `clubs/{slug}/players/` | `GET` | **YES** | Query: `search`, `order_by`, `page`, `page_size` | `ClubPlayer` | `PaginatedResponse<ClubPlayer>` |
| **Bookings** | `clubs/{slug}/bookings/` | `GET` | **YES** | Query: `court`, `date`, `status`, `search`, etc. | `Booking` | `PaginatedResponse<Booking>` |
| **Bookings** | `clubs/{slug}/bookings/` | `POST` | **YES** | `BookingCreatePayload` | `BookingListItem` | Object DTO (201) |
| **Bookings** | `clubs/{slug}/bookings/slots/` | `GET` | **YES** | Query: `court`, `date` | `BookingSlotsResponse` | Object DTO |
| **Bookings** | `clubs/{slug}/bookings/{id}/` | `GET` | **YES** | None | `BookingListItem` | Object DTO |
| **Bookings** | `clubs/{slug}/bookings/{id}/` | `PATCH` | **YES** | `{ customer_name, customer_phone, notes }` | `BookingListItem` | Object DTO |
| **Bookings** | `clubs/{slug}/bookings/{id}/cancel/` | `POST` | **YES** | `{ reason?: string }` | `BookingListItem` | Object DTO |
| **Bookings** | `clubs/{slug}/bookings/{id}/cancellation-preview/` | `POST` | **YES** | None | `BookingCancellationPreview` | Object DTO |
| **Bookings** | `clubs/{slug}/bookings/{id}/complete/` | `POST` | **YES** | `{ continue_weekly_recurrence?: boolean }` | `BookingListItem` | Object DTO |
| **Bookings** | `clubs/{slug}/bookings/{id}/no-show/` | `POST` | **YES** | `{ reason?: string }` | `BookingListItem` | Object DTO |
| **Bookings** | `clubs/{slug}/bookings/{id}/reschedule/` | `POST` | **YES** | `{ start_time, end_time, court }` | `BookingListItem` | Object DTO |
| **Bookings** | `clubs/{slug}/bookings/{id}/end-recurrence/` | `POST` | **YES** | `{ reason?: string }` | `BookingListItem` | Object DTO |
| **Bookings** | `clubs/{slug}/bookings/{id}/recurrence-next/` | `GET` | **YES** | None | `BookingRecurrenceNextPreview` | Object DTO |
| **Booking Attempts** | `clubs/{slug}/booking-attempts/` | `GET` | **YES** | Query: `court`, `date`, `status`, `page` | `BookingAttempt` | `PaginatedResponse<BookingAttempt>` |
| **Booking Attempts** | `clubs/{slug}/booking-attempts/{id}/dismiss/` | `POST` | **YES** | `{}` | `BookingAttempt` | Object DTO |
| **Transactions** | `clubs/{slug}/transactions/` | `GET` | **YES** | Query: `booking`, `court`, `created_by`, `date`, `page` | `Transaction` | `PaginatedResponse<Transaction>` |
| **Transactions** | `clubs/{slug}/transactions/` | `POST` | **YES** | `TransactionCreatePayload` | `Transaction` | Object DTO (201) |
| **Transactions** | `clubs/{slug}/transactions/{id}/` | `GET` | **YES** | None | `Transaction` | Object DTO |
| **Transactions** | `clubs/{slug}/transactions/{id}/cancel/` | `POST` | **YES** | `{ reason: string }` | `Transaction` | Object DTO |
| **Transaction Attempts** | `clubs/{slug}/transaction-attempts/` | `GET` | **YES** | Query: `status`, `page` | `TransactionAttempt` | `PaginatedResponse<TransactionAttempt>` |
| **Transaction Attempts** | `clubs/{slug}/transaction-attempts/{id}/dismiss/` | `POST` | **YES** | `{}` | `TransactionAttempt` | Object DTO |
| **Settlements** | `clubs/{slug}/settlements/` | `GET` | **YES** | Query: `collected_by`, `settled_by`, `court`, `page` | `Settlement` | `PaginatedResponse<Settlement>` |
| **Settlements** | `clubs/{slug}/settlements/` | `POST` | **YES** | `{ collected_by, notes? }` | `Settlement` | Object DTO (201) |
| **Settlements** | `clubs/{slug}/settlements/{id}/` | `GET` | **YES** | None | `Settlement` | Object DTO |
| **Settlements** | `clubs/{slug}/settlements/preview/` | `GET` | **YES** | Query: `collected_by` | `SettlementPreview` | Object DTO |
| **Settlements** | `clubs/{slug}/settlements/unsettled-summary/` | `GET` | **YES** | Query: `court` | `CurrentCustodySummaryResponse` | Object DTO |
| **Dashboard** | `clubs/{slug}/dashboard/summary/` | `GET` | **YES** | Query: filters | `DashboardSummaryResponse` | Object DTO |
| **Audit Logs** | `clubs/{slug}/audit-logs/` | `GET` | **YES** | Query: `date_from`, `date_to`, `actor`, `action`, `page` | `AuditLogEntry` | `PaginatedResponse<AuditLogEntry>` |
| **Audit Logs** | `clubs/{slug}/audit-logs/{id}/` | `GET` | **YES** | None | `AuditLogDetail` | Object DTO |
| **Reports** | `clubs/{slug}/reports/court-usage/` | `GET` | **YES** | Query: date range, court, period, staff | `CourtUsageReport` | Object DTO |
| **Public Availability** | `public/clubs/{slug}/courts/{id}/availability/` | `GET` | **YES** | Anonymous (`omitAuth`) | `PublicCourtAvailabilityResponse` | Object DTO |
| **Public Court Discovery** | `public/courts/` | `GET` | **APPROVED, PENDING DEPLOY** | Anonymous (`omitAuth`); Query: `page` | `PublicCourtDiscoveryItemResponse` → mapped to `DiscoveryCourt` | `PaginatedResponse<PublicCourtDiscoveryItemResponse>` |
| **Public Court Search (Phase 2/3/4/5)** | `public/courts/search/` | `GET` | **APPROVED, PENDING DEPLOY** | Anonymous (`omitAuth`); Query: optional `court_id` (Phase 4), optional `date` (`YYYY-MM-DD`), optional `times` (`HH:MM,...`, up to 5), `page` | `PublicCourtDiscoveryItemResponse` (incl. `matching_times`) → mapped to `DiscoveryCourt` | `PaginatedResponse<PublicCourtDiscoveryItemResponse>` |
| **Platform Users** | `users/` | `GET` | **YES** | Admin/Owner scope | `PlatformUser` | `PaginatedResponse<PlatformUser>` |
| **Platform Users** | `users/{id}/` | `GET`, `PATCH` | **YES** | `{ is_active?, email?, first_name?, last_name?, phone_number? }` | `PlatformUser` | Object DTO |

### Court images (`صورة الملعب`)

- **Court create/update do not accept images.** `CourtCreateSerializer` / `CourtUpdateSerializer` have no `image` field (an extra multipart `image` would be silently dropped), and `Court` responses carry no image URL. Court `POST` / `PATCH` therefore stay JSON with `CourtPayload`.
- **Upload:** after the Court is saved, the Admin Court form (`CourtFormPage`) uploads a selected file with `POST clubs/{slug}/courts/{id}/images/` as `multipart/form-data` (`image` field only). `apiRequest()` passes `FormData` through without a manual `Content-Type`, so the browser writes the multipart boundary; JSON bodies are unchanged.
- **One primary image:** `replaceCourtPrimaryImage()` lists current images, uploads the new file, and only after a successful upload `DELETE`s the previous relations. A failed upload never removes the existing image. Without a new file, no image request is sent.
- **Preview:** edit mode shows the first image's Backend `thumbnail_url`. `CourtImage.image` exposes `display_url`, `thumbnail_url`, `width`, `height`. Backend owns processing (JPEG/PNG/WebP → WebP variants), storage, and public URLs; the frontend never builds storage URLs, keys, or bucket names.
- **Errors:** image validation and storage failures are top-level Backend codes (`IMAGE_UPLOAD_TOO_LARGE`, `IMAGE_DIMENSIONS_TOO_LARGE`, `IMAGE_STORAGE_UNAVAILABLE`, …) or an `image` field error; both are shown under `صورة الملعب`. If the Court saved but the image did not, create mode continues on the new Court's edit page so a retry cannot duplicate the Court.
- **Permissions:** Backend allows `ADMIN` / `OWNER` to upload and delete; `STAFF` may only read.

### Club phone in Admin Court management

- `phone_number` belongs to `Club`, never `Court`. The Admin Court create/edit form retrieves its parent with `GET clubs/{slug}/`, displays `رقم هاتف النادي`, and sends a changed value only through `PATCH clubs/{id}/` before the existing Court save. `CourtPayload` remains phone-free.

---

## 3. Unsupported / Invented Endpoints Removed

The following endpoints were previously assumed or defined in the frontend but **do not exist in the backend**:

1. `POST /api/v1/clubs/{slug}/settlements/{id}/mark-settled/`:
   - **Status**: **REMOVED (INVENTED)**
   - **Rationale**: Backend settlements are created via `POST /api/v1/clubs/{slug}/settlements/`. Upon creation, the settlement is final and locked. There is no `PENDING` settlement status in the backend and no `mark-settled` endpoint. Historical settlements are strictly read-only.
2. `GET /api/v1/clubs/{slug}/memberships/`:
   - **Status**: **REMOVED (INVENTED)**
   - **Rationale**: Club memberships are returned inside the `GET /api/v1/me/` DTO (`memberships: [...]`). No standalone list endpoint exists.
3. `GET /api/v1/clubs/{slug}/users/`:
   - **Status**: **REPLACED WITH `clubs/{slug}/staff/`**
   - **Rationale**: The backend owns staff management via `clubs/<slug>/staff/` (`StaffViewSet`). The route `clubs/{slug}/users/` was replaced with the canonical `clubs/{slug}/staff/`.

---

## 4. Blocked by Backend Contract

1. `POST /api/v1/users/` (Platform Admin Account Creation):
   - **Status**: **BLOCKED BY BACKEND CONTRACT**
   - **Rationale**: Backend `UserViewSet` allows only `('get', 'patch', 'head', 'options')`. There is no public or admin REST endpoint to create platform admin accounts. Platform admins must be provisioned via backend CLI (`manage.py createsuperuser` / seed scripts). The frontend method `createPlatformAdmin` is documented as blocked.

---

## 5. Non-Negotiable Contract Rules

1. **No Client-Side Financial Calculations**:
   - The frontend never calculates `total_price = price * duration` or `remaining_amount = total - paid`.
   - All financial amounts (`total_price`, `paid_amount`, `remaining_amount`, `next_total_price`, `total_amount`) are rendered directly from backend responses.
2. **No Client-Side Player Identity Matching**:
   - Booking create and PATCH send only intent: `customer_name` and `customer_phone`.
   - The frontend never sends `club_player_id` or `player_profile_id`, and never matches players across phone numbers. The backend resolves customer identity.
3. **Strict Separation of Identity Types**:
   - `User.id`: Authentication identity only (`currentUser.id`).
   - `Profile.id`: Operational actor identity (`currentProfileId`, `created_by`, `settled_by`, `collected_by`).
   - `ClubPlayer.id`: Customer version identity within a club.
   - Never compare `created_by === currentUser.id`. Always use `currentProfileId`.
4. **Pagination Contract**:
   - List responses from Django REST Framework are wrapped in `{ count, next, previous, results }`.
   - The frontend consumes `PaginatedResponse<T>` and uses `extractResults()` or `fetchAllPages()`. Never assume `response.data = []`.
5. **Booking PATCH identity + notes**:
   - Booking updates via `PATCH /clubs/{slug}/bookings/{id}/` send `{ customer_name, customer_phone, notes }`.
   - Never send `club_player_id`, `player_profile_id`, `court`, `start_time`, or `end_time` on this PATCH.
   - Identity resolution failures without a ClubPlayer ID are `BOOKING_CUSTOMER_IDENTITY_INCOMPLETE` (400) or field-level `VALIDATION_ERROR` (400) for invalid phones. There is no `PLAYER_CONFLICT` code.
6. **Schedule clickability vs booking detail:**
   - `/schedule` keeps backend-returned occupied slots interactive without a frontend calendar-date gate.
   - `GET /clubs/{slug}/bookings/{id}/` and the bookings list are not date-clamped. Historical records stay viewable outside the schedule board.
   - Clickability is not permission: edit, cancel, reschedule, and payments stay backend-controlled.
7. **Booking date validity is backend-owned**:
   - Create and reschedule send selected `start_time` / `end_time` without a frontend date-eligibility check.
   - Date rejections surface backend codes such as `BOOKING_OUTSIDE_WORKING_HOURS`, `BOOKING_SLOT_UNAVAILABLE`, and `VALIDATION_ERROR`. Do not recreate those rules locally.
