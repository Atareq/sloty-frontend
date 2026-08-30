# Frontend Current State

This file is a short implementation reference for the current Sloty React frontend.

Source-of-truth order:
- Current local working tree, including approved staged/unstaged UI changes
- Current source code
- `AGENTS.md`
- This file
- Older planning docs in `docs/`

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Vitest
- Testing Library

## Current Scope

- Frontend-only repository
- Arabic-first, RTL-first, mobile-first UI
- MVP 1 court-management scope only
- No player app
- No marketplace
- No online payment gateway
- No CS booking flow yet

## Current Implemented Modules

- Auth/login foundation
- Centralized API error handling with Arabic backend messages and field-error helpers
- `/me` current-user hydration
- Post-login club selection
- No-club-access page
- Platform admin clubs/courts setup
- Egypt location dropdowns for club address
- International phone input with E.164 payload submission
- Court working hours setup through nested per-court weekly API
- Premium in-app Schedule date navigation through `AppDateNavigator`
- Shared product dropdown foundation through `AppSelect`
- Club-user court settings for pricing and working-hours permissions
- Shared product vocabulary through `src/shared/copy/appCopy.ts`
- Virtual `RECURRING_RESERVED` Schedule details through `VirtualRecurringSlotDetailsSheet`
- Canonical booking details through `BookingActionSheet`
- Booking customer edit through `EditBookingDetailsSheet`
- Booking reschedule through `RescheduleBookingSheet`
- Virtual `RECURRING_RESERVED` Schedule details through `VirtualRecurringSlotDetailsSheet`
- Mobile Home affordance in `PageHeader` (hidden on `/schedule`, which is `الرئيسية`)
- Mobile `NewBookingFAB` on `/dashboard` and `/bookings` only; Home/Schedule hides it
- Silent access-token refresh in `apiRequest` with a single in-flight refresh
- Live search through `LiveSearchField` + results-only refresh
- Shared success feedback through `AppSuccessNotice`
- Booking Board read-only slots
- Manual booking creation
- Booking details cancel / complete / no-show actions
- Sprint 4 payment recording from confirmed booking details
- Sprint 5 booking lifecycle foundation from confirmed booking details
- Customer edit and non-active-recurring reschedule through dedicated secondary sheets
- Sprint 6 settlement foundation with preview, create, history, and detail pages
- Transaction cancel payment foundation
- Basic transactions API/list foundation
- Installable standalone PWA foundation with a generated manifest, static app-shell Service Worker, Chromium install prompt, iOS Add-to-Home-Screen instructions, and prompt-based updates
- Connectivity and synchronization coordinator foundation with one authenticated lifecycle owner, browser online/offline hints, resume/manual/retry triggers, scope-safe single-flight runs, and dataset-level result isolation
- Offline read-only Schedule, recent Booking History, and recent Transactions resilience through scoped IndexedDB snapshots

See also:
- `docs/product-ux-pattern.md`
- `docs/product-copy.md`
- `docs/interaction-patterns.md`

## Routing Highlights

- `/login`
- `/select-club`
- `/no-club-access`
- `/dashboard`
- `/schedule`
- `/bookings`
- `/transactions`
- `/reports`
- `/audit-logs`
- `/settings`
- `/settings/users`
- `/settings/courts`
- `/settings/courts/:courtId`
- `/settlements`
- `/settlements/history`
- `/settlements/preview`
- `/settlements/:settlementId`
- `/admin/clubs`
- `/admin/clubs/:clubSlug/courts`
- `/admin/users`
- `/admin/settings` (intentional unfinished Platform Admin placeholder)

## `/me` Club Selection Flow

- `/me` is the post-login source of authenticated user context.
- `/me` memberships are confirmed and used for club-selection UX.
- Manager permissions are read from the selected membership, not the club object.
- Persist only `selectedClubSlug`.
- `0` memberships and not platform admin: `/no-club-access`
- `1` membership: auto-select its club slug, then enter `/schedule`
- `2+` memberships: `/select-club` unless a valid stored selection already exists
- Platform admin: can access `/admin/clubs` without `selectedClubSlug`
- Backend remains the source of truth for permissions

## API Error Handling

- `apiRequest` sends `Accept-Language: ar` by default while preserving explicit caller headers.
- Backend localized `message`, stable `code`, `field_errors`, `details`, and `request_id` are preserved by `ApiClientError`.
- UI logic uses code/status/field names rather than parsing message text. Known business codes map centrally to Egyptian-Arabic product copy, while unknown codes keep the existing safe fallback behavior.

## UI Rules

- Authenticated pages receive the shared `PageHeader` from `AppShell`; feature pages must not render a second page header. The shell header keeps the original `.sloty-green-surface` visual in the transient page-context region. That context fades/blurs on window scroll and then disappears; only Burger and Home remain as a compact sticky navigation layer. Non-Home pages expose a visible `الرئيسية` Home affordance to `/schedule`.
- Feature-specific page buttons use the shared layout-only `PageActions` component when they need to sit below the shell header.
- Product-facing dropdowns use shared `AppSelect` instead of native browser select menus.
- Categorical filters remain `AppSelect`; Boolean operational inclusion conditions use checkboxes, with shared `FilterCheckboxGroup` available for related Boolean state choices.
- Active filter chips are fully clickable removable buttons, not nested icon-only controls.
- Schedule uses the shell `PageHeader` as its only page identity header. Its primary local flow is the authorized Court selector when applicable, `اختار اليوم` with `AppDateNavigator`, then `اختار المعاد` and the Court board; summary and closing sections follow the slot-selection workspace.
- Schedule `حجوزات تحتاج إغلاق` is a local today-only group of HOLD/CONFIRMED bookings that still need payment or a complete/no-show decision. `NO_SHOW` and `COMPLETED` are omitted even with remaining money. `EXPIRED` stays out of this group and may still appear in History `تحتاج إجراء`.
- An explicit date selection keeps loading local to the slots area and scrolls once to `اختار المعاد` only after that date's slot request settles. Initial load and Court changes do not auto-scroll.
- Schedule slot cards show only start time, human status, and a small top-right `↻` for existing recurring bookings, FREE slots where `can_start_recurring: true`, or backend `RECURRING_RESERVED`. Customer, phone, notes, price, and payment values remain outside the cards. `RECURRING_RESERVED` uses the ordinary reserved/محجوز presentation and opens `VirtualRecurringSlotDetailsSheet` from the selected slot plus `recurring_context`. Never fetch the anchor Booking as the selected occurrence.
- Add Booking uses one optional `ثبّت نفس الموعد كل أسبوع` checkbox and one confirmation action. It sends that choice directly as `is_recurring`. When the backend marks a free slot ineligible, the checkbox is disabled and `recurring_blocked_reason` plus `first_recurring_conflict_start` become human Arabic context; no frontend conflict calculation or alternate start is offered. The existing availability request still validates before creation.
- Successful normal and recurring creation close Add Booking, refresh the selected Court/date slots, and use the same short `تم حجز الموعد بنجاح` feedback. `BOOKING_SLOT_UNAVAILABLE` keeps the scoped Schedule context, refreshes slots, and shows product Arabic rather than raw HTTP text.
- Schedule booked slots, Schedule closing rows, and Booking History cards reuse one canonical `BookingActionSheet`, including HOLD; the source page does not alter the state-driven action hierarchy.
- Booking details lead with customer/phone and appointment identity, then a simple Egyptian-Arabic state and the backend money fields. The visible primary CTA is `سجّل العربون وأكّد الحجز` for HOLD, `حصّل X ج.م` for a positive balance, or both `إكمال` and `عدم حضور` for an ended fully-paid confirmed booking; remaining valid alternatives sit under `••• خيارات أخرى` with `إلغاء الحجز` last and danger-styled.
- Secondary booking actions include `تعديل بيانات الحجز` (HOLD/CONFIRMED customer PATCH) and `تغيير الموعد` (non-active-recurring HOLD/CONFIRMED reschedule). Do not combine those into one edit screen. Active recurring reschedule stays hidden.
- Booking details use `إلغاء الحجز`, contain no backend-roadmap text, and show recurring context as `↻ حجز أسبوعي`. Strictly active recurrence shows an inline `إيقاف الحجز الأسبوعي` outline action, not a duplicate under `•••`. Stopping preserves the current Booking, while cancellation and no-show warn that they also end recurrence.
- Optional `hold_expires_at` is the sole HOLD countdown source. Missing/invalid deadlines omit countdown copy. Display remaining time only; do not promise automatic cancellation, and never derive a deadline from Court `internal_hold_expiry_hours` or booking creation time.
- Active recurring completion loads `GET .../recurrence-next/`. Backend date/time, total price, required deposit, `can_continue`, and `requires_payment_reference` drive the display. Continuing sends only next-deposit method/reference/notes when required; stopping sends `continue_recurring: false`. The frontend never calculates or sends the next deposit amount.
- Product date-time text uses shared `formatArabicDateTime()` rather than raw backend ISO timestamps while API and query values remain unchanged.
- Cancellation refund explanations use the affected booking time, backend notice period/deadline, and backend result. Deposit collection time is historical and is not a refund-eligibility basis.
- `/clubs/{slug}/users/` keeps its flattened `ClubUser` list shape, while membership mutations use a separate `ClubMembership` resource type. Memberships show only `نشط` or `متوقف مؤقتًا`; deactivation/reactivation PATCH only `is_active` and retain the row. Permanent Manager/Staff removal DELETEs only the club membership, warns that historical bookings/payments/operations remain, and removes/refetches the row without a `DELETED` UI state.
- Reuse shared `AppCard` and `AppButton` patterns
- Keep the green brand system, rounded cards, consistent spacing, and responsive layouts
- New pages should look like part of one product, not separate prototypes
- `AppSheet` is the canonical presentation and interaction shell for non-full-page tasks: mobile bottom sheet, desktop modal, neutral X, backdrop, Escape, browser/Android Back, focus restoration, internal scrolling, and generic overlay stacking. Feature components own dirty-form and domain decisions.
- Mobile no longer has a bottom navigation. It uses the global `PageHeader` (hamburger + Home), burger drawer, and the existing `NewBookingFAB`; desktop keeps the current sidebar.
- The global `+ حجز جديد` action is mobile-only on authorized `/dashboard` and `/bookings` routes, hides while a drawer or sheet is open, and targets the existing `/schedule` flow without auto-opening Add Booking. It is hidden on `/schedule`.
- Recurrence is Booking metadata; the old recurring-agreement routes, API wrappers, types, and product screens are removed.
- Touched mobile text-entry controls use a 16px-equivalent font size. Temporary success feedback uses shared `AppSuccessNotice` (~3 seconds). Errors that need attention stay local and persistent.

## Known Next Tasks

1. Remove the optional club slug input from `LoginPage` if backend no longer needs it.
2. Active recurring reschedule, skip-week, and virtual-occurrence cancellation remain unsupported.
3. Payment gateway, marketplace, and player app remain deferred.
4. `/admin/settings` remains an intentional unfinished Platform Admin placeholder.
5. Schedule, recent Booking History, and recent Transactions now have offline resilience for the selected operational scope. BookingIntent is the only offline operational write: it preserves a customer request locally, waits for Schedule recheck after reconnect, and requires manual final booking.

## PWA Foundation

- `vite-plugin-pwa` generates `manifest.webmanifest`, `sw.js`, and the Workbox runtime during production builds.
- Manifest `start_url` is `/`, not `/schedule`, because `AuthLandingRedirect` is the current authority for unauthenticated users, Platform Admins, multi-club selection, no-club access, and normal club users.
- The Service Worker precaches the compiled application shell, manifest icons, favicon, and existing static Sloty images. It has no business/API `runtimeCaching` policy and does not queue or replay writes.
- Chromium installation is available only after `beforeinstallprompt`; installed/standalone mode hides promotion. iOS Safari receives Add-to-Home-Screen instructions instead of a fake install button.
- Install copy is intentionally limited to faster Home Screen access and, where explicitly framed, saved customer requests that still need confirmation. It must not promise offline booking creation, automatic booking, payments, cancellations, or transactions.
- New versions use a waiting-worker prompt. `تحديث الآن` explicitly applies the update; `لاحقًا` keeps the current application running for the session. PWA notices stay hidden while modal tasks, sheets/drawers, or known full-page editors may contain unsaved work.

## Offline Storage Architecture

- `src/offline` owns the Dexie-backed, explicitly versioned `sloty_local_db`; the Service Worker never stores or serves structured business datasets.
- Version 1 defines `sync_metadata`, `schedule_days`, `bookings`, `booking_details`, `transactions`, `transaction_details`, `booking_intents`, and `offline_context`. Future schema/index changes must increment the version and use an explicit Dexie migration when row reshaping is required.
- Every sensitive row has one canonical `user + Club` scope key. Schedule snapshots are uniquely identified by scope + Court + date. Public Schedule and BookingIntent reads require a Court, and no operational repository offers an unscoped all-user/all-Club read.
- Schedule day rows store backend-generated `BookingSlot` objects, optional backend message, and `synced_at`. A row with zero slots is a synchronized empty day. No local row means no cached data and must not be shown as "no slots".
- Snapshot replacement deletes the previous scoped dataset/window and writes the completed replacement plus its dataset-specific sync timestamp in one transaction. A failed replacement leaves the previous snapshot and timestamp intact.
- `offline_context` persists only the last successful `/me` + selected-membership identity needed for future cache selection: user/display identity, Platform Admin flag, selected Club, membership role/id, assigned Court, verification time, and schema version. It stores no credentials or calculated permissions and does not authenticate or change routing.
- Explicit logout serializes behind any pending verified-context write, clears every operational scope for the current user, then clears the existing auth/session and selected-Club state. Session expiry keeps the scoped cache; all reads remain user/Club isolated if browser cleanup fails.
- The BookingIntent table stores local customer requests only. It does not create Backend Bookings, holds, or reservations, and its `local_id` must never be sent to the Booking API.

## Offline Synchronization Architecture

- `src/offline/connectivity` centralizes browser `online` / `offline` hints and keeps Backend reachability separate. `navigator.onLine` is not treated as proof that the Sloty Backend is reachable.
- `src/offline/sync` owns synchronization contracts, freshness thresholds, lifecycle triggers, and the single-flight coordinator. It is mounted once through `OfflineSyncProvider` inside authenticated `AppShell`.
- Operational sync waits for current auth state to resolve a user, selected Club, selected membership, role, and canonical scope key. Platform Admins without a selected Club membership do not sync an all-platform namespace. Staff context carries only the assigned Court returned by `/me`.
- Dataset priority is Schedule first. After successful Schedule rows are persisted, BookingIntent recheck classifies only the relevant Court/date intents from those fresh rows. Bookings and Transactions may then run concurrently. If Schedule fails for a Court, old Schedule cache survives and that Court's intents stay pending instead of being classified from stale data.
- Startup, browser online, visible-resume, manual, and one bounded retry trigger all go through the same coordinator. Same-scope duplicate triggers coalesce while a full run is active, and each `scope_key + dataset` has at most one active dataset task.
- The Schedule adapter fetches today + the next 30 Egypt-local calendar days through the backend slots range contract, partitions slots by authoritative `slot.date`, and atomically replaces each Court window. Staff syncs only the assigned Court. Owner, Manager, and selected-Club Platform Admin sync authorized active Courts, with the currently viewed Court first.
- The Booking adapter runs after Schedule settles. It synchronizes the previous 7 Egypt-local calendar days for the current `user + Club` scope by fetching every paginated Booking list page before one atomic snapshot replacement. Staff uses only the assigned Court already returned by `/me`; Owner, Manager, and selected-Club Platform Admin rely on the backend's selected-Club scope. `bookings_last_sync_at` advances only after successful commit.
- The Transaction adapter runs in the same secondary phase as Bookings. It synchronizes the previous 7 Egypt-local calendar days for the current `user + Club` scope by fetching every paginated Transaction list page before one atomic snapshot replacement. Staff uses the assigned Court from `/me` and does not send `created_by=currentUser`; Owner, Manager, and selected-Club Platform Admin rely on the backend's selected-Club scope. `transactions_last_sync_at` advances only after successful commit.
- SchedulePage reads scoped cache first for dates inside the 31-day window. Valid cached data remains visible while an online refresh is running or failing, and freshness copy is only presentation context. Dates outside the window require internet when no valid row is available.
- Booking History remains server-backed online for search, filters, ordering, and pagination. Offline/backend-unreachable mode reads the scoped seven-day snapshot, searches cached customer name/phone locally, supports safe cached-field filters, distinguishes empty results from outside-window requests, and shows cached Booking details read-only. Notes appear only when an authoritative detail response was previously cached.
- Transactions remain server-backed online for their current filters and pagination. The current backend list contract has no server search or ordering query, so online `/transactions` does not expose those controls. Offline/backend-unreachable mode reads the scoped seven-day snapshot, searches cached payment references locally, supports safe cached-field filters, sorts the complete bounded dataset locally, distinguishes empty results from outside-window requests, and shows cached Transaction details read-only.
- Schedule, Booking History, and Transactions offline data remains read-mostly. The only offline write is saving a one-time BookingIntent customer request from the existing booking sheet. Payment, transaction cancellation, refunds, settlement actions, booking cancel/complete/no-show/customer edit/reschedule/recurrence-stop, recurring booking creation, automatic booking submission, and every other mutation require internet and are not queued.

## Offline BookingIntent reconnect flow

- Offline/backend-unreachable FREE Schedule slots open the existing booking sheet with `احفظ طلب الحجز`. The sheet reuses the same customer name, phone, notes, validation, and dirty-form protection, but disables new weekly recurrence.
- A saved request starts as `PENDING_RECHECK` and shows `تم حفظ طلب الحجز` / `بانتظار التأكيد`. It must never show Booking success copy because no Backend Booking exists.
- Persisted states are `PENDING_RECHECK`, `READY_TO_BOOK`, `CONFLICT`, `BOOKED`, `DISMISSED`, and `EXPIRED`; UI copy is Arabic and state names are not shown to users.
- Reconnect order is fixed: the sync coordinator refreshes/persists Schedule first, then rechecks intents for the successfully refreshed Courts, then continues secondary Booking/Transaction sync. Raw browser online events do not book or classify intents directly.
- Recheck uses Court, date, start, and end as slot identity. Fresh backend `FREE` + `is_available` becomes `READY_TO_BOOK`; a fresh occupied/missing slot becomes `CONFLICT`; passed appointment time becomes `EXPIRED`.
- `READY_TO_BOOK` still is not a reservation. `احجز الآن` manually calls the existing `createBooking()` API using customer data from the intent and current slot timing from the latest authoritative Schedule snapshot. `local_id` is not sent.
- Backend final-race conflicts keep the customer data and move the intent to `CONFLICT`. Alternative slots are ranked only from fresh backend FREE slots; the frontend does not generate availability, price, or recurrence.

## Settlements

- Sprint 6 settlement foundation is implemented for review, confirmation, history, and detail.
- Settlement pages use `selectedClubSlug`; owner can settle, and manager access depends on `can_manage_settlements`.
- Settlement preview uses `GET clubs/{club_slug}/settlements/preview/`; confirmation posts `{ collected_by, court?, notes? }` to `clubs/{club_slug}/settlements/`.
- Settlement lifecycle statuses are only `PENDING` and `SETTLED`; obsolete `CANCELLED` and `dry_run` contracts are absent while transaction cancellation remains supported.
- Settled transactions are shown as locked/read-only. Cancelled transactions remain visible and are not manually counted in frontend totals.
- Finance routes keep their backend contracts while using operational product language: Staff sees `معاملاتي المالية` and read-only `عهدتي`; Owner/authorized Manager primary Burger item is `إدارة الأموال`. The transaction ledger stays a secondary destination (`عرض سجل المعاملات المالية` → `/transactions`) titled `سجل المعاملات المالية`.
- Money confirmation is `تأكيد استلام المبلغ` then `تم استلام المبلغ بنجاح` in the shared `AppSheet`; Staff and restricted Managers never receive a mutation control.
- Staff transaction requests ignore URL Court/collector overrides, stay assigned-Court scoped, and omit the employee selector. Management keeps named Court and collector filters. The frontend does not send `created_by=currentUser` as a fake Staff security filter.
- Settlement mutations follow backend `can_approve`. Self-preview with `can_approve` may receive the amount; denied self-preview shows that another authorized person must receive it. A 403 refreshes `/me` once and does not retry automatically.
- Finance surfaces share payment-method/money presentation, use historical response names when supplied, and never expose raw entity IDs as user-facing fallbacks. `NO_UNSETTLED_TRANSACTIONS` renders as a calm empty-custody state.
- All-employee current money on `إدارة الأموال` reuses Dashboard `staff_unsettled_money` in one request. Linked transactions expand only when settlement preview already returned the complete `transactions[]`. Transaction customer/phone/reference search is not shown because the list API does not support server search.

## Dashboard, Reports, And Audit Logs

- Sprint 7 dashboard, reports, and audit foundation is implemented.
- Dashboard, reports, and audit pages use `selectedClubSlug` and backend endpoints for metrics and log data.
- `/schedule` is the operational Home labeled `الرئيسية`. `/dashboard` remains routed as `المتابعة` for analytics and is not a Burger item in this pass.
- The current Dashboard contract supplies total/HOLD/action counts, financial totals, and employee unsettled summaries. It does not supply upcoming count, authoritative nearest HOLD expiry, next booking, or booking-level action records, so those Home blocks are intentionally omitted rather than derived or fabricated.
- Staff remains assigned-Court and today scoped, sees read-only `عهدتي`, and cannot settle it. `إدارة الأموال` and `استلام المبلغ` appear only for Owner/Manager when `canManageSettlements()` allows management. Formal confirmation uses `تأكيد استلام المبلغ`.
- The rolling multi-day shortcut is `آخر 7 أيام`; period metrics use neutral wording. Booking-level Dashboard actions must reuse the canonical UX-3 presentation helper and `BookingActionSheet` when the backend eventually supplies real records.
- Financial metrics come from backend summary/report responses only; the frontend does not calculate revenue or cancelled-payment totals from raw rows.
- Reports and audit logs are read-only. Sprint 8 is QA and pilot hardening.

## Working Hours

- Working hours now use `clubs/{club_slug}/courts/{court_id}/working-hours/`.
- The old flat `court-working-hours/` endpoint is removed from frontend usage.
- Court settings saves the full weekly schedule with PUT using numeric weekdays (`0` Monday through `6` Sunday).
- Working Hours uses period-based `pricing_periods` rows instead of `opens_at`/`closes_at`.
- Court settings edits one weekday at a time while keeping all seven days in memory, copies the selected day to the rest of the week, and on invalid save shows a generic review message then focuses the first invalid field.

## Schedule Date UX

- Schedule uses `AppDateNavigator` as the primary date selector, not a native browser date input.
- The navigator has a rolling 7-day strip, a fully clickable date trigger, and an in-app `@daypicker/react` calendar with Lucide icons.
- Mobile calendar presentation behaves like a bottom sheet; desktop behaves like a compact modal.
- Selecting a visible date changes only the selected date. Selecting a calendar date outside the visible range rebuilds the range from that date.
- Selected days use Sloty's rounded green treatment. Today uses a subtle amber HOLD-palette marker unless selected green is the primary state.
- Schedule controls are organized as the authorized Court selector when applicable, `اختار اليوم`, then `اختار المعاد`; the lower-weight status legend sits with the slot workspace.

## Transactions

- Payment corrections use the cancel payment flow with a required reason.
- Transaction API requests and responses use `payment_reference`; Record Payment keeps `reference` only as form-local state and maps it at the API boundary.
- Cancelled transactions remain visible in the transaction list and are marked as cancelled.
- The list prioritizes signed amount, collection/refund type, payment method, human booking time, Court, collector, and created time from the existing response. IDs remain fallback context only.
- Settlement and cancellation Boolean filters stay as checkbox pairs; neither/both means all and omits the corresponding URL/API parameter.
- Offline Transactions use the complete previous-seven-calendar-day cache only when offline/backend-unreachable. Local search is payment-reference only because list rows do not contain complete customer name/phone and the frontend does not fetch Booking details per Transaction row. Local sort applies only to the complete cached dataset; online paginated results stay backend ordered.
- Successful online `getTransaction()` detail reads may populate `transaction_details` lazily. The canonical Transaction sync does not prefetch one detail per row.
- Offline Transaction cards/details are read-only. Cancellation, refunds, payment recording, settlement creation/approval/receive, and all other financial writes require internet.

## Booking History

- `/bookings` loads unrestricted server-paginated history when no URL filters are present; it no longer silently narrows the first visit to today. Previous/next controls preserve filters in the URL, and an emptied later page steps back safely.
- A visible `اسم العميل أو رقم الموبايل` field sends a debounced, URL-backed server `search` query and resets pagination without disturbing other filters.
- `الحجوزات القادمة فقط`, `تحتاج إجراء`, and `بها مبلغ متبقي` are immediate URL-driven review checkboxes using `upcoming=true`, `needs_action=true`, and `has_remaining_amount=true`.
- Court, status, exact/range dates, overdue, ended, and HOLD-expiry filters use one shared responsive filter sheet. Staff does not load or display the Court selector; the request uses the assigned membership Court while ignoring and removing URL Court overrides.
- Upcoming filtering is backend-owned and is never derived from the loaded page.
- History cards show only customer, phone, human appointment/status, and optional recurrence. Full money and lifecycle review remains in the canonical `BookingActionSheet`, while URL filters and page are preserved through review and mutations.
