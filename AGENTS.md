# Sloty React Frontend Agent Guide

This is the Sloty React frontend repository. It is frontend-only and must not contain backend, Django, database, serializer, model, migration, or API implementation changes.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Vitest
- Testing Library
- ESLint
- npm

## Product Direction

- Build Arabic-first, RTL-first, mobile-first interfaces.
- Follow current durable product docs: `docs/product-ux-pattern.md`, `docs/product-copy.md`, `docs/interaction-patterns.md`, `docs/ui-reference.md`, `docs/frontend-current-state.md`, and `docs/ux-known-gaps.md`. `docs/business-analysis.txt`, `docs/documentation.txt`, and `docs/sprints.txt` are historical planning references, not current frontend architecture.
- MVP 1 is the court-management product. Club, court, booking, transaction, settlement, dashboard, report, and audit screens already exist. Do not implement marketplace, player app, or payment-gateway flows until explicitly requested.
- Do not invent backend API contracts, endpoint names, payloads, auth refresh behavior, or production backend URLs.

## Prototype Reference

- `references/v0-prototype/` is a Vercel/V0 prototype for visual and component reference only.
- Do not copy its Next.js project structure, `app/page.tsx` screen switcher, or full `components/ui` folder.
- Do not add Next.js files or shadcn/Radix dependencies unless explicitly approved.
- Port only selected Sloty-specific UI patterns into the existing Vite React architecture.
- Keep prototype code out of production imports; real app code lives under `src/`.

## Responsive UI Rules

- Mobile-first means start from mobile and progressively enhance for tablet and desktop.
- Never ship a desktop page that looks like a centered phone mockup unless explicitly requested.
- Bottom navigation is removed. Mobile uses shell `PageHeader` (hamburger + Home), drawer, and route-gated `NewBookingFAB`.
- Floating action buttons are mobile-only unless intentionally redesigned.
- `NewBookingFAB` (`+ حجز جديد`) appears on mobile for `/dashboard` and `/bookings` only; it is hidden on `/schedule` because Schedule is already the booking workspace.
- PageHeader may show an explicit Home affordance to `/schedule` on non-Home authenticated pages. Home is the Schedule workspace (`الرئيسية`). `/dashboard` stays routed as `المتابعة` and is not primary nav. Home and Back remain distinct.
- Desktop pages must use available space with max-width containers, grids, sidebars, or toolbars.
- Every new screen must be tested visually at mobile, tablet, and desktop widths.
- Use responsive Tailwind classes such as `sm:`, `md:`, `lg:`, and `xl:` intentionally.
- Do not blindly copy V0/Vercel prototype layout. Convert it into a real responsive web layout.
- Background images are decorative only. Dynamic booking slots must always be real React components.
- Booking Board shows backend slot availability states including FREE, UNAVAILABLE, RECURRING_RESERVED, HOLD, CONFIRMED, COMPLETED, and NO_SHOW.
- HOLD slots are visible reserved slots labeled `بانتظار العربون`; they are not available and must not open the AddBookingSheet.
- `RECURRING_RESERVED` is a virtual future slot, not a concrete Booking. It opens `VirtualRecurringSlotDetailsSheet` using the selected slot date/time/price and `recurring_context` customer identity. Never fetch the anchor Booking as the selected occurrence, never reuse anchor status/finance, and treat `recurring_anchor_booking_id` only as recurrence-context for `إيقاف الحجز الأسبوعي`.
- Payment details, expired records, and lifecycle controls do not belong on Booking Board slot buttons.
- Booking Board slot buttons must remain compact and show only the start time, human status, and an optional trusted recurring indicator in the top-right. Canonical product labels override backend `slot.label` for known statuses: CONFIRMED → `العربون مدفوع`, COMPLETED → `تم اللعب`.
- Non-full-page temporary UI uses the shared `AppSheet` where applicable and closes through its neutral X, backdrop, Escape, or browser/Android Back. Feature code must intercept close requests when genuine unsaved input would be lost; `AppSheet` stays domain-agnostic.
- Mobile/touch text-entry controls must remain at least 16px even when tablet/wider breakpoints activate. Use the global touch/coarse-pointer form rule for editable `input`, `textarea`, and `select` controls; fine-pointer desktop may keep compact typography. Never disable browser zoom globally.
- Customer phone fields use the canonical label `رقم الموبايل` and muted placeholder `01X XXX XXXX`; the placeholder must never be set as a value or replaced with a realistic full phone number.
- Temporary success feedback uses shared `AppSuccessNotice` (~3 seconds). Errors requiring attention must not auto-dismiss.

## Architecture Rules

- During active integration work, the current local working tree is the implementation source of truth for approved staged/unstaged changes.
- Never replace newer approved local implementation with stale documentation, old commits, prototype code, or GitHub master.
- Update documentation to describe approved implementation rather than forcing implementation back to stale docs.
- When extracting approved code into a shared component, preserve behavior and visual semantics closely and do not combine unrelated cleanup with the extraction.
- Keep shared components presentational and reusable.
- Keep feature-specific state and logic inside feature folders.
- Keep cross-feature infrastructure in `src/core` (auth, API client, route guards), reusable UI/helpers in `src/shared`, and the authenticated shell in `src/layout`.
- Use typed interfaces/types and avoid `any`.
- Add educational comments because this project is also used for frontend learning.
- Prefer JSDoc for services, hooks, API modules, models/types, reusable components, route guards/protected routes, and layout components.
- Avoid noisy comments that repeat obvious code.
- Keep documentation updated when architecture changes.
- Refactor existing product flows in place. Do not introduce parallel `V2`, `New`, or wizard variants for Schedule, Dashboard, Bookings, booking cards, or recurring booking flows.
- `NewBookingFAB` is the canonical floating booking action; do not create another floating booking primitive.

## PWA Foundation Rules

- PWA infrastructure lives under `src/pwa` and extends the existing App, Router, AuthProvider, and AppShell. Do not create a parallel offline router, auth provider, shell, Schedule, or business page.
- `vite-plugin-pwa` uses `generateSW` with prompt-based registration. The manifest starts at `/` so `AuthLandingRedirect` preserves unauthenticated, Platform Admin, multi-club, no-club, and operational-user routing.
- The Service Worker precaches the compiled application shell, manifest icons, favicon, and approved static UI images only. Do not add `runtimeCaching` for API, auth, `/me`, bookings, slots, transactions, settlements, or users.
- Task 1 keeps the application shell available after a successful online load. Schedule, recent Booking History, and recent Transactions read resilience now comes from the scoped IndexedDB layer, not Service Worker API caching. BookingIntent is the only approved offline operational write and remains a local customer request, not a Backend Booking.
- PWA startup may request persistent browser storage with `navigator.storage.persisted()` / `persist()` once as a best-effort durability improvement. Unsupported APIs, denied persistence, and thrown storage errors must not block login, offline mode, or normal app use.
- Chromium install UX uses the captured `beforeinstallprompt` event, iOS Safari uses concise Add-to-Home-Screen instructions, unsupported browsers show no broken install action, and standalone mode hides install promotion.
- Install copy may mention faster Home Screen access and saved customer requests only where the Task-7 BookingIntent flow is explicitly explained. Do not promise offline booking creation, payments, cancellations, transactions, or automatic confirmation.
- Application updates are prompt-based (`تحديث الآن` / `لاحقًا`) and never auto-reload on discovery. AppShell suppresses PWA notices while any modal task, AppSheet, or drawer is active and on full-page editor routes that do not expose shared dirty state; the pending prompt may appear after the task is closed or the route changes.

## Offline Storage Foundation Rules

- Structured local business storage lives under `src/offline` in the versioned Dexie database `sloty_local_db`; the Service Worker remains responsible only for the static application shell.
- Every sensitive IndexedDB row must carry the canonical user + Club scope from `createOfflineScopeKey()`. Do not manually build scope strings, expose unscoped operational reads, or combine Platform Admin data into an all-Clubs namespace.
- Schedule snapshots use scope + Court + date uniqueness. Schedule and BookingIntent repository reads require an explicit Court; Staff must never receive a read-every-Court shortcut.
- Keep Backend Booking, BookingSlot, and Transaction objects as authoritative snapshots. Do not introduce parallel offline domain models or calculate slot state, prices, status, permission, or settlement facts locally.
- `sync_metadata` keeps independent Schedule, Bookings, Transactions, and Current Custody timestamps. Update a timestamp only inside the same successful transaction that replaces the corresponding complete snapshot; a failed replacement must preserve the last good rows and timestamp.
- `sync_metadata.operational_last_sync_at` is the device-local user + Club freshness marker. It advances only after a complete successful operational sync cycle; dataset timestamps remain independent and must not be confused with Backend `ClubMembership.last_sync_at`.
- `offline_context` is the last successful `/me` + selected-membership cache-ownership hint only. It stores no password, PIN, JWT, refresh credential, or frontend-calculated permission and must never authenticate, authorize, or route a user.
- Explicit logout must await pending context writes, clear every sensitive operational scope for the current user, and only then clear the auth/session and selected Club. Session expiry is not explicit logout and must not automatically delete the scoped cache.
- IndexedDB failure handling must remain non-fatal and log only generic messages without customer, money, transaction, token, or credential contents. Scope isolation remains mandatory even when cleanup fails.
- Critical local BookingIntent writes must commit before success UX appears. If saving fails, keep the form/customer data where practical, show a clear error, and never delete/recreate IndexedDB as routine runtime recovery.
- Schedule, recent Booking History, recent Transactions, and Current Custody are wired to the scoped cache as read-only offline surfaces. BookingIntent is the sole local offline write: it stores a customer request for later authoritative recheck and manual booking.

## Offline Freshness Rules

- Freshness policy is centralized under `src/offline/freshness`; do not scatter raw 12-hour/72-hour checks through pages.
- Freshness is scoped by canonical user + Club. One user's or Club's freshness must never authorize another scope.
- Under 12 hours: cached reads and new/edit/dismiss local BookingIntent operations remain normal.
- From 12 through exactly 72 hours: show stale-data warning copy in offline-like operational use, but keep cached reads and new/edit/dismiss local BookingIntent operations available.
- More than 72 hours: preserve cache and existing BookingIntents; disable only new local offline BookingIntent creation until a successful online operational sync refreshes the timestamp.
- The 72-hour rule must never block normal online Backend Booking creation and must never expire/delete requests because the appointment time passed.

## Offline Synchronization Rules

- Operational synchronization is owned once by `OfflineSyncProvider` under authenticated `AppShell`. Do not add business-data `online`, `offline`, or `visibilitychange` synchronization listeners inside Schedule, Bookings, Transactions, or other pages.
- Synchronization context must come from current `useAuth()` state after user, selected Club, selected membership, role, and scope key are resolved. Never sync with missing `userId` or `clubSlug`, and never create an all-platform Platform Admin offline scope.
- `navigator.onLine` is only a browser hint. A successful Backend dataset refresh is the evidence for Backend reachability; failed requests may mark Backend unreachable without logging users out or deleting cache.
- Dataset priority is fixed by business order: process eligible Booking Requests first because they can create new Backend truth, then refresh Schedule, then Bookings and Transactions, then Current Custody. Legacy BookingIntent recheck is transitional only and must not expire or mutate canonical `PENDING_SYNC` Booking Requests.
- Full sync runs and dataset sync tasks are single-flight by `scope_key` and `scope_key + dataset`. Startup, online, resume, retry, and manual triggers for the same scope must coalesce while a run is active.
- Scope changes cancel old owned sync work where possible. If stale work completes, it may only write its original scoped records and must not publish current visible sync status for the newly selected Club/user.
- Retry is conservative: one delayed retry may follow a failed run, then the app waits for startup, online, resume, or manual triggers. Do not add polling, aggressive loops, Background Sync queues, or Service Worker API caching.
- Sync task adapters must report success only after their network response is validated and the scoped IndexedDB replacement has committed. Do not update `sync_metadata` for no-op adapters or failed datasets.

## Offline Schedule Cache Rules

- Schedule sync stores the backend-generated slots window for today + the next 30 Egypt-local calendar days. Do not expand it into unlimited local history.
- Schedule range sync uses `clubs/{club_slug}/bookings/slots/` with `court`, `date_from`, and `date_to`, partitions backend slots by authoritative `slot.date`, and writes one `schedule_days` row per date. Empty rows are valid synchronized day markers, not missing cache.
- A full Court window replacement must be atomic for that Court and scope. A failed network request or IndexedDB transaction preserves the previous rows and does not advance `schedule_last_sync_at`.
- Staff syncs only `selectedMembership.court`. Owner, Manager, and selected-Club Platform Admin sync only authorized active Courts from the current frontend/backend contract, with the currently viewed Court first and other Courts afterward. Never sync all Platform Admin Clubs.
- SchedulePage is cache-first for dates inside the bounded window: read scoped `scope + Court + date`, render valid cache immediately, then request/observe the centralized coordinator. Do not attach page-owned `online`, `offline`, or `visibilitychange` sync listeners.
- Schedule distinguishes three states: cached slots, cached synchronized empty day, and no local cache. Never present no local cache as "no slots".
- Freshness copy is presentation context only. It may show last update and stale warnings; it must not become a backend/business rule.
- Post-mutation Schedule refreshes must use authoritative backend day data and persist the affected cached day when it is inside the 31-day window. Do not locally mutate slot state after create, payment, cancel, complete, no-show, edit, reschedule, or recurrence actions.
- Offline Schedule may save a Booking Request from an available cached FREE slot when offline/backend-unreachable. This saves only `تم حفظ طلب الحجز` / `بانتظار التأكيد`; it is not a Booking. Offline weekly intent may be captured only when the cached Backend slot has `can_start_recurring === true`. Payment, cancellation, completion, no-show, Booking edit/reschedule, recurrence stopping, and final Booking creation still require internet and must not be queued.

## Offline Booking Request Rules

- A Booking Request is local customer intent, not a Backend Booking, reservation, hold, confirmation, or proof of availability. Offline save success must say `تم حفظ طلب الحجز`, never `تم الحجز`.
- The canonical persisted model is `BookingRequestRecord`; `BookingIntentRecord` is a transitional alias only. The existing physical IndexedDB store remains `booking_intents` for non-destructive migration safety.
- Persisted Booking Request states are exactly `PENDING_SYNC`, `SYNCING`, `BOOKED`, `NEEDS_REVIEW`, `DISMISSED`, and `EXPIRED`; UI must render Arabic copy and never expose internal state names.
- Review reasons are exactly `SLOT_UNAVAILABLE`, `INVALID_CUSTOMER_DATA`, and `RECURRING_UNAVAILABLE`. Do not add `PAST_APPOINTMENT`.
- `local_id` is local UI/IndexedDB identity only. `client_request_id` is the stable Backend idempotency identity and must survive retries, app/PWA restarts, response loss, session expiry, re-authentication, and migration.
- `requested_recurring` means the customer requested weekly recurrence. It is not Backend eligibility, a generated occurrence plan, or confirmed recurrence. Do not infer it from `original_slot_snapshot.can_start_recurring`.
- Offline recurrence controls must preserve Backend tri-state meaning: `can_start_recurring=true` enables `ثبّت نفس الموعد كل أسبوع`; `false` disables it with Backend conflict context when available; `null` disables it and explains fresh Backend information is required.
- Booking Request rows contain sensitive customer name, phone, and notes. Every read/write must stay scoped to user + Club + Court, Staff must use only `selectedMembership.court`, and selected-Club Platform Admins must never get a global all-Clubs queue.
- Legacy v2 rows migrate in place: `PENDING_RECHECK` and `READY_TO_BOOK` become `PENDING_SYNC`; `CONFLICT` becomes `NEEDS_REVIEW / SLOT_UNAVAILABLE`; legacy time-based `EXPIRED` becomes `PENDING_SYNC`; `BOOKED` and `DISMISSED` remain terminal.
- `EXPIRED` is retained only for migration/backward compatibility or a future approved lifecycle reason. Appointment time passing must not transition a request to `EXPIRED`.
- `PENDING_SYNC` renders as waiting for confirmation. `SYNCING` renders as `جاري التأكيد...` and must not expose edit, alternative-slot, one-time conversion, or dismissal actions.
- `NEEDS_REVIEW` actions are reason-specific: `SLOT_UNAVAILABLE` can choose another slot or dismiss, `INVALID_CUSTOMER_DATA` can edit customer fields or dismiss, and `RECURRING_UNAVAILABLE` can convert locally to one-time, choose another slot, or dismiss.
- Customer-data editing changes only name, phone, and notes, then resets to `PENDING_SYNC` and clears `review_reason`. It must preserve `local_id`, `client_request_id`, requested slot fields, and `requested_recurring`.
- Alternative slots may be ranked for presentation only from already refreshed Backend-authoritative FREE slots. Do not generate slots or infer availability. Selecting an alternative updates requested slot fields and `original_slot_snapshot`; if a recurring request selects a slot whose `can_start_recurring` is not true, keep the request under `NEEDS_REVIEW / RECURRING_UNAVAILABLE` until the user explicitly converts to one-time or chooses another slot.
- Automatic Booking Request synchronization is owned by `src/offline/bookings/bookingRequestSync.ts` and invoked through `OfflineSyncCoordinator`; do not add page-level online listeners or a generic mutation queue.
- Sync eligibility is `PENDING_SYNC` plus stale `SYNCING` only, scoped to current user + Club + authorized Courts. Do not auto-submit `BOOKED`, `DISMISSED`, `NEEDS_REVIEW`, or `EXPIRED`, and do not block past requested times.
- Before the Booking POST, persist `SYNCING` and `last_attempt_at`. Stale `SYNCING` recovery uses the same `client_request_id`; never regenerate it after network failure, timeout, response loss, app restart, auth recovery, or retry.
- Booking Request sync sends only customer intent fields to the existing Booking create API: Court, customer name, phone, requested start/end, optional notes, `is_recurring` from `requested_recurring`, and `client_request_id`. Never send local state, cached price, slot snapshots, or generated recurrence data.
- Treat both first-create 201 and idempotent replay 200 as Booking success: mark `BOOKED` and persist `resolved_booking_id`.
- Technical failures return to `PENDING_SYNC`; business mappings must use stable codes/field errors only. `BOOKING_SLOT_UNAVAILABLE`, `RECURRING_UNAVAILABLE`, and customer field `VALIDATION_ERROR` map to the approved review reasons. `BOOKING_CLIENT_REQUEST_MISMATCH` must stop automatic retry without generating a new ID and remains a Product/Engineering copy follow-up.
- `SESSION_EXPIRED`, `TOKEN_NOT_VALID`, `USER_INACTIVE`, `USER_DELETED`, and `CLUB_ACCESS_REVOKED` must go through the centralized account-state helper; the request-sync engine must not implement its own destructive cleanup.
- `BOOKED` and `DISMISSED` requests must not appear in the active operational queue. Current retention is scoped local storage until explicit logout/user cleanup; do not add an unreviewed history surface or automatic purge without a product/security decision.
- Booking Request is the only offline operational write. No payment, refund, settlement, cancel, complete, no-show, reschedule, recurrence-stop, or other operational mutation queue is allowed.

## Offline Booking History Cache Rules

- Booking sync stores the previous 7 Egypt-local calendar days, including today. It must not change online Booking History defaults or restrict online users to that range.
- The canonical Booking cache is a background sync dataset, not the current filtered UI response. Search results and filtered server pages must never replace the complete seven-day snapshot.
- Booking sync follows coordinator priority after Booking Requests and Schedule refresh, alongside Transactions in the secondary dataset phase. Do not start a page-owned canonical Booking sync from `/bookings` mount, search, filter, or pagination changes.
- If the Bookings list endpoint is paginated, fetch all pages for the seven-day unfiltered period before committing. Page or IndexedDB failure preserves the previous snapshot and does not advance `bookings_last_sync_at`.
- Staff Booking sync uses only `selectedMembership.court` from verified auth context. Owner, Manager, and selected-Club Platform Admin use the backend's current selected-Club scope; never combine Clubs or manually expand Staff Court access locally.
- Online `/bookings` remains server-backed for search, filters, ordering, and pagination. IndexedDB is used only for offline/backend-unreachable resilience.
- Offline `/bookings` reads the scoped seven-day snapshot and applies only safe local filters over cached fields: customer name, phone, Court, date/date range inside the window, status, and positive remaining amount. Notes search is not promised unless every cached Booking includes notes.
- Backend-derived operational filters such as `needs_action`, `overdue`, `ended`, `hold_expiring`, and `upcoming` must be disabled or treated as internet-required offline unless an authoritative cached field exists. Do not reconstruct those classifications in frontend code.
- Cached Booking details are lazy: successful online `getBooking()` responses may be stored in `booking_details`, but the seven-day list sync must not N+1 fetch every detail by default.
- Offline Booking History detail is read-only. Payment, cancel, complete, no-show, customer edit, reschedule, recurrence stop, expiry, and every other Booking mutation require internet and must not be queued.

## Offline Transactions Cache Rules

- Transaction sync stores the previous 7 Egypt-local calendar days, including today. It must not change online Transaction ledger defaults or restrict online users to that range.
- The canonical Transaction cache is a background sync dataset, not the current filtered UI response. Filtered server pages must never replace the complete seven-day snapshot.
- Transaction sync follows coordinator priority after Booking Requests and Schedule refresh, alongside Bookings in the secondary dataset phase. Do not start a page-owned canonical Transaction sync from `/transactions` mount, filter, search, sort, or pagination changes.
- If the Transactions list endpoint is paginated, fetch all pages for the seven-day unfiltered period before committing. Page or IndexedDB failure preserves the previous snapshot and does not advance `transactions_last_sync_at`.
- Staff Transaction sync uses only `selectedMembership.court` from verified auth context and must not send `created_by=currentUser` as a frontend scoping hack. Owner, Manager, and selected-Club Platform Admin use the backend's selected-Club scope; never combine Clubs.
- Online `/transactions` remains server-backed for filters and pagination, and it does not expose unsupported server search or ordering controls. IndexedDB is used only for offline/backend-unreachable resilience.
- Offline `/transactions` reads the scoped seven-day snapshot and applies only safe local filters over cached fields: date/date range inside the window, Court where role allows, collector where data exists, payment method, cancellation state, and settlement state.
- Offline Transaction search is limited to `payment_reference` with the current contract. Transaction rows do not include complete customer name/phone, so the frontend must not promise customer search or fetch linked Booking details per Transaction row.
- Offline Transaction sorting is local only because it operates on the complete bounded cache. Online paginated results remain backend ordered.
- Cached Transaction details are lazy: successful online `getTransaction()` responses may be stored in `transaction_details`, but the seven-day list sync must not N+1 fetch every detail by default.
- Offline Transactions are strictly read-only. Payment recording, transaction cancellation, refunds, settlement creation/approval/receive, PATCH/DELETE financial changes, and every other money mutation require internet and must not be queued.

## Offline Current Custody Snapshot Rules

- Current Custody offline display is the last successful Backend current-custody response stored in IndexedDB, not a calculation from cached Transactions.
- The `current_custody_snapshots` store is scoped by canonical user + Club, snapshot kind, collector scope, and Court scope. All-courts (`all`) and one Court (`court:{id}`) are different cache keys.
- Staff/restricted-user custody stores the Backend settlement preview response. Owner/authorized Manager custody stores the grouped `unsettled-summary` response in one snapshot; do not fetch one preview per employee.
- The sync coordinator refreshes Current Custody after Booking Requests, Schedule, Bookings, and Transactions. Pages may persist successful online custody reads and may read the cached snapshot after a request failure, but must not attach page-level reconnect listeners.
- If no cached custody snapshot exists while offline/backend-unreachable, show internet-required/error copy, not a zero custody state.
- `NO_UNSETTLED_TRANSACTIONS` is an authoritative online empty state. Clear the matching stale local custody snapshot instead of fabricating a zero-valued snapshot.
- Negative and zero-net custody values are displayed exactly from the Backend snapshot fields. Do not use `Math.abs`, clamp negatives, hide rows, or recompute signed net from PAYMENT/REFUND rows.

## Navigation Rules

- Mobile navigation uses the shell `PageHeader`, burger drawer, Home affordance, and global floating `+ حجز جديد`; the mobile bottom navigation is removed. Desktop keeps its existing sidebar.
- The global booking action is mobile-first on `/dashboard` and `/bookings`, hides while any modal task or burger drawer is active, and navigates to `/schedule` with `beginAtDayChoice` without inventing a new route or auto-opening a booking form. It is hidden on `/schedule` because Schedule is already Home.
- Canonical product navigation labels live in `src/shared/copy/appCopy.ts` / `navigation.config.ts`: الرئيسية (Schedule), سجل الحجوزات، إدارة الأموال (Owner/authorized Manager) or معاملاتي المالية + عهدتي (Staff), التقارير، سجل النشاط، الإعدادات. `/dashboard` is `المتابعة` and stays out of primary Burger/sidebar.
- Recurrence is Booking metadata and has no separate recurring-agreement route or top-level navigation concept.
- Logout and change-club actions belong in the account menu, not the visible header area.
- Default authenticated experience is mobile-style, and users can switch to Desktop View from the hamburger menu.
- Sloty defaults to mobile view unless `sloty:view-mode` explicitly stores `desktop`; invalid saved view-mode values fall back to mobile.
- Desktop view must always expose a visible `عرض الهاتف` recovery action outside hidden mobile-only UI surfaces.
- Do not place the only mobile/desktop view toggle inside a drawer or surface hidden by the current view mode.

## Auth And API Rules

- API base URL must live in one shared config file; do not hardcode it across components.
- API endpoint paths must live in `src/shared/api/apiEndpoints.ts`; do not hardcode API URLs inside components.
- `apiRequest` must send `Accept-Language: ar` by default while preserving caller headers and explicit language overrides.
- Expired access tokens refresh once through `auth/token/refresh/` using a single in-flight request; concurrent 401s share that refresh and retry the original request once. Login and refresh paths never trigger refresh. Failed refresh clears the session and shows `sessionCopy.expired`. Do not fake a 12-hour working session with a frontend timer.
- Display backend localized API error messages when available, but make frontend logic depend on stable error code, HTTP status, and field names, never message text. Known domain codes should map centrally to product Arabic copy before falling back safely.
- Preserve backend `request_id` values on API errors for diagnostics without showing raw technical payloads to users.
- Map backend `field_errors` to local form fields when practical, and never show raw technical errors, stack traces, `undefined`, or `[object Object]` to users.
- Do not add a global toast for every API error; forms need local message and field-error handling.
- Egypt governorates/cities must come from `GET /egypt-locations/`; club forms must submit governorate/city codes, not Arabic or English labels, and must not hardcode Egypt location lists. Club address forms use governorate, city, and optional address; do not reintroduce `area`.
- Phone country/region selection is frontend UI only. Backend payloads must send one E.164 phone field such as `customer_phone` or `phone_number`; do not send `phone_region`, `country`, or calling-code fields.
- Reuse `SlotyPhoneNumberInput` for user/customer phone entry, and do not create duplicate phone parsers, regex validators, or E.164 formatters.
- Courts include `minimum_deposit` and `cancellation_refund_notice_days`; do not use or reintroduce `recurring_deposit_refund_notice_days`.
- Cancellation refund policy editing is Owner/Platform Admin only through `canManageCancellationRefundPolicy`; Manager pricing/working-hours permissions must not grant refund-policy editing.
- JWT role claims are used by the frontend for UX, navigation, and route protection.
- Components must use `useAuth()` instead of decoding tokens directly.
- Decode access tokens in the auth utility/provider layer only.
- `AuthProvider` owns session hydration and current-user profile loading from `apiEndpoints.auth.me`.
- Components should use `useAuth().currentUser` for displayed user profile data when available.
- `/me` is the post-login source of authenticated user context.
- `/me` includes `account_created_by` as nullable `User.created_by` display information; do not derive it from memberships or the current user.
- `/me` memberships are confirmed and used for frontend club-selection UX.
- Store only `selectedClubSlug` persistently; do not store full memberships or permissions as trusted authority.
- Manager permission flags live on the selected membership, not the club object: use nested membership `permissions.can_change_pricing`, `permissions.can_manage_working_hours`, and `permissions.can_manage_settlements` when returned by `/me`.
- Do not store or send `manager_can_settle_transactions` or `manager_can_change_pricing` on Club create/update payloads.
- Owner edits to existing Manager permissions use `PATCH clubs/{club_slug}/memberships/{membership_id}/` with only `manager_can_settle_transactions` and `manager_can_change_pricing`.
- Add User creates club memberships with `POST clubs/{club_slug}/memberships/`; normal UI can create or assign `MANAGER` and `STAFF` only.
- Add User phone entry must reuse the shared country-aware phone input and send only one E.164 `phone_number` value when present.
- Reuse shared Manager permission fields where Manager create/edit forms need the same settlement and pricing/working-hours toggles.
- User account status and club membership status are separate lifecycle states. Account activation/deactivation uses global `PATCH users/{userId}/` with the account active field, while membership activation/deactivation uses `PATCH clubs/{club_slug}/memberships/{membership_id}/` with only the membership active-state field.
- Do not permanently delete accounts for normal internal lifecycle management, and do not duplicate membership activation logic between Platform Admin and Owner user-management flows.
- Owner Settings user creation supports `MANAGER` and `STAFF` only; Platform Admin `OWNER` membership creation belongs to the future Platform Admin Users flow.
- Platform Admin Users live under `/admin/users`; use one data/request flow for mobile cards and desktop tables, and send server-backed search, account type, club, role, and account status filters through the global users endpoint.
- `/admin/users/:userId` uses the global user detail response for account data and any returned membership summaries.
- Do not request every club's membership list to reconstruct Platform Admin user detail membership data; missing summaries render a calm unavailable state.
- Platform Admin creates Platform Admin accounts with `POST users/` and club memberships with `POST clubs/{club_slug}/memberships/`.
- Existing-user linking is supported through the membership creation contract with `user_id`; do not ask users to type raw IDs or send both new-user data and `user_id`.
- Platform Admin club-user creation may create `OWNER`, `MANAGER`, and `STAFF`; Owner Settings user creation remains limited to `MANAGER` and `STAFF`.
- Platform Admin account activation/deactivation uses `PATCH users/{userId}/` only when a confirmed account status field such as `is_active` is present.
- Membership activation/deactivation must use membership PATCH only when a confirmed activation request field exists; do not infer it from response-only status fields.
- Manager permissions default false on creation and send `manager_can_settle_transactions` and `manager_can_change_pricing` only for `MANAGER`.
- Working-hours permission is currently represented through the pricing/working-hours manager toggle; do not add a separate manager working-hours payload field.
- Staff membership creation requires court assignment and must not send manager permission fields.
- Existing-user assignment must use a named selector/search when available; do not ask users to type raw backend user IDs.
- Existing-user linking uses a named/searchable selector and internal `user_id` payloads only; never expose raw numeric ID inputs.
- Existing memberships must not expose scope reassignment UI for `role`, `court`, `user`, or `club`.
- Manager permission editing remains membership-level and must reuse the shared manager-permission fields/dialog.
- Do not request every club membership list to build the global Platform Admin users list; render membership summaries only when the global users endpoint returns them.
- Refresh club users after creating a membership, and keep backend validation/errors authoritative.
- Do not update manager permissions through Club update, and do not send manager permission fields for Staff or Owner memberships.
- After updating manager permissions, refresh the club users list and refresh `/me` when the active membership may be affected; on 403, refresh `/me` and do not retry the mutation automatically.
- During the membership-permission backend rollout, fallback compatibility for older permission shapes must stay centralized in auth helpers, with no direct component reads from club-level permission fields.
- If `/me` returns one membership, auto-select its club slug.
- If `/me` returns multiple memberships, show `/select-club`.
- If `/me` returns no memberships and the user is not platform admin, show `/no-club-access`.
- Backend remains the source of truth for permissions; do not trust frontend-selected club context without backend verification.
- Club-scoped pages should use `selectedClubSlug` and the current `selectedMembership` from `useAuth()`.
- Active role, court scope, and permissions must be recalculated from the selected club membership whenever `selectedClubSlug` changes; never carry permissions from a previous club.
- Do not fetch all clubs just to pick the first active club for normal club users.
- Staff operational Court comes from `selectedMembership.court`; Schedule, Dashboard, and Transactions must not present Staff with a broader Court selector. This is frontend UX/request shaping only, and the backend remains the security authority.
- Sprint 2A clubs/courts setup API calls must go through feature wrappers such as `clubsApi` and `courtsApi`.
- Sprint 2B court working-hours setup lives inside the courts feature; keep it separate from booking-slot generation.
- Court working-hours setup API calls belong in the courts feature wrapper/component.
- Court working hours use the nested court weekly endpoint `clubs/{club_slug}/courts/{court_id}/working-hours/`; do not use the old flat `court-working-hours/` endpoint.
- Working hours are weekly recurring rows for one court, saved as a full-week PUT; one court has up to seven numeric weekday rows (`0` Monday through `6` Sunday). The Court settings editor shows one weekday at a time while keeping all seven days in memory. Copy uses `نسخ مواعيد {day} لباقي أيام الأسبوع`. Invalid save shows `حصلت مشكلة في بعض البيانات. راجع الحقول المحددة.`, switches to the first invalid day, and focuses the field.
- Working Hours uses period-based availability only: each weekday sends `pricing_periods`, where each period has `starts_at`, `ends_at`, and `price`.
- Closed working-hour days send `pricing_periods: []`; do not send `opens_at`, `closes_at`, `is_closed`, `blocks`, local IDs, or backend period IDs in working-hours PUT payloads.
- Gaps between pricing periods are allowed and mean unavailable time. The frontend may validate required fields, same-day ranges, overlap, price, and slot-duration alignment, but must not require full-day coverage.
- Court `default_price` is not the active pricing model for working hours; keep it only where a confirmed court create/update backend contract still requires compatibility.
- Do not add holiday/Ramadan working-hour exceptions in MVP unless explicitly requested.
- Booking Board integration uses clubs, courts, and the backend booking slots API for daily availability.
- Schedule Board uses `clubs/{club_slug}/bookings/slots/` with `court` and `date` for the selected daily board.
- Schedule Board must use `slot.is_available` for clickability, `slot.slot_status` for styling/business state, and `slot.label` for localized display when available.
- `FREE` is response-only slot status and must not be added to actual `Booking.Status`; `CANCELLED` and `EXPIRED` release slots and should not be shown as blocking board states.
- Schedule Morning/Evening presentation is container-owned: `مواعيد الصباح` uses a warm, light cream/daylight surface, while `مواعيد المساء` uses a deeper calm blue-gray/night surface. Do not recolor slots by period; FREE, HOLD, CONFIRMED, COMPLETED, NO_SHOW, and RECURRING_RESERVED keep their existing status semantics in both containers.
- Refetch backend booking slots after booking creation, payment recording, cancellation, completion, no-show, hold release, or any action that changes slot/payment state.
- Backend still uses working hours to generate slots; do not remove working-hours settings pages.
- Booking Board must not show payment or lifecycle details.
- Schedule page uses one selected `YYYY-MM-DD` date value with the shared rolling date navigator plus a real date picker.
- Schedule uses one selected `YYYY-MM-DD` date source of truth through the shared `AppDateNavigator`; do not recreate today/tomorrow/after-tomorrow business state in feature pages.
- `AppDateNavigator` keeps visible range state separate from the selected date: selecting a visible date changes selection only, while calendar/external selection outside the visible range rebuilds the 7-day range from that date.
- Schedule does not use a native browser date input as its primary selector; `AppDateNavigator` uses a rolling visible date strip, a fully clickable date trigger, and an in-app `@daypicker/react` calendar with Lucide icons.
- AppDateNavigator mobile calendar presentation behaves like a bottom sheet, desktop behaves like a compact modal, and users select dates by tapping days rather than typing dates.
- AppDateNavigator selected days must use Sloty's rounded green surface/button styling, not generic browser/DayPicker blue or purple states.
- AppDateNavigator today marker uses the Schedule HOLD palette (`border-amber-400`, `bg-amber-100`, `text-amber-900`) as a subtle secondary marker; selected green remains primary when today is selected.
- Schedule uses the shell `PageHeader` as its only page identity and presents the direct task hierarchy `اختار اليوم` then `اختار المعاد`; do not restore a local `لوحة الحجز` hero or instructional paragraph.
- After an explicit date selection, load that date's slots before smoothly scrolling once to `اختار المعاد`; initial load and Court changes must not auto-scroll, and loading stays local to the slots area.
- Schedule status legend remains informational near the slot workspace and must not compete with the date and slot headings.
- Schedule BookingCard buttons show only start time, human status, and `↻` for an existing recurring booking or a FREE slot where backend `can_start_recurring === true`. They never show customer, phone, notes, price, or payment amounts.
- Add Booking uses one optional `ثبّت نفس الموعد كل أسبوع` checkbox and one `تأكيد الحجز` action. Backend `can_start_recurring`, `recurring_blocked_reason`, and `first_recurring_conflict_start` control its eligibility explanation; the existing availability request still validates before creation. Never calculate future conflicts or add alternate-start, booking-type, preview, or wizard UX.
- Booking Board hides/blocks past slots based on the current Africa/Cairo time; past selected dates are not bookable.
- Booking Board keeps the AM/PM split: AM before 12:00 and PM from 12:00 onward.
- Sprint 3B creates bookings only from backend-available Booking Board slots; AddBookingSheet stays customer-first and sends `is_recurring: true` when weekly recurrence is selected. Never send `source: 'RECURRING'`.
- Sprint 3C adds confirmed booking details and cancel action only.
- Sprint 3D adds complete/no-show actions from confirmed booking details only.
- Sprint 4 adds basic transaction listing and confirmed-booking payment recording through `apiEndpoints.clubs.transactions`; transaction API calls go through `src/features/transactions/transactionsApi.ts`.
- Payment recording opens after booking through RecordPaymentSheet from confirmed details or the HOLD action sheet. Backend validates overpayment and permission rules.
- First payment minimum-deposit enforcement belongs to the backend. Frontend may show the court `minimum_deposit` as guidance, but must not calculate the authoritative required deposit.
- HOLD slots open a focused action sheet for adding payment or freeing/cancelling the slot through the current cancel flow.
- BookingCard click behavior must match slot status; available/cancelled open AddBookingSheet, HOLD opens the HOLD action sheet, and confirmed opens booking details.
- Existing booking details/actions must follow one reusable interaction model: Schedule, the future Schedule closing section, and `سجل الحجوزات` should open the shared booking action/details sheet instead of separate edit flows.
- Available/cancelled slots can create bookings; existing bookings open action/details. Completed bookings are locked/read-only and must never open AddBookingSheet.
- Raw transaction editing is forbidden; payment correction remains cancel payment with a required reason.
- Transaction request and response contracts use `payment_reference`; a form-local `reference` value must be translated at the API call boundary.
- Transactions may be `PAYMENT` or `REFUND`; legacy rows without `transaction_type` should display as `PAYMENT`.
- REFUND transaction amounts are signed backend values. Do not use absolute values or recalculate settlement totals in the frontend.
- RecordPaymentSheet creates PAYMENT transactions only; do not add a transaction-type selector or allow negative payment entry.
- Transaction cancellation is correction of a wrong payment entry, not a customer refund flow, and should be available for PAYMENT/legacy rows only unless the backend confirms REFUND cancellation.
- Booking dates should include weekday plus date where operationally relevant.
- Schedule has a compact `حجوزات تحتاج إغلاق` section for today only. It shows at most 3 bookings needing payment/status closure, excludes CANCELLED, EXPIRED, NO_SHOW, COMPLETED (already closed operationally, even with remaining money), and empty slots, links to `سجل الحجوزات` with `needs_action=true` when more items exist, and row clicks must open the shared booking action/details flow.
- The main schedule grid must not re-add past empty slots for the closing section.
- After payment, reload bookings and trust the backend-returned status; the frontend must not fake a CONFIRMED status.
- Completing a booking requires `remaining_amount = 0`. Ordinary completion may send no body; active recurrence completion may send the backend-supported continuation decision and next-deposit method/reference/notes, but never a next-deposit amount.
- The current UI records remaining payments through the transactions flow before completion; the backend remains authoritative for full-payment enforcement and recurring continuation requirements.
- If the backend returns `BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT`, guide the user to the payment flow and keep the backend as the authority for remaining amount.
- Booking Board remains availability-focused and must not show money on slot buttons.
- Sprint 5 lifecycle actions stay inside confirmed booking details: cancellation requires a reason sheet, complete requires explicit confirmation, and no-show uses a confirmation/reason sheet.
- Confirmed booking cancellation must load `POST clubs/{club_slug}/bookings/{id}/cancellation-preview/` before showing refund details. Display backend preview values only; do not calculate refund, retained amount, deadline, or eligibility in the frontend.
- Booking cancellation confirmation posts refund metadata only when the backend preview has a positive refund amount. Do not send `refund_amount`, retained amount, minimum deposit, or refund deadline back to the cancel endpoint.
- If booking cancellation returns `BOOKING_CANCELLATION_TIME_PASSED`, show `انتهى وقت إلغاء هذا الحجز لأنه بدأ بالفعل.` and refetch current booking/schedule state.
- Cancelling or marking no-show on a Booking with `is_recurring === true` and `recurrence_status === 'ACTIVE'` ends its recurrence. Warn through the centralized active-recurrence helper; the backend validates independently.
- Reschedule for non-active-recurring HOLD/CONFIRMED bookings uses `POST clubs/{club_slug}/bookings/{id}/reschedule/`. Active recurring reschedule remains unsupported and hidden.
- Hold expiry is backend-driven; the frontend must not fake expiry transitions or locally mutate HOLD into EXPIRED.
- Completed, cancelled, no-show, and expired bookings are read-only when shown in booking details.
- Completed bookings block their slots on Booking Board and must never open AddBookingSheet or be treated as available.
- Booking Board remains availability-focused and must not show lifecycle/payment details on slot buttons.
- `/bookings` is a real filtered Bookings List page, separate from the Booking Board.
- Bookings List supports URL query filters used by Summary cards, and Summary redirects must not be overwritten by default page filters.
- Bookings List loads unrestricted server-paginated history when the URL has no filters; do not silently default it to today.
- Bookings List previous/next controls keep `page` in the URL, preserve all active filters, and step back when a later page becomes empty after a mutation.
- Bookings List keeps a visible URL-backed customer name/phone search above the URL-driven primary checkboxes for `upcoming=true`, `needs_action=true`, and `has_remaining_amount=true`; never emit `remaining_amount_gt` for the remaining-money checkbox. Court, status, date, overdue, ended, and HOLD-expiry filters live in the shared responsive `FilterSheet` on every viewport.
- Customer name/phone search uses shared `LiveSearchField` plus a results-only refresh region. It sends one debounced backend `search` query, and upcoming sends `upcoming=true`; do not request on every keystroke, filter only the loaded page, remount the search input, or claim notes search unless the backend contract includes notes.
- Staff Bookings List sends the assigned Court from the active membership as request scope, while ignoring/removing Court URL overrides and hiding the Court selector/chip. Owner and Manager may use the named URL-driven Court filter. Backend authorization remains authoritative.
- Active filter chips must remain URL-driven and removable.
- Active filter chips are one accessible button per chip; clicking anywhere on the chip removes only that filter while preserving other active filters, and buttons must not be nested.
- Court filters must display court names instead of raw IDs while still sending numeric court IDs to the backend.
- Bookings List cards are compact clickable review entries showing customer name, phone, human appointment, Court, human status, optional recurring marker, and optional backend-provided `notes`. Notes render only when meaningful, use the compact label `ملاحظة`, stay visually secondary, and are clamped to roughly two lines.
- Booking List notes must come directly from the Backend list `booking.notes` field. Never fetch Booking Detail per list row, join cached detail notes, or create a second notes store to render list cards.
- `BookingActionSheet` is the one canonical details presentation for Schedule occupied slots, Schedule closing rows, and Bookings List cards, including HOLD. The entry page must not choose the primary action; booking state and current implemented capabilities do.
- Booking details show full meaningful notes under `ملاحظات` with natural wrapping/newlines; blank/null/whitespace notes hide the whole Notes section.
- Booking details put customer/phone and appointment identity first, followed by a human Egyptian-Arabic state, financial summary, and at most one visible primary action. HOLD uses `سجّل العربون وأكّد الحجز`; a known positive remaining balance uses `حصّل X ج.م`; an ended fully-paid confirmed booking visibly exposes both `إكمال` and `عدم حضور`.
- Valid secondary booking actions live under `••• خيارات أخرى` in order: `تعديل بيانات الحجز`, then `تغيير الموعد` when allowed, then a separator, then danger `إلغاء الحجز` last. Active recurrence shows inline `إيقاف الحجز الأسبوعي` (outline, not danger) and must not duplicate that action under `•••`. Confirmation explains that the current Booking remains unchanged. Do not show backend-roadmap copy, a separate recurring domain, or unsupported single-occurrence cancellation from booking details.
- `تعديل بيانات الحجز` is a secondary action for HOLD and CONFIRMED. It PATCHes only `customer_name`, `customer_phone`, and `notes`. The PATCH response is partial; refetch Booking detail afterwards and never replace the canonical Booking with it.
- `تغيير الموعد` is a separate secondary action for HOLD and CONFIRMED bookings that are not actively recurring. It posts `{ court, start_time, end_time, reason? }` to `bookings/{id}/reschedule/` using a backend-available slot. Hide it for `is_recurring === true && recurrence_status === 'ACTIVE'`.
- Recurring identity is contextual `↻ حجز أسبوعي` metadata for every recurring Booking. Only strict `is_recurring === true && recurrence_status === 'ACTIVE'` enables stop-recurrence and the cancellation/no-show recurrence-ending warnings; `RENEWED` and `ENDED` are not active.
- `hold_expires_at`, when supplied by the booking contract, is the authoritative display deadline. When absent, omit HOLD countdown copy; never calculate a booking expiry from Court `internal_hold_expiry_hours` or booking creation time. Countdown copy is remaining time only (`متبقي 37 دقيقة`); do not promise automatic cancellation because production expiry depends on `expire_hold_bookings` being scheduled.
- Booking Board remains availability-focused; Bookings List is for reviewing and filtering existing bookings.
- Completed bookings are locked/read-only. Completed bookings with remaining amount are financial warnings, not normal daily actions.
- The frontend must not calculate `needs_action`; backend summary/list filters own that action classification.
- Sprint 6 implements user-based settlement foundation: settlement pages use `selectedClubSlug`, Owner can settle, Manager can settle only when the active membership permissions allow it, and Staff/restricted Manager can view their own custody without mutation controls.
- The new settlement flow selects a club user as `collected_by`; it must not use date-range settlement creation.
- Club users load from `clubs/{club_slug}/users/` and may be filtered by `role`, `court`, `is_active`, and `search`.
- Settlement preview uses `GET clubs/{club_slug}/settlements/preview/` with optional `collected_by` and optional `court`; omitting `collected_by` previews the signed-in user's own current custody through the backend contract. Do not use dry-run wording in the UI.
- Settlement preview is a fresh Backend snapshot for confirmation, not frozen truth copied from the grouped summary, Transaction list, or any frontend-calculated candidate set. Create may legitimately settle a different current candidate set or reject with a structured conflict if backend truth changed.
- Settlement confirmation posts `{ collected_by, court?, notes? }` to `clubs/{club_slug}/settlements/`; do not send frontend-computed totals, preview transaction IDs, `dry_run`, `date_from`, `date_to`, `period_start`, `period_end`, payment-method filters, or `created_by`.
- Settlement approval UI follows backend `can_approve`, not `!is_self_preview`. Self-preview with `can_approve` may show `استلام المبلغ`; denied self-preview uses `financeCopy.selfPreviewDenied`.
- Settlement confirmation must use a modal with clear money-safe wording. Empty/concurrency settlement results are friendly empty states, not scary errors.
- After settlement success or any payment/refund/transaction-cancellation mutation success, refetch authoritative current financial surfaces through existing loaders. Never subtract a preview amount, zero an employee card, remove preview transactions, or mark rows settled locally.
- Stale settlement/create conflicts must branch on backend error codes such as `SETTLEMENT_CONFLICT`, `NO_UNSETTLED_TRANSACTIONS`, `SETTLEMENT_ALREADY_SETTLED`, `SETTLEMENT_INVALID_STATUS`, or `TRANSACTION_SETTLED_LOCKED`; do not parse message text.
- The settlement UI uses money-management language: the review action is `استلام المبلغ`, the final action is `تأكيد استلام المبلغ`, and success is `تم استلام المبلغ بنجاح` only when the backend has actually closed the settlement.
- `period_start` and `period_end` are backend-generated settlement coverage fields and are display-only in the frontend.
- Backend remains the authority for settlement permissions; settled transactions are locked/read-only and the frontend must not offer raw transaction editing.
- Transaction correction is cancel payment with a required reason through the transaction cancel endpoint; do not add edit/void payment flows.
- Cancelled transactions remain visible and frontend code must not manually count them in payment totals.
- Transactions list defaults to the last 7 days using Egypt-local dates and supports date/status filters using the existing transaction query fields.
- Staff may access Transactions. Staff Transactions are backend Court-scoped, not creator-scoped, so the frontend must not force `created_by` to the current user for Staff.
- Transactions list supports URL query filters used by Summary cards, including date, date range, court, payment method, collected user, settlement status, cancellation status, and page.
- Direct Transactions visits default to the last 7 days only when the URL has no transaction filters; Summary redirect filters must not be overwritten by default dates.
- Transactions active filter chips must reflect the current URL/effective query params, and transaction filter links must be built with the shared query helper.
- Transactions collector filters must display staff/user names instead of raw IDs while still sending numeric user IDs to the backend.
- `/transactions` is product-labeled `معاملاتي المالية` for Staff and `سجل المعاملات المالية` for Owner/Manager. Keep route and API terminology unchanged internally. Owner/Manager do not see `/transactions` in primary Burger navigation.
- Transaction Boolean filters remain paired checkboxes: neither or both checked omits the query parameter; exactly one checked sends its scalar backend value. Court, payment method, and collector remain `AppSelect` controls.
- Staff Transactions must ignore URL `court`/`created_by` overrides, send the assigned Court only, and hide the collector selector. Owner/Manager may use named Court and collector filters.
- Transaction and settlement surfaces share the canonical payment-method labels and money formatter. Prefer historical names returned by finance responses and use calm unavailable/former-user copy instead of exposing raw user, Court, Booking, or Transaction IDs.
- Frontend transaction lists must not calculate settlement totals; backend Summary endpoints own financial totals.
- Transaction details show full meaningful transaction notes under `ملاحظات` with natural wrapping/newlines; blank/null/whitespace notes hide the whole Notes section. Do not add notes to Transaction list cards unless Product explicitly requests it.
- Sprint 7 implements backend-calculated dashboard, reports, and audit logs; these pages use `selectedClubSlug` from `useAuth()`.
- Dashboard and report financial metrics must come from backend summary/report endpoints. Do not fake numbers or manually count cancelled transactions in totals; cancelled transactions remain visible while backend summaries decide accounting.
- `/schedule` is the visible operational Home labeled `الرئيسية`. After login, Home navigation, and `NewBookingFAB`, land on Schedule. Do not create a second Home page.
- `/dashboard` remains routed as `المتابعة` for analytics. Do not spend this product pass fixing Dashboard-only bugs unless a shared API/helper is broken. Skip Dashboard as the normal landing page.
- `DashboardPage` stays in the repository as follow-up analytics, not as the normal user Home.
- Dashboard must not relabel `total_bookings` as upcoming bookings. Upcoming count, nearest HOLD expiry, next booking, and booking-level action cards render only when authoritative backend fields exist; never derive them from full booking history or Court hold policy.
- Dashboard action labels must reuse `getBookingActionPresentation()` when booking-level records become available. Aggregate-only action data links to filtered Bookings instead of duplicating booking lifecycle mutations or fabricating `BookingActionSheet` data.
- Staff Dashboard is always today-focused and assigned-Court scoped for period activity, shows read-only `عهدتي` from the Backend current-custody contract, and never exposes a settlement mutation. Employee custody actions use `canManageSettlements()` for Owner/authorized Manager only.
- Rolling `today - 6 days` Dashboard ranges are labeled `آخر 7 أيام`, and period-dependent labels stay neutral (`الحجوزات`, `التحصيل`) rather than falsely saying `اليوم`. Analytics and status breakdowns remain below operational sections.
- Dashboard Summary supports optional court scope; all-courts is the default and must omit `court`, while a selected court sends `court={id}`.
- Dashboard court option loading failures must show a local warning and must not block loading the main Summary data.
- Dashboard current custody must load independently from period analytics. Changing Today/Yesterday/`آخر 7 أيام` may refetch Dashboard Summary, but it must not refetch or redefine current custody unless the custody scope itself changes.
- Dashboard KPI links should preserve the selected court only for supported targets such as Bookings and Transactions.
- Every important Summary card should link to filtered Bookings, Transactions, or Settlement review pages using `buildPathWithQuery`.
- The frontend must not calculate current custody, unsettled money, financial dashboard totals, payment/refund net, or `needs_action_count`. Backend Summary owns period analytics, and Backend settlement current-custody endpoints own custody.
- Current Custody means the current unsettled financial state at this point in time. It must not inherit Dashboard dates, historical settlement ranges, transaction-list pages, or payment-method filters.
- Current Custody uses Backend `net_amount`, `transaction_count`, and `totals_by_payment_method` directly. The frontend may select the display state from those fields, but must not reduce transactions, use `Math.abs`, clamp negatives, or rebuild the signed net from PAYMENT/REFUND rows.
- Owner/authorized Manager all-employee current money uses one grouped `GET clubs/{club_slug}/settlements/unsettled-summary/` request. Do not load employees and then issue N preview/transaction requests to calculate custody.
- Current custody Court scope defaults to all accessible Courts by omitting `court`. Send `court={id}` only after an explicit user selection, and never initialize custody to `courts[0]` or a `firstCourt` fallback.
- Current custody display states are fixed: `transaction_count == 0` uses `لا توجد مبالغ مستحقة للتسليم حاليًا`; `transaction_count > 0 && net_amount == 0` uses `صافي المبلغ المستحق حاليًا: 0 ج.م`; positive net uses `المبلغ المستحق للتسليم: X ج.م`.
- Negative current custody has no finalized product copy. Preserve and display the signed Backend value without positive wording, empty-state normalization, or hiding the employee; report `PRODUCT/BACKEND CLARIFICATION PENDING` until a newer decision exists.
- Unsettled transactions are live open money. Do not use pending settlement drafts as any current-custody money source.
- Settlement preview is read-only review, and settlement confirmation closes transactions; do not build pending settlement draft UI.
- Settlement preview route is `/settlements/preview?collected_by=...` for another collector or `/settlements/preview` for the signed-in user's own backend-scoped preview.
- Settlement preview is a read-only review of unsettled transactions; empty preview is an empty state, not a scary error.
- Settlement preview UI must not use `dry_run` wording or lead with backend technical phrases. Use `الموظف المحصل`, `استلام المبلغ`, and `المعاملات المرتبطة`.
- `/settlements` is product-labeled `عهدتي` for Staff/restricted Managers and `إدارة الأموال` for Owner/authorized Managers. The management page heading may say `المبالغ مع الموظفين`; the current-custody section says `المبالغ الموجودة مع الموظفين حاليًا`. `/settlements/preview` remains the selected collector review page.
- Settlement hub shows current custody from Preview/self-preview or grouped current-custody summary, plus historical SETTLED records only when requested.
- Live unsettled money comes from the current-custody contract, not pending settlement drafts, Dashboard period activity, or transaction-page local calculations; do not build pending settlement draft UI or use `dry_run` wording in settlement UI.
- Settlement visibility and settlement management are separate capabilities. Staff and restricted Managers may view their own current settlement preview, while Owner and Managers with `can_manage_settlements` keep management mode.
- Own settlement preview uses `GET clubs/{club_slug}/settlements/preview/` without `collected_by`; do not create separate Staff/Manager/Owner settlement pages.
- Staff and restricted Managers can view their own settlement preview, history, and detail through backend self-scoped settlement authorization, but cannot create settlements, mark settlements settled, or manage another user's settlement.
- Owner can settle and manager can settle only when `can_manage_settlements` allows it.
- Settlement approval UI follows backend `can_approve`. Do not deny the action from `is_self_preview` alone. If `can_approve === true`, show `استلام المبلغ` even on self-preview (Owner self-settlement). If `can_approve === false` on self-preview, show `financeCopy.selfPreviewDenied`. Backend remains the authorization authority.
- Treat `NO_UNSETTLED_TRANSACTIONS` as a friendly custody empty state. After a settlement mutation 403, refresh `/me` once and never retry the mutation automatically.
- `SETTLEMENT_CONFLICT` and equivalent stale/candidate-changed settlement errors refresh the latest Preview/current custody instead of attempting frontend transaction-set reconciliation.
- Settlement management navigation and actions must use the centralized settlement permission helper; refresh `/me` after 403 settlement mutations and do not retry automatically.
- Completed bookings with remaining money are future financial warnings, not normal needs-action.
- Do not show fake zeroes while Summary data is loading.
- Summary action cards must build filtered links through `buildPathWithQuery`; do not hand-build query strings inside card components.
- Query params should be parsed through shared query helpers when practical, while keeping current `selectedClubSlug`/`useAuth()` club context unless a route explicitly requires otherwise.
- Summary links are UX navigation helpers only; backend remains the permission and data authority.
- Do not calculate unsettled money, needs-action counts, or financial dashboard totals in the frontend.
- Audit logs are read-only. Reports and audit access are role/permission-gated UX helpers, with backend remaining the authority.
- Reports access is role-based for allowed report roles and must not depend on settlement permission.
- Do not expose manual ID inputs for business entities; use named select/search fields for users, staff, courts, and actions while keeping backend IDs/enums as internal option values.
- Native browser `<select>` menus are not the default product-facing dropdown experience because their opened menu is controlled by the OS/browser and breaks the Sloty design system.
- Product-facing dropdowns must use the shared `src/shared/components/AppSelect/AppSelect.tsx`; features provide options/business values and `AppSelect` owns presentation and interaction.
- Do not create separate visual primitives such as `FeatureSelect`, `CourtSelect`, `PaymentSelect`, `FilterSelect`, or `AdminSelect`.
- AppSelect must stay RTL-first, mobile touch-friendly, keyboard-accessible, and use Sloty surface/border/green/soft-mint styling with Lucide ChevronDown and Check icons.
- Audit log action filters and displays must use Arabic business labels instead of raw enum values.
- Audit Log is business history, not a database inspector. List cards must stay summary-first: readable action, primary subject, one or two important business fields, actor when available, and event time.
- Audit log rich presentation must stay centralized in the audit presentation helper, use only list/detail response data, treat rich fields as optional, and never fetch related Booking/User/Court/Transaction/Settlement/Recurring details per row.
- Opening one Audit card may issue one `GET clubs/{club_slug}/audit-logs/{id}/` detail request. The detail response must render in `AppSheet` and must not fan out to current entity lookups.
- Audit presentation must prefer event-time Backend snapshot fields such as `actor_name`, `court_name`, `customer_name`, employee names, amounts, and timestamps. Do not reconstruct historical rows from current entities or make numeric IDs primary card content.
- Audit log before/after changes must render only known safe business fields; do not expose sensitive/internal fields such as passwords, tokens, auth payloads, secrets, or serializer/debug data.
- Unknown audit actions should prefer backend `action_label`, then a humanized action code, then the raw code; do not show a generic unknown-event label when the backend supplied a code.
- Deep-linked ID/enum query params should remain supported with graceful fallback labels such as `مستخدم #id` or the unknown action value.
- Filter option loading failures must show a local warning and must not block the main page data.
- Reports page uses the Court Usage Report endpoint `clubs/{club_slug}/reports/court-usage/`.
- Court Usage Report requires `date_from` and `date_to`; optional filters are `court`, `period`, `hour_from`/`hour_to` for `custom`, `staff`, and `status`.
- Court Usage Report does not use `payment_method`, raw court/staff ID inputs, or frontend-calculated money totals; render backend-calculated totals as returned.
- Court Usage Report status filter options are `HOLD`, `CONFIRMED`, `COMPLETED`, and `NO_SHOW`; `CANCELLED` and `EXPIRED` are not valid report status filters.
- Charts are deferred unless an existing charting package is already available; payment gateway, marketplace, commission, and player app logic are deferred.
- Booking slots may include `slot_price` and `UNAVAILABLE`; show selected slot price only as read-only booking context, do not submit invented price values, and keep `UNAVAILABLE` slots non-clickable with the Arabic fallback label `غير متاح`.
- Do not integrate `minimum_slot_price` or `maximum_slot_price` until the backend provides them.
- Weekly recurrence belongs to Booking through strict `is_recurring`, `recurrence_status`, and previous/next recurring Booking IDs; do not recreate a `RecurringAgreement`, recurring deposit, or recurring settlement product domain.
- Extend and reuse `AddBookingSheet` for recurring creation; do not create duplicate customer forms, phone inputs, recurring schedule pages, or recurring booking cards.
- `RECURRING_RESERVED` is the authoritative Schedule virtual state. Render it as `محجوز` with a subtle top-right `↻`; open `VirtualRecurringSlotDetailsSheet` from the selected slot and `recurring_context`. Never open `BookingActionSheet` with the anchor Booking pretending it is the future occurrence.
- Preserve `can_start_recurring` as tri-state: true means normal and weekly creation are available, false means only normal creation is available, and null means recurrence eligibility does not apply.
- Backend `recurring_blocked_reason` and `first_recurring_conflict_start` provide recurrence-conflict context; the frontend must not calculate conflicts or generate dates locally.
- Add Booking submits the checkbox directly as `is_recurring`; successful normal or recurring creation closes the form, refreshes the same Court/date slots, and uses the same `تم حجز الموعد بنجاح` feedback without opening Booking details automatically.
- Active recurrence ends through `POST clubs/{club_slug}/bookings/{id}/end-recurrence/`; normal Booking/Transaction cancellation and refund flows remain authoritative for their own domains.
- Cancelling or marking an active recurring Booking as no-show ends its recurrence; ending recurrence directly preserves the current Booking. Active recurring reschedule remains unsupported and hidden.
- Eligible active recurring completion loads `GET clubs/{club_slug}/bookings/{id}/recurrence-next/` only for `status === 'CONFIRMED' && is_recurring === true && recurrence_status === 'ACTIVE'`. Present backend `next_start_time`, `next_end_time`, `next_total_price`, `next_required_deposit`, `can_continue`, and `requires_payment_reference`. Never read nested `booking.recurrence_next`, calculate the next date/price/deposit, or send a next-deposit amount. Zero deposit hides payment fields; a positive deposit requires a payment method; reference is required only when the backend flag is true for a non-cash method.
- Staff recurring Court comes from `selectedMembership.court`; reuse the centralized Staff Court-scope helpers and do not add a separate role/Court matrix.
- Backend owns recurring occurrence generation, lifecycle enforcement, and future-occurrence cleanup; the frontend must not implement timers or local automatic cancellation.
- Expire and non-transaction financial actions are deferred to later sprints.
- Overnight working-hour ranges are deferred unless explicitly requested.
- Backend permission logic is outside frontend scope; frontend route guards are UX helpers, not security boundaries.
- Do not create backend auth, refresh, or permission assumptions beyond the agreed frontend token claims.
- Role navigation must be generated from `src/shared/navigation/navigation.config.ts` so desktop and mobile menus stay consistent.
- `/settings` is the Settings hub.
- `/settings/users` is the Users & Permissions page for Owner user management and Manager permission edits.
- Permission flags are membership-level flags and must be displayed with business Arabic labels, never backend flag names.
- Platform Admin and OWNER have pricing, working-hours, and settlement permissions by default.
- MANAGER permissions depend on the active selected club membership; never reuse permissions from a previously selected club.
- STAFF has no manager permissions.
- Club Settings must not contain manager permission controls or send manager permission fields through Club create/update payloads.
- Pricing edit actions must use the centralized pricing permission helper, and working-hours edit actions must use the centralized working-hours permission helper.
- Users & Permissions may add Manager/Staff memberships and edit existing Manager permission flags; it must not create Owner users or edit Staff/Owner permissions.
- `/clubs/{slug}/users/` returns the flattened `ClubUser` product list, while membership POST/PATCH returns the separate `ClubMembership` resource shape.
- Normal membership UI states are only `نشط` and `متوقف مؤقتًا` from `is_active`. Deactivation and reactivation PATCH only `is_active`, keep the row visible, and use `إيقاف المستخدم` / `تفعيل المستخدم`. Permanent removal DELETEs a Manager/Staff membership from the current club, removes/refetches its row, preserves historical business records, and never creates a `DELETED` card state or deletes the global account. Use `حذف المستخدم من النادي نهائيًا` and never offer it for Owner memberships.
- Users & Permissions badges use effective club-users fields (`can_change_pricing`, `can_manage_working_hours`, `can_manage_settlements`) and never raw backend field names.
- Backend remains the authority for permission enforcement.
- Authenticated pages use exactly one shell-level page header rendered by `AppShell` through `src/shared/components/PageHeader/PageHeader.tsx`; do not add duplicate visible page title cards inside shell pages.
- Authenticated route title/subtitle text must come from `src/shared/navigation/navigation.config.ts`; do not duplicate route title strings in feature components unnecessarily.
- Feature-specific buttons that previously lived beside a page title should use the layout-only `src/shared/components/PageActions/PageActions.tsx`.
- Never introduce parallel page-header implementations; `PageHeader` is the canonical visual page header.
- `PageHeader` keeps the original `.sloty-green-surface` visual in the transient page-context region. At scroll top the full context is visible. While scrolling, that context progressively fades and blurs, then disappears. The large header is not sticky. Only persistent navigation stays: Burger on the RTL start/top-right edge, and Home on the opposite/top-left edge for non-Home pages. Home is omitted on `الرئيسية`. Returning to the top restores full context. `RouteScrollReset` in `AppShell` resets window scroll on pathname/hash change, preserves hash targets, and ignores query-only live-search updates.
- Quick-search shortcuts start collapsed and auto-collapse once the live text-search draft changes to a meaningful query. The accordion trigger stays enabled; the user may expand it again while a query is present, and further typing auto-collapses it. Simple checkbox/select filters auto-refresh; do not add a redundant `عرض النتائج` button on those surfaces.
- Schedule follows `PageHeader` then booking controls, `AppDateNavigator`, the status legend, a lightweight non-sticky Schedule summary, operational sections, and the Court board. The summary must not render another `header`, green hero, page title, Club/date identity, or employee identity.
- The canonical header mobile hamburger is a right-side RTL menu button with three horizontal lines; hide it when desktop sidebar mode is active. Home sits on the opposite/top-left edge and must not share the burger's action group.
- The hamburger and mobile drawer are mobile-only; the drawer opens from the right and must close or be hidden when switching to desktop view.
- Desktop navigation uses the sidebar only; the mobile drawer must never render over the desktop sidebar.
- No authenticated role uses a mobile bottom navigation.
- Hide unfinished Platform Settings from primary navigation until that page is implemented.
- Mobile Overview must hide the desktop sidebar even on wide screens and keep the hamburger/drawer available.
- Desktop Overview must expose logout in the sidebar.
- Mobile navigation uses the shell header, hamburger drawer, and route-gated `NewBookingFAB`; desktop navigation uses the sidebar.
- Finance, admin, history, reports, audit, settlements, and settings links live in the hamburger menu and desktop sidebar.
- Primary drawer/sidebar club navigation contains only direct hub pages: `الرئيسية` (`/schedule`), `سجل الحجوزات`, role-aware finance (`إدارة الأموال` or Staff `معاملاتي المالية` + `عهدتي`), `التقارير`, and `الإعدادات`. `/dashboard` remains routed but is not a Burger item.
- Settings sub-pages live inside Settings; keep detail links such as `إعدادات الملاعب`, `المستخدمون والصلاحيات`, and `سجل النشاط` out of primary drawer/sidebar navigation.
- Do not restore a mobile footer or add a `المزيد` navigation item; use the hamburger icon, not a three-dots icon.
- Navigation finance labels are role-aware: Staff sees `معاملاتي المالية` and `عهدتي`; Owner and Managers with `canManageSettlements()` see `إدارة الأموال`, while restricted Managers see `عهدتي`. The Owner/Manager transaction ledger is secondary, not a Burger item.
- Authenticated feature pages must not render a second `PageHeader`; they receive the shared `PageHeader` from `AppShell`.
- Do not create custom page headers or alternate header systems when the canonical shell `PageHeader` fits the use case.
- Use `AppSelect` for categorical choices such as Court, status, payment method, collector, and role. Use checkbox controls for Boolean operational inclusion filters; related Boolean state choices may share a presentational `FilterCheckboxGroup` while features retain URL/API semantics.
- Raw backend ISO timestamps must not be intentionally exposed in product UI. Keep ISO values in API/query contracts and use shared `formatArabicDateTime()` for date-time presentation when it satisfies the feature.
- Refund eligibility explanations must flow from the affected booking occurrence, the Court notice period, the backend refund deadline, and the backend eligibility/result. `deposit_collected_at` is historical only and must never explain or determine refund eligibility.
- Keep one Sloty visual fingerprint across the project: Arabic-first, RTL-first, mobile-first, green brand system, rounded cards, shared `AppCard`/`AppButton` patterns, consistent spacing, and responsive layouts.
- Any new page must look like part of the same product, not a separate prototype.
- Do not create separate mobile and desktop business pages for the same workflow; share data/request flow and vary presentation only.
- Mobile/desktop view switches must change presentation only, not route, filters, data, or API behavior.

## Change Review

After every code change, review whether this `AGENTS.md` file needs an update.
