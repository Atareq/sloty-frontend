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
- Follow `docs/business-analysis.txt`, `docs/documentation.txt`, `docs/sprints.txt`, and `docs/ui-reference.md` when product or UI behavior is relevant.
- MVP 1 is a court management frontend foundation. Do not implement marketplace, player app, payment gateway, clubs, courts, bookings, transactions, settlements, or dashboard business logic until explicitly requested.
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
- Bottom navigation is mobile-only and should be hidden on desktop/tablet breakpoints.
- Floating action buttons are mobile-only unless intentionally redesigned.
- Desktop pages must use available space with max-width containers, grids, sidebars, or toolbars.
- Every new screen must be tested visually at mobile, tablet, and desktop widths.
- Use responsive Tailwind classes such as `sm:`, `md:`, `lg:`, and `xl:` intentionally.
- Do not blindly copy V0/Vercel prototype layout. Convert it into a real responsive web layout.
- Background images are decorative only. Dynamic booking slots must always be real React components.
- Booking Board shows only availability-related states: available, HOLD/reserved, confirmed/reserved, and cancelled-but-bookable.
- HOLD slots are visible reserved slots; they are not available and must not open the AddBookingSheet.
- Completed, payment, no-show, expired, and lifecycle statuses do not belong on Booking Board.
- Booking Board slot buttons must remain compact and show only the start time.

## Architecture Rules

- Keep shared components presentational and reusable.
- Keep feature-specific state and logic inside feature folders.
- Keep cross-feature primitives in `src/core`, reusable UI/helpers in `src/shared`, and app shell/route protection in `src/layout`.
- Use typed interfaces/types and avoid `any`.
- Add educational comments because this project is also used for frontend learning.
- Prefer JSDoc for services, hooks, API modules, models/types, reusable components, route guards/protected routes, and layout components.
- Avoid noisy comments that repeat obvious code.
- Keep documentation updated when architecture changes.

## Auth And API Rules

- API base URL must live in one shared config file; do not hardcode it across components.
- API endpoint paths must live in `src/shared/api/apiEndpoints.ts`; do not hardcode API URLs inside components.
- `apiRequest` must send `Accept-Language: ar` by default while preserving caller headers and explicit language overrides.
- Display backend localized API error messages when available, but make frontend logic depend on error code, HTTP status, and field names, never message text.
- Preserve backend `request_id` values on API errors for diagnostics without showing raw technical payloads to users.
- Map backend `field_errors` to local form fields when practical, and never show raw technical errors, stack traces, `undefined`, or `[object Object]` to users.
- Do not add a global toast for every API error; forms need local message and field-error handling.
- Egypt governorates/cities must come from `GET /egypt-locations/`; club forms must submit governorate/city codes, not Arabic or English labels, and must not hardcode Egypt location lists. Club address forms use governorate, city, and optional address; do not reintroduce `area`.
- Phone country/region selection is frontend UI only. Backend payloads must send one E.164 phone field such as `customer_phone` or `phone_number`; do not send `phone_region`, `country`, or calling-code fields.
- JWT role claims are used by the frontend for UX, navigation, and route protection.
- Components must use `useAuth()` instead of decoding tokens directly.
- Decode access tokens in the auth utility/provider layer only.
- `AuthProvider` owns session hydration and current-user profile loading from `apiEndpoints.auth.me`.
- Components should use `useAuth().currentUser` for displayed user profile data when available.
- `/me` is the post-login source of authenticated user context.
- `/me` includes `account_created_by` as nullable `User.created_by` display information; do not derive it from memberships or the current user.
- `/me` memberships are confirmed and used for frontend club-selection UX.
- Store only `selectedClubSlug` persistently; do not store full memberships or permissions as trusted authority.
- Manager permission flags live on the selected membership, not the club object: use `can_change_pricing`, `can_manage_working_hours`, and `can_manage_settlements`.
- If `/me` returns one membership, auto-select its club slug.
- If `/me` returns multiple memberships, show `/select-club`.
- If `/me` returns no memberships and the user is not platform admin, show `/no-club-access`.
- Backend remains the source of truth for permissions; do not trust frontend-selected club context without backend verification.
- Club-scoped pages should use `selectedClubSlug` and the current `selectedMembership` from `useAuth()`.
- Do not fetch all clubs just to pick the first active club for normal club users.
- Sprint 2A clubs/courts setup API calls must go through feature wrappers such as `clubsApi` and `courtsApi`.
- Sprint 2B court working-hours setup lives inside the courts feature; keep it separate from booking-slot generation.
- Court working-hours setup API calls belong in the courts feature wrapper/component.
- Court working hours use the nested court weekly endpoint `clubs/{club_slug}/courts/{court_id}/working-hours/`; do not use the old flat `court-working-hours/` endpoint.
- Working hours are weekly recurring rows for one court, saved as a full-week PUT; one court has up to seven numeric weekday rows (`0` Monday through `6` Sunday).
- Working Hours V2 uses native time inputs for same-day `blocks` per weekday, not `opens_at`/`closes_at`. Multiple same-day blocks are supported, overnight/next-day blocks are not supported, and the frontend must not send `end_day_offset`, `included_hours`, raw selected hours, or selected cells.
- Do not add holiday/Ramadan working-hour exceptions in MVP unless explicitly requested.
- Booking Board integration uses clubs, courts, working-hours, and bookings APIs to generate availability slots.
- Booking slots endpoint `clubs/{club_slug}/bookings/slots/` exists for future Schedule migration; `FREE` is response-only slot status and must not be added to actual `Booking.Status`.
- Future Schedule slots integration should use `slot.is_available` for clickability and `slot.label` for localized display.
- Booking Board must fetch working hours for the selected court only.
- Booking Board must generate slots from working-hour blocks and defer backend validation authority to the API.
- Booking Board must not show payment or lifecycle details.
- Schedule page uses one selected `YYYY-MM-DD` date value, with quick date buttons plus a real date picker.
- Booking Board hides/blocks past slots based on the current Africa/Cairo time; past selected dates are not bookable.
- Booking Board day/night split currently uses Sloty business cutoffs: day is 06:00 to before 18:00, and night is 18:00 to before 06:00, until backend provides dynamic thresholds.
- Sprint 3B creates bookings only from available/cancelled Booking Board slots; AddBookingSheet remains customer basics only.
- Sprint 3C adds confirmed booking details and cancel action only.
- Sprint 3D adds complete/no-show actions from confirmed booking details only.
- Sprint 4 adds basic transaction listing and confirmed-booking payment recording through `apiEndpoints.clubs.transactions`; transaction API calls go through `src/features/transactions/transactionsApi.ts`.
- Payment recording opens after booking through RecordPaymentSheet from confirmed details or the HOLD action sheet. Backend validates overpayment and permission rules.
- HOLD slots open a focused action sheet for adding payment or freeing/cancelling the slot through the current cancel flow.
- BookingCard click behavior must match slot status; available/cancelled open AddBookingSheet, HOLD opens the HOLD action sheet, and confirmed opens booking details.
- Existing booking details/actions must follow one reusable interaction model: Schedule, the future Schedule closing section, and `سجل الحجوزات` should open the shared booking action/details sheet instead of separate edit flows.
- Available/cancelled slots can create bookings; existing bookings open action/details. Completed bookings are locked/read-only and must never open AddBookingSheet.
- Raw transaction editing is forbidden; payment correction remains cancel payment with a required reason.
- Booking dates should include weekday plus date where operationally relevant.
- Schedule has a compact `حجوزات تحتاج إغلاق` section for today only. It shows at most 3 bookings needing payment/status closure, excludes CANCELLED, EXPIRED, empty slots, and fully closed completed bookings, links to `سجل الحجوزات` with `needs_action=true` when more items exist, and row clicks must open the shared booking action/details flow.
- The main schedule grid must not re-add past empty slots for the closing section.
- After payment, reload bookings and trust the backend-returned status; the frontend must not fake a CONFIRMED status.
- Complete booking requires the booking to be fully paid first; the frontend must not send `confirm_collect_remaining_cash` or `confirm_remaining_cash`.
- Booking Board remains availability-focused and must not show money on slot buttons.
- Sprint 5 lifecycle actions stay inside confirmed booking details: cancellation requires a reason sheet, complete requires explicit confirmation, and no-show uses a confirmation/reason sheet.
- Reschedule is deferred until a confirmed backend endpoint/contract exists; do not invent a PATCH flow or custom reschedule path.
- Hold expiry is backend-driven; the frontend must not fake expiry transitions.
- Completed, cancelled, no-show, and expired bookings are read-only when shown in booking details.
- Completed bookings block their slots on Booking Board and must never open AddBookingSheet or be treated as available.
- Booking Board remains availability-focused and must not show lifecycle/payment details on slot buttons.
- `/bookings` is a real filtered Bookings List page, separate from the Booking Board.
- Bookings List supports URL query filters used by Summary cards, and Summary redirects must not be overwritten by default page filters.
- Mobile filter UX uses quick filter buttons plus a `فلترة` button; advanced filters live in a sheet/drawer on mobile.
- Active filter chips must remain URL-driven and removable.
- Court filters must display court names instead of raw IDs while still sending numeric court IDs to the backend.
- Bookings List cards are clickable review entries that open the shared `BookingActionSheet`; do not create a separate booking edit flow or raw transaction edit entry from booking history.
- Booking Board remains availability-focused; Bookings List is for reviewing and filtering existing bookings.
- Completed bookings are locked/read-only. Completed bookings with remaining amount are financial warnings, not normal daily actions.
- The frontend must not calculate `needs_action`; backend summary/list filters own that action classification.
- Sprint 6 implements user-based settlement foundation: settlement pages use `selectedClubSlug`, owner can settle, manager can settle only when `selectedMembership.can_manage_settlements` allows it, and staff cannot settle.
- The new settlement flow selects a club user as `collected_by`; it must not use date-range settlement creation.
- Club users load from `clubs/{club_slug}/users/` and may be filtered by `role`, `court`, `is_active`, and `search`.
- Settlement preview uses `GET clubs/{club_slug}/settlements/preview/` with `collected_by` and optional `court`; do not use dry-run wording in the UI.
- Settlement confirmation posts `{ collected_by, court?, notes? }` to `clubs/{club_slug}/settlements/`; do not send `dry_run`, `date_from`, `date_to`, `period_start`, or `period_end`.
- Settlement confirmation must use a modal with clear money-safe wording. Empty/concurrency settlement results are friendly empty states, not scary errors.
- After settlement success, redirect to detail when an ID is returned or to the settlements page otherwise, and rely on remount/refetch for fresh data.
- The settlement UI must be a strict review-and-confirm flow: first action text is `مراجعة التسوية`, and final approval text is `تأكيد التسوية`.
- `period_start` and `period_end` are backend-generated settlement coverage fields and are display-only in the frontend.
- Backend remains the authority for settlement permissions; settled transactions are locked/read-only and the frontend must not offer raw transaction editing.
- Transaction correction is cancel payment with a required reason through the transaction cancel endpoint; do not add edit/void payment flows.
- Cancelled transactions remain visible and frontend code must not manually count them in payment totals.
- Transactions list defaults to the last 7 days using Egypt-local dates and supports date/status filters using the existing transaction query fields.
- Transactions list supports URL query filters used by Summary cards, including date, date range, court, payment method, collected user, settlement status, cancellation status, and page.
- Direct Transactions visits default to the last 7 days only when the URL has no transaction filters; Summary redirect filters must not be overwritten by default dates.
- Transactions active filter chips must reflect the current URL/effective query params, and transaction filter links must be built with the shared query helper.
- Transactions collector filters must display staff/user names instead of raw IDs while still sending numeric user IDs to the backend.
- Frontend transaction lists must not calculate settlement totals; backend Summary endpoints own financial totals.
- Sprint 7 implements backend-calculated dashboard, reports, and audit logs; these pages use `selectedClubSlug` from `useAuth()`.
- Dashboard and report financial metrics must come from backend summary/report endpoints. Do not fake numbers or manually count cancelled transactions in totals; cancelled transactions remain visible while backend summaries decide accounting.
- `DashboardPage` is the Summary / Owner Home control center: lightweight, current, action-oriented, and backed by the backend dashboard summary response.
- Every important Summary card should link to filtered Bookings, Transactions, or Settlement review pages using `buildPathWithQuery`.
- The frontend must not calculate unsettled money or `needs_action_count`; backend Summary owns those counts and money values.
- Unsettled transactions are live open money. Do not use pending settlement drafts as the dashboard money source.
- Settlement preview is read-only review, and settlement confirmation closes transactions; do not build pending settlement draft UI.
- Settlement preview route is `/settlements/preview?collected_by=...` and uses `GET clubs/{club_slug}/settlements/preview/`.
- Settlement preview is a read-only review of unsettled transactions; empty preview is an empty state, not a scary error.
- Settlement preview UI must not use `dry_run` wording or backend technical phrases. Use "الموظف المحصل", "مراجعة التسوية", and "دفعات غير مسواة".
- `/settlements` is the settlement hub/list page for `التسويات المالية والجرد`; `/settlements/preview` is only the selected collector review page.
- Settlement hub shows actual settlement records and safe shortcuts to Summary/Transactions for reviewing live unsettled money.
- Live unsettled money comes from Summary/Transactions, not pending settlement drafts; do not build pending settlement draft UI or use `dry_run` wording in settlement UI.
- Staff cannot access settlement management; owner can settle and manager can settle only when `can_manage_settlements` allows it.
- Completed bookings with remaining money are future financial warnings, not normal needs-action.
- Do not show fake zeroes while Summary data is loading.
- Summary action cards must build filtered links through `buildPathWithQuery`; do not hand-build query strings inside card components.
- Query params should be parsed through shared query helpers when practical, while keeping current `selectedClubSlug`/`useAuth()` club context unless a route explicitly requires otherwise.
- Summary links are UX navigation helpers only; backend remains the permission and data authority.
- Do not calculate unsettled money, needs-action counts, or financial dashboard totals in the frontend.
- Audit logs are read-only. Reports and audit access are role/permission-gated UX helpers, with backend remaining the authority.
- Court Usage Report endpoint exists at `clubs/{club_slug}/reports/court-usage/`; it does not use `payment_method`.
- Charts are deferred unless an existing charting package is already available; payment gateway, marketplace, commission, and player app logic are deferred.
- Do not integrate `pricing_periods`, `slot_price`, `pricing_configured`, `minimum_slot_price`, or `maximum_slot_price` until the backend provides them.
- Expire and non-transaction financial actions are deferred to later sprints.
- Overnight working-hour ranges are deferred unless explicitly requested.
- Backend permission logic is outside frontend scope; frontend route guards are UX helpers, not security boundaries.
- Do not create backend auth, refresh, or permission assumptions beyond the agreed frontend token claims.
- Role navigation must be generated from `src/shared/navigation/navigation.config.ts` so desktop and mobile menus stay consistent.
- `/settings` is the Settings hub.
- `/settings/users` is the read-only Users & Permissions page.
- Permission flags are membership-level flags and must be displayed with business Arabic labels, never backend flag names.
- OWNER has full settings and permissions access by default.
- MANAGER permissions depend on `can_change_pricing`, `can_manage_working_hours`, and `can_manage_settlements`.
- STAFF cannot manage permissions.
- Users & Permissions remains read-only until a backend PATCH endpoint for editing permissions is confirmed.
- Backend remains the authority for permission enforcement.
- Authenticated pages use the reusable unified green header from `AppShell`; do not add duplicate visible page title cards inside shell pages.
- The unified header mobile hamburger is a right-side RTL menu button with three horizontal lines; hide it when desktop sidebar mode is active.
- The hamburger and mobile drawer are mobile-only; the drawer opens from the right and must close or be hidden when switching to desktop view.
- Desktop navigation uses the sidebar only; the mobile drawer must never render over the desktop sidebar.
- Mobile footer contains only `لوحة التحكم`, `الجدول`, and `سجل الحجوزات`.
- Finance, admin, history, reports, audit, settlements, and settings links live in the hamburger menu and desktop sidebar, not in the mobile footer.
- Primary drawer/sidebar club navigation contains only direct hub pages: `لوحة التحكم`, `الجدول`, `سجل الحجوزات`, `سجل المعاملات المالية`, `التسويات المالية والجرد`, `التقارير الاستهلاكية للملاعب`, and `الإعدادات`.
- Settings sub-pages live inside Settings; keep detail links such as `إعدادات الملاعب`, `المستخدمون والصلاحيات`, and `سجل النشاطات` out of primary drawer/sidebar navigation.
- Do not add a mobile footer item called `المزيد`; use the hamburger icon, not a three-dots icon.
- Logout and change-club actions belong in the account menu, not the visible header area.
- Default authenticated experience is mobile-style, and users can switch to Desktop View from the hamburger menu.
- Navigation labels must use the approved Arabic wording: `لوحة التحكم`, `الجدول`, `سجل الحجوزات`, `سجل المعاملات المالية`, `التسويات المالية والجرد`, `سجل النشاطات`, `التقارير الاستهلاكية للملاعب`, and `الإعدادات`.
- Every new page must use the repo shared `PageHeader` by default unless there is a clear reason not to.
- Do not create custom page headers when `PageHeader` fits the use case.
- Keep one Sloty visual fingerprint across the project: Arabic-first, RTL-first, mobile-first, green brand system, rounded cards, shared `AppCard`/`AppButton` patterns, consistent spacing, and responsive layouts.
- Any new page must look like part of the same product, not a separate prototype.

## Change Review

After every code change, review whether this `AGENTS.md` file needs an update.
