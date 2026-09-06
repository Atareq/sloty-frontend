# Product UX Patterns

Practical presentation baseline for the Sloty frontend.

## Source of truth

1. Current local working tree on the active UI branch
2. Confirmed backend contracts
3. Latest Product UX direction
4. Existing architecture/patterns
5. Docs/AGENTS (reconcile stale rules; do not restore old behavior from docs alone)

## Shell ownership

- `AppShell` owns authenticated chrome: `PageHeader`, hamburger drawer, desktop sidebar, and `NewBookingFAB`.
- Feature pages must not render a second page header.
- Back and Home remain distinct: Back is contextual; Home goes to `/schedule` (`الرئيسية`).
- On authenticated non-Home pages, PageHeader shows a visible `الرئيسية` Home affordance on the opposite/top-left edge from the burger. It is hidden on Home itself (`/schedule`).
- `PageHeader` uses the original `.sloty-green-surface` visual (`public/images/sloty-green-surface-bg.png`) for page context at the top of the page. That context is not a second page-level hero and is not a permanently sticky card.
- GLOBAL HEADER SCROLL RULE: full page context is visible at the top. While scrolling, page context (title, Sloty branding, club/court line, subtitle, and the green visual) progressively fades and blurs, then disappears. After the threshold, only persistent global navigation remains: Burger at RTL top-right, Home at top-left on non-Home pages. Home is absent on `الرئيسية`. The large header height does not remain as empty sticky space. Scrolling back to the top restores full context. AppSheet/modal internal scroll does not drive this.
- Route changes reset window scroll; query-only live search does not.
- `NewBookingFAB` (`+ حجز جديد`) appears on mobile for `/dashboard` and `/bookings` only. It is hidden on `/schedule`.
- Burger identity uses the current user name, club or Staff Court, and role. No `القائمة` title and no letter markers. Active items use soft mint + green + semibold weight.
- Owner/authorized Manager Burger: الرئيسية، سجل الحجوزات، إدارة الأموال، التقارير، الإعدادات. `/dashboard` is `المتابعة` and stays routed, not a Burger item. Audit remains a privileged extra, not a fake removal.
- Staff Burger: الرئيسية، سجل الحجوزات، معاملاتي المالية، عهدتي.

## Finance mental model

- Staff ledger and custody stay separate destinations.
- Owner/Manager money work happens on `/settlements` as `إدارة الأموال`. `/transactions` remains routable as an advanced ledger.
- Period activity answers “what happened during this date range?” and may use Dashboard/Transactions date filters.
- Current custody answers “who has club money right now?” and must come from Backend current-custody endpoints, not date-filtered Dashboard analytics or local Transaction reduction.
- Owner/authorized Manager current money defaults to `كل الملاعب` by omitting `court`; selecting a Court intentionally narrows the Backend custody request.
- Zero-net current custody with transactions remains visible. Negative current custody keeps the signed Backend value and waits for Product/Backend copy clarification.
- Offline Current Custody shows only the last successful Backend custody snapshot for the same user + Club + employee/Court scope. If that snapshot is absent, show internet-required copy rather than calculating from cached Transactions or showing a fake zero.
- Settlement preview asks the Backend for a fresh current-custody snapshot before confirmation. It is not copied from the grouped employee card and is not reconstructed from Transaction history.
- Settlement create asks the Backend to commit using current truth. The frontend accepts a newer success response or a structured stale/candidate-changed error, then refetches authoritative data instead of reconciling transaction sets locally.
- Successful payment, refund/cancellation, transaction cancellation, and settlement mutations should trigger the relevant current financial loaders again. Never subtract a preview amount from current custody or locally mark candidate rows settled.
- Do not fabricate all-employee linked transactions, transaction search, or settlement→ledger filters when the Backend cannot provide the complete relation.

## Booking-centric recurrence

- Recurrence is Booking metadata. Do not recreate RecurringAgreement domains, routes, or APIs.
- Concrete Booking rows open `BookingActionSheet`.
- Virtual `RECURRING_RESERVED` slots open `VirtualRecurringSlotDetailsSheet`.
- Never treat `recurring_anchor_booking_id` as the selected future occurrence Booking ID.
- Customer edit and reschedule are separate secondary sheets, not one combined editor.
- Recurring continuation preview comes from `GET recurrence-next/`, not from Booking list/detail.

## Operational notes

- Booking List cards may show backend-provided `booking.notes` directly when meaningful. Notes appear after customer/time/Court/status context, use the compact label `ملاحظة`, stay secondary, and are clamped to about two visible lines.
- Never fetch Booking Detail for every Booking List row to render notes. Full notes belong in the existing Booking details sheet.
- Booking details and Transaction details show full meaningful notes under `ملاحظات` and hide the whole Notes section when notes are null, empty, or whitespace-only.
- Transaction list cards do not show notes in this scope.

## Schedule period tone

- Morning and Evening are visual grouping context, not business status. `مواعيد الصباح` should read as warm, light, cream/daylight, while `مواعيد المساء` should read as deeper, calm, blue-gray/night-like.
- Apply the distinction to the period container/header surface. Do not recolor individual slot buttons by period.
- Slot statuses stay semantically consistent in both periods: FREE remains free, HOLD remains amber/deposit-pending, CONFIRMED/RECURRING_RESERVED remain reserved, and completed/no-show/unavailable states keep their existing tones.

## Canonical sheets

- Temporary tasks use `AppSheet` dismissal: X, backdrop, Escape, browser/Android Back.
- Filter sheets should expose apply/reset actions, not a redundant Close when AppSheet already dismisses.
- Success feedback uses `AppSuccessNotice` (~3s). Errors requiring attention stay local.

## Touch-safe forms

- Touch/coarse-pointer editable controls must keep at least 16px text even when tablet or wider breakpoints activate. Fine-pointer desktop layouts may retain compact form typography.
- Do not solve touch focus zoom by disabling user zoom. Keep pinch zoom available and avoid viewport restrictions such as `user-scalable=no` or `maximum-scale=1`.
- Customer phone placeholders use the canonical example `01X XXX XXXX`, visually muted from entered values and never set as a default value.

## PWA foundation

- Installation is a lightweight global surface; never place PWA promotion inside Schedule slots, Booking cards, or Transaction rows.
- Chromium uses the real browser install prompt. iOS Safari receives concise Add-to-Home-Screen guidance. Already-installed and unsupported environments stay quiet.
- Current install copy says Sloty opens faster from the Home Screen and may reference saved customer requests only as BookingIntent requests that still need confirmation. It must not promise offline booking creation, automatic booking, payments, cancellations, or settlements.
- App updates are always user-confirmed. Keep a waiting update pending while a modal task, sheet, drawer, or known full-page editor may contain unsaved work; do not auto-refresh operational screens.
- The Service Worker owns static application files and the update lifecycle, not authenticated business data. Structured Schedule/Booking/Transaction snapshots belong to the versioned IndexedDB layer with explicit user + Club ownership and Court-specific Schedule reads.
- Explicit logout uses the shared `AppSheet` confirmation and explains that cached on-device operational data will be removed and the next login requires connectivity. Cleanup completes before the auth session is released.
- Offline synchronization is infrastructure-owned, not page-owned. The authenticated shell mounts one coordinator that gives Schedule first priority, then Bookings and Transactions, then Current Custody, while coalescing startup/reconnect/resume/manual triggers.
- Connectivity copy must stay honest: browser online is only a hint. Schedule freshness copy says data may have changed; BookingIntent copy says the request is saved locally and waiting for confirmation. It must not imply the frontend recalculates availability or confirms a Booking offline.

## Offline Schedule

- Schedule renders cache-first for today + the next 30 Egypt-local calendar days after successful synchronization. It stores backend-generated slot snapshots only; the frontend never generates availability, prices, working hours, or recurrence.
- The three visible date states are distinct: cached slots, cached synchronized empty day, and no cached data. No cached data uses internet-required copy, not "no slots".
- Staff sees only the assigned Court cache. Manager/Owner selected-Court cache renders first; other authorized Courts sync in the background without interrupting the current Court.
- Offline Schedule can save a one-time customer BookingIntent from a cached FREE slot. The correct success is `تم حفظ طلب الحجز`, not Booking confirmation. Payment, cancellation, completion, no-show, editing, rescheduling, recurrence stopping, and new recurring booking creation still require internet.

## Offline Booking Request

- Booking Request is receptionist recovery for a customer request during connectivity loss. It is not a Booking, hold, or reservation.
- The existing booking sheet is reused. Offline/backend-unreachable mode changes the primary action to `احفظ طلب الحجز` and keeps name/phone/notes validation. Weekly recurrence intent is enabled only from cached Backend `can_start_recurring === true`.
- Saved requests start as `بانتظار التأكيد`. Task 5 does not auto-submit, replay HTTP requests, or expose a manual request `احجز الآن` action.
- `SYNCING` shows `جاري التأكيد...` and locks edit, alternative-slot, one-time conversion, and dismissal actions.
- Needs Review recovery should preserve customer name, phone, notes, `local_id`, and `client_request_id`. `SLOT_UNAVAILABLE` offers alternatives, `INVALID_CUSTOMER_DATA` offers customer-data editing, and `RECURRING_UNAVAILABLE` offers one-time conversion or another slot.
- Alternatives come only from refreshed/cached backend FREE slots. Do not generate slots or calculate recurrence/price locally, and do not silently downgrade a recurring request to one-time.

## Offline Booking History

- Booking History is server-authoritative online: server search, filters, pagination, and ordering stay unchanged.
- Offline/backend-unreachable Booking History uses only the complete previous-seven-calendar-day snapshot for the current user + selected Club. It must explain that cached data is limited.
- Local offline search covers customer name and phone. Notes search is not promised because detail notes may exist only for Bookings whose authoritative details were opened online.
- Local filters may use cached authoritative fields only: Court, status, date/date range inside the cache window, and remaining-money presence. Do not recreate Backend `needs_action`, `upcoming`, overdue, ended, HOLD-expiry, recurrence, pricing, cancellation, or refund classifications in the frontend.
- Cached Booking details are read-only. Action CTAs that mutate Booking/payment state are hidden or disabled with online-required copy, and no mutation is queued.

## Offline Transactions

- Transactions are server-authoritative online: current server filters and pagination stay unchanged, and unsupported server search/order controls are not added.
- Offline/backend-unreachable Transactions use only the complete previous-seven-calendar-day snapshot for the current user + selected Club. It must explain that cached data is limited.
- Local offline search covers payment reference only with the current contract. Transaction rows do not include complete customer name/phone, so the frontend does not promise customer search and does not fetch one linked Booking per Transaction row.
- Local filters may use cached authoritative fields only: date/date range inside the cache window, Court where role allows, collector where data exists, payment method, cancellation state, and settlement state. Do not calculate custody totals, settlement eligibility, refunds, or financial permissions locally.
- Local sorting is allowed only offline because it operates on the complete bounded cache. Online paginated results remain backend ordered.
- Cached Transaction details are read-only. Payment creation, cancellation, refunds, settlement creation/approval/receive, and all financial writes require internet and are never queued.

## Responsive rules

- Mobile-first, RTL-first, Arabic-first.
- Do not ship desktop as a centered phone mockup.
- Bottom navigation is removed; hamburger + Home + FAB cover mobile navigation.
- Activity Log is business history. The list is summary-first and uses Backend Audit snapshots; tapping a card opens one authoritative detail sheet. Do not turn cards into raw metadata dumps or reconstruct historical names from current entities.
