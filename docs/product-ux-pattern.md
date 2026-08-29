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
- The drawer stays flush to the right viewport edge with rounded exposed left corners. Logout is a comfortable muted-danger row with the Lucide LogOut icon.
- Mobile/desktop presentation follows the viewport automatically; production navigation has no manual `عرض سطح المكتب` / `عرض الهاتف` toggle.
- Owner/authorized Manager Burger: الرئيسية، سجل الحجوزات، إدارة الأموال، التقارير، الإعدادات. `/dashboard` is `المتابعة` and stays routed, not a Burger item. Audit remains a privileged extra, not a fake removal.
- Staff Burger: الرئيسية، سجل الحجوزات، معاملاتي المالية، عهدتي.

## Finance mental model

- Staff ledger and custody stay separate destinations.
- Owner/Manager money work happens on `/settlements` as `إدارة الأموال`. `/transactions` remains routable as an advanced ledger.
- Do not fabricate all-employee linked transactions, transaction search, or settlement→ledger filters when the Backend cannot provide the complete relation.
- Transaction history opens to all available history. Date shortcuts are explicit actions, not hidden defaults. Newest-first is the Product default; oldest is an explicit sort.
- Transaction notes belong to the hydrated detail surface after `عرض التفاصيل`. Empty notes hide the section. CASH hides payment reference; electronic methods may show `مرجع الدفع`.
- A settled, cancelled, refund, other-user, or authoritatively incomplete transaction does not expose `إلغاء المعاملة`.

## Booking-centric recurrence

- Recurrence is Booking metadata. Do not recreate RecurringAgreement domains, routes, or APIs.
- Concrete Booking rows open `BookingActionSheet`.
- Virtual `RECURRING_RESERVED` slots open `VirtualRecurringSlotDetailsSheet`.
- Never treat `recurring_anchor_booking_id` as the selected future occurrence Booking ID.
- Customer edit and reschedule are separate secondary sheets, not one combined editor.
- Recurring continuation preview comes from `GET recurrence-next/`, not from Booking list/detail.
- Opening an actual Booking details surface hydrates Booking Detail into `BookingActionSheet`. Virtual `RECURRING_RESERVED` does not fetch the anchor as the occurrence.

## Canonical sheets

- Temporary tasks use `AppSheet` dismissal: X, backdrop, Escape, browser/Android Back.
- Filter sheets should expose apply/reset actions, not a redundant Close when AppSheet already dismisses.
- Success feedback uses `AppSuccessNotice` (~3s). Errors requiring attention stay local.

## Server-backed lists

- Lists start without hidden filters unless Product explicitly defines one.
- Chronological paginated lists default to newest first. Where Backend confirms server ordering, expose the shared two-arrow `ListSortControl` immediately before result cards (`↓` newest / `↑` oldest). Do not use a dropdown for this compact control. Transaction ledgers for Staff and Owner/Manager share the same pattern. Booking History uses the same arrows mapped to appointment `start_time`.
- Search is debounced; simple checkbox/select and sort changes request immediately.
- Search/sort/filter refresh keeps previous results visible in `ResultRefreshRegion` and protects against stale responses.
- Reset returns Product defaults, never a legacy date window.
- A reduced list row is not the authoritative detail object. Detail-only fields load lazily on explicit detail interaction.

## Responsive rules

- Mobile-first, RTL-first, Arabic-first.
- Do not ship desktop as a centered phone mockup.
- Bottom navigation is removed; hamburger + Home + FAB cover mobile navigation.
