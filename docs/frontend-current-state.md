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
- Centralized API error handling with Arabic backend messages, field-error helpers, and user-facing localization for known technical field names
- `/me` current-user hydration
- Post-login club selection
- No-club-access page
- Platform admin clubs/courts setup
- Egypt location dropdowns for club address
- International phone input with E.164 payload submission
- Court working hours setup through nested per-court weekly API
- Premium in-app Schedule date navigation through `AppDateNavigator`
- Shared product dropdown foundation through `AppSelect`
- Shared chronological two-arrow `ListSortControl` for server-ordered history lists
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
- Chronological paginated lists that have confirmed server ordering use the compact two-arrow `ListSortControl` immediately before result cards, on the visual left in RTL. `↓` is newest first; `↑` is oldest first. Do not use a dropdown for this control.
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
- Booking details use `إلغاء الحجز`, contain no backend-roadmap text, and show recurring context as `↻ حجز أسبوعي`. Strictly active recurrence shows an inline danger `إيقاف الحجز الأسبوعي` action, not a duplicate under `•••`; its container stays neutral. Stopping preserves the current Booking, while cancellation and no-show warn that they also end recurrence.
- Optional `hold_expires_at` is the sole HOLD countdown source. Missing/invalid deadlines omit countdown copy. Display remaining time only; do not promise automatic cancellation, and never derive a deadline from Court `internal_hold_expiry_hours` or booking creation time.
- Active recurring completion loads `GET .../recurrence-next/`. Backend date/time, total price, required deposit, `can_continue`, and `requires_payment_reference` drive the display. Continuing sends only next-deposit method/reference/notes when required; stopping sends `continue_recurring: false`. The frontend never calculates or sends the next deposit amount.
- Product date-time text uses shared `formatArabicDateTime()` rather than raw backend ISO timestamps while API and query values remain unchanged.
- Cancellation refund explanations use the affected booking time, backend notice period/deadline, and backend result. Deposit collection time is historical and is not a refund-eligibility basis.
- `/clubs/{slug}/users/` keeps its flattened `ClubUser` list shape, while membership mutations use a separate `ClubMembership` resource type. Memberships show only `نشط` or `متوقف مؤقتًا`; deactivation/reactivation PATCH only `is_active` and retain the row. Permanent Manager/Staff removal DELETEs only the club membership, warns that historical bookings/payments/operations remain, and removes/refetches the row without a `DELETED` UI state.
- Reuse shared `AppCard` and `AppButton` patterns
- Keep the green brand system, rounded cards, consistent spacing, and responsive layouts
- New pages should look like part of one product, not separate prototypes
- `AppSheet` is the canonical presentation and interaction shell for non-full-page tasks: mobile bottom sheet, desktop modal, neutral X, backdrop, Escape, browser/Android Back, focus restoration, internal scrolling, and generic overlay stacking. Feature components own dirty-form and domain decisions.
- Mobile no longer has a bottom navigation. It uses the global `PageHeader` (hamburger + Home), right-edge burger drawer, and the existing `NewBookingFAB`; desktop keeps the current sidebar. The viewport selects the presentation automatically, with no production view-mode toggle.
- The global `+ حجز جديد` action is mobile-only on authorized `/dashboard` and `/bookings` routes, hides while a drawer or sheet is open, and targets the existing `/schedule` flow without auto-opening Add Booking. It is hidden on `/schedule`.
- Recurrence is Booking metadata; the old recurring-agreement routes, API wrappers, types, and product screens are removed.
- Touched mobile text-entry controls use a 16px-equivalent font size. Temporary success feedback uses shared `AppSuccessNotice` (~3 seconds). Errors that need attention stay local and persistent.

## Known Next Tasks

1. Remove the optional club slug input from `LoginPage` if backend no longer needs it.
2. Active recurring reschedule, skip-week, and virtual-occurrence cancellation remain unsupported.
3. Payment gateway, marketplace, and player app remain deferred.
4. `/admin/settings` remains an intentional unfinished Platform Admin placeholder.

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
- Owner Court details expose the existing `requires_digital_payment_reference` checkbox through the existing Court PATCH flow. It applies to electronic methods only; CASH is unchanged.

## Schedule Date UX

- Schedule uses `AppDateNavigator` as the primary date selector, not a native browser date input.
- The navigator has a rolling 7-day strip, a fully clickable date trigger, and an in-app `@daypicker/react` calendar with Lucide icons.
- Mobile calendar presentation behaves like a bottom sheet; desktop behaves like a compact modal.
- Selecting a visible date changes only the selected date. Selecting a calendar date outside the visible range rebuilds the range from that date.
- Selected days use Sloty's rounded green treatment. Today uses a subtle amber HOLD-palette marker unless selected green is the primary state.
- Schedule controls are organized as the authorized Court selector when applicable, `اختار اليوم`, then `اختار المعاد`; the lower-weight status legend sits with the slot workspace.

## Transactions

- Payment corrections use the cancel payment flow with a required reason.
- Direct Transaction history loads all available server history; `اليوم` and `آخر 7 أيام` are explicit shortcuts, and reset returns to all plus newest-first.
- Transaction list ordering uses Backend `ordering=-created` / `ordering=created` through the shared two-arrow control for Staff (`معاملاتي المالية`) and Owner/Manager (`سجل المعاملات المالية`). `↓` newest is the default. Sort preserves filters, resets page, and refreshes the result region immediately before the cards.
- Transaction API requests and responses use `payment_reference`; Record Payment keeps `reference` only as form-local state and maps it at the API boundary.
- Cancelled transactions remain visible in the transaction list and are marked as cancelled.
- The list prioritizes signed amount, transaction/refund type, payment method, human booking time, Court, collector, and created time from the existing response. CASH never shows a payment reference on the row.
- `عرض التفاصيل` hydrates `GET transactions/{id}/` for that row only. Non-empty detail notes show `ملاحظات`; empty/whitespace notes hide the section.
- `إلغاء المعاملة` appears only when the response explicitly confirms an uncancelled, unsettled PAYMENT/legacy row owned by the current user. Missing authoritative booleans hide the action.
- Transaction filter/result refresh uses the non-blocking result-region pattern and request-generation protection.
- Settlement and cancellation Boolean filters stay as checkbox pairs; neither/both means all and omits the corresponding URL/API parameter.

## Booking History

- `/bookings` loads unrestricted server-paginated history when no URL filters are present; it no longer silently narrows the first visit to today. Previous/next controls preserve filters in the URL, and an emptied later page steps back safely.
- A visible `اسم العميل أو رقم الموبايل أو ملاحظة` field sends a debounced, URL-backed server `search` query and resets pagination without disturbing other filters. The current Backend contract still searches name/phone only, so notes remain a documented contract gap.
- External Search-chip removal synchronizes the URL value, visible draft, and pending debounce so removed text cannot return.
- `الحجوزات القادمة فقط`, `تحتاج إجراء`, and `بها مبلغ متبقي` are immediate URL-driven review checkboxes using `upcoming=true`, `needs_action=true`, and `has_remaining_amount=true`.
- Court, status, exact/range dates, overdue, ended, and HOLD-expiry filters use one shared responsive filter sheet. Staff does not load or display the Court selector; the request uses the assigned membership Court while ignoring and removing URL Court overrides.
- Upcoming filtering is backend-owned and is never derived from the loaded page.
- History cards show only customer, phone, human appointment/status, and optional recurrence. Full money and lifecycle review remains in the canonical `BookingActionSheet` after hydrating Booking Detail. URL filters and page are preserved through review and mutations.
- Booking History has no confirmed server ordering contract, so the frontend does not expose a newest/oldest control or reverse the loaded page.
