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
- Do not fabricate all-employee linked transactions, transaction search, or settlement→ledger filters when the Backend cannot provide the complete relation.

## Booking-centric recurrence

- Recurrence is Booking metadata. Do not recreate RecurringAgreement domains, routes, or APIs.
- Concrete Booking rows open `BookingActionSheet`.
- Virtual `RECURRING_RESERVED` slots open `VirtualRecurringSlotDetailsSheet`.
- Never treat `recurring_anchor_booking_id` as the selected future occurrence Booking ID.
- Customer edit and reschedule are separate secondary sheets, not one combined editor.
- Recurring continuation preview comes from `GET recurrence-next/`, not from Booking list/detail.

## Canonical sheets

- Temporary tasks use `AppSheet` dismissal: X, backdrop, Escape, browser/Android Back.
- Filter sheets should expose apply/reset actions, not a redundant Close when AppSheet already dismisses.
- Success feedback uses `AppSuccessNotice` (~3s). Errors requiring attention stay local.

## Responsive rules

- Mobile-first, RTL-first, Arabic-first.
- Do not ship desktop as a centered phone mockup.
- Bottom navigation is removed; hamburger + Home + FAB cover mobile navigation.
