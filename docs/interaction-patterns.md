# Interaction Patterns

## PageHeader

Authenticated pages receive exactly one shell `PageHeader` from `AppShell`.
Feature pages must not render a second page title card.

### Global header scroll

- At the top of the page, full header/page context is visible (title, Sloty branding, club context, subtitle, original green visual).
- While scrolling down, that page context progressively fades and blurs, then disappears.
- The large header is not `position: sticky`. It must not remain as a floating rectangle.
- After collapse, only persistent global navigation remains: Burger (RTL top-right) and Home (top-left) on non-Home pages.
- On `الرئيسية`, Home is omitted before and after collapse; only Burger remains.
- Persistent controls do not fade, blur, or jump.
- Scrolling back to the top restores full context.
- New routes start at `scrollTop = 0`, so the header starts expanded.
- Use window/document scroll only. AppSheet/modal internal scrolling must not collapse the header.

## Home

On authenticated non-Home pages, PageHeader shows a visible Home affordance labeled `الرئيسية`.
It always navigates to `/schedule`.
It is hidden on Home itself so the page title is not duplicated as a button.
On mobile it sits on the opposite/top-left header edge from the burger.

Home and Back remain distinct:

- Home → `/schedule`
- Back → contextual history or sheet dismissal

## Burger

Mobile: hamburger is visible on the RTL start/top-right edge. The drawer opens from the RTL/right side, with backdrop.
Desktop: hamburger is hidden, the mobile drawer is unavailable, and the sidebar is visible.
Do not place Burger and Home on the same header side.
Both consume `navigation.config.ts`.
If the layout crosses into desktop view, the drawer closes.
The drawer header is identity (name, club/Court, role), not `القائمة`.
Do not add section headings when the nav list is short enough to read without them.
Use Lucide icons from the navigation config; do not use letter markers.

## FAB

Canonical `NewBookingFAB` label: `+ حجز جديد`.

Show on mobile `/dashboard` and `/bookings` only.
Hide on `/schedule`, while a sheet/drawer is open, and in desktop view.
Navigate to `/schedule` without auto-opening Add Booking.

## AppSheet

Temporary UI uses `AppSheet`:

- mobile: bottom sheet
- desktop: centered modal

Dismiss: X, backdrop, Escape, browser/Android Back.

## Dirty forms

Feature code intercepts close when genuine unsaved input would be lost.
`UnsavedChangesPrompt` asks to continue editing or discard.
Read-only sheets close directly.

## FilterSheet

FilterSheet is an AppSheet. Expected actions: `تطبيق الفلاتر` and `إعادة ضبط`.
Do not add a redundant bottom `إغلاق`; the sheet X already dismisses.

## Success notice

`AppSuccessNotice` owns temporary success presentation, placement, accessibility, and ~3s auto-dismiss.
Features own the message string.
Do not route important errors through this primitive.

## PWA install and updates

- Install and update handling is global infrastructure under `src/pwa`, not feature-page logic.
- Chromium shows `ثبّت Sloty على الموبايل` only after a captured browser `beforeinstallprompt`. Unsupported environments and standalone/installed mode show nothing.
- iOS Safari shows `لتثبيت Sloty على الآيفون` with Share → Add to Home Screen instructions and no fake install button.
- `مش دلوقتي` dismisses install promotion for the current application session without creating a permanent marketing preference.
- Install copy promises faster Home Screen access and may mention saved customer requests only as requests that still need confirmation. Do not claim offline booking creation, automatic booking, payments, cancellations, or settlements.
- A waiting app version shows `في تحديث جديد لـ Sloty` with `تحديث الآن` and `لاحقًا`. Discovery never reloads automatically.
- PWA notices remain hidden while any modal task, AppSheet, or drawer is active and on known full-page editor routes without shared dirty-state reporting. Pending updates can be offered after the user closes or leaves that work.

## Offline storage and logout

- IndexedDB access stays behind scoped repositories; Schedule, Bookings, and Transactions pages must not call Dexie tables directly.
- Schedule reads its scoped repository cache for `scope + Court + date` and never reads another Court/Club as a fallback.
- Last-known `offline_context` is a cache-ownership hint from a successful `/me` + selected membership, never an offline login or routing authority.
- Explicit logout opens the canonical `تسجيل الخروج؟` AppSheet, warns that on-device offline data will be removed, awaits user-owned IndexedDB cleanup, then clears the existing auth state and selected Club.
- Session expiry is not explicit logout and does not automatically delete scoped cached snapshots.

## Offline synchronization

- `OfflineSyncProvider` is the one authenticated lifecycle owner for operational synchronization.
- Pages must not attach their own business-data `online`, `offline`, or `visibilitychange` sync listeners.
- Startup, reconnect, resume, retry, and manual refresh requests coalesce through the same coordinator instead of issuing duplicate same-scope dataset runs.
- Schedule always receives first network priority. BookingIntent recheck runs only after relevant Schedule rows are successfully persisted. Bookings and Transactions run after Schedule settles and fail independently.
- Browser online/offline state is a hint. Backend reachability is based on real dataset request outcomes.
- Schedule synchronization fetches today + next 30 days from the backend slots range endpoint and replaces each Court window atomically. Selected Manager/Owner Court runs before other authorized Courts.
- Booking synchronization fetches the complete previous 7 Egypt-local calendar days from the server Booking list, following pagination to `next = null` before one atomic scoped replacement.
- Transaction synchronization fetches the complete previous 7 Egypt-local calendar days from the server Transaction list, following pagination to `next = null` before one atomic scoped replacement. It runs only in the secondary phase with Bookings.
- SchedulePage may read cache, request manual sync, and observe coordinator completion. It must not attach its own global online/offline/resume listeners.
- BookingIntent review is owned by the Schedule/coordinator flow, not by a separate page or browser online listener.
- Booking History must not own canonical sync. Online search/filter/pagination remains server-backed; offline/backend-unreachable mode reads the scoped seven-day snapshot locally.
- Transactions must not own canonical sync. Online filters/pagination remain server-backed; offline/backend-unreachable mode reads the scoped seven-day snapshot locally.

## Offline Schedule interactions

- With cached slots, render the board immediately and show last-update context when useful. Failed refresh keeps the cached board visible.
- With a cached empty day, show the backend/fallback empty-day message as a legitimate synchronized state.
- With no cached day while offline/unreachable, show internet-required copy and a `حاول مرة تانية` action wired through the coordinator/manual refresh path.
- Dates outside the 31-day Schedule window require internet; do not silently grow unlimited local Schedule history.
- Offline/backend-unreachable FREE slots may save a one-time BookingIntent through the existing booking sheet. Other business actions remain online-only: payment, cancel, complete, no-show, edit, reschedule, stop recurrence, and recurring booking creation show `يحتاج اتصال بالإنترنت` or disabled online-required copy and do not queue writes.

## Offline BookingIntent interactions

- Offline save uses the existing booking sheet with `احفظ طلب الحجز`. It saves a local customer request only, starts as `PENDING_RECHECK`, and shows `تم حفظ طلب الحجز` / `بانتظار التأكيد`.
- Never show `تم الحجز` or Booking success copy until the existing Backend `createBooking()` call succeeds after manual employee action.
- Schedule/Operational Home shows active requests in-place: `PENDING_RECHECK`, `READY_TO_BOOK`, `CONFLICT`, and `EXPIRED`. `BOOKED` and `DISMISSED` do not clutter the active queue.
- Reconnect order is Schedule refresh first, intent recheck second, and never auto-submit. A raw browser online event must not call Booking creation.
- `READY_TO_BOOK` exposes `احجز الآن` only while online/reachable. The final request uses existing Booking API fields and must not send `local_id`.
- A final slot-unavailable Backend error turns the intent into `CONFLICT` and preserves customer name, phone, and notes. Generic network failure does not become conflict.
- `CONFLICT` offers `اختار معاد تاني`; alternatives are presentation-ranked from already refreshed Backend FREE slots only. Selecting one preserves customer data and reclassifies against the cached authoritative row.
- `EXPIRED` means the requested appointment time has passed using Egypt-local schedule helpers. It may be dismissed or moved to an alternative slot where the current UX supports that recovery.

## Offline Booking History interactions

- With a cached seven-day Booking snapshot, `/bookings` renders cached cards while offline/backend-unreachable and shows last-update context without an online badge.
- Offline search is local and limited to cached customer name and phone. Do not imply complete notes search unless every cached row carries notes.
- Supported offline filters are only cached-field filters: Court, status, date/date range inside the seven-day window, and positive remaining amount. Backend-derived filters such as `needs_action`, `upcoming`, `overdue`, `ended`, and `hold_expiring` require internet unless an authoritative cached field is added later.
- A date outside the seven-day cache window shows internet-required copy, not an authoritative empty result.
- Booking cards open the canonical `BookingActionSheet` in read-only mode. Use cached detail if it was fetched online before; otherwise show the safe list fields and hide missing optional sections.
- Booking mutations from History remain online-only. Payment, cancel, complete, no-show, customer edit, reschedule, and recurrence stop must not POST/PATCH while offline and must not be queued.

## Offline Transaction interactions

- With a cached seven-day Transaction snapshot, `/transactions` renders cached cards while offline/backend-unreachable and shows last-update context without an online badge.
- Offline search is local and limited to cached payment reference. Do not imply customer name/phone search because the current Transaction list contract does not include complete customer context.
- Supported offline filters are cached-field filters: date/date range inside the seven-day window, Court where role allows, collector where data exists, payment method, cancellation state, and settlement state.
- A date outside the seven-day cache window shows internet-required copy, not an authoritative empty result.
- Offline sorting uses the visible newest/oldest controls only against the complete cached dataset. Online paginated Transaction results are not client-sorted as a fake global order.
- Transaction cards open a read-only `AppSheet` detail surface. Use cached detail if it was fetched online before; otherwise show the safe list fields and hide missing optional sections. CASH rows hide payment reference; digital rows show it only when present.
- Transaction financial mutations remain online-only. Payment creation, transaction cancellation, refunds, settlement creation/approval/receive, and every other POST/PATCH/DELETE financial operation must not fire while offline and must not be queued.

## Errors

Errors that need attention stay local and persistent.
Do not auto-dismiss them.

## Destructive confirmation

Cancellation, no-show, settlement confirmation, and membership removal keep explicit confirmation copy.
Do not hide those behind a generic `حفظ` / `تنفيذ`.
Membership DELETE confirmation must say the global User account is not deleted, historical records remain, and club access is lost.

## Booking secondary edits

Customer data edit (`تعديل بيانات الحجز`) and reschedule (`تغيير الموعد`) are separate AppSheet tasks opened from `••• خيارات أخرى`.
Do not combine them. After customer PATCH, refetch Booking detail. After reschedule, refetch Booking and underlying Schedule/History.

## Live search

History, Settings users, and other server-backed searchable lists use `LiveSearchField`.
The input stays mounted and focused.
Only the results region refreshes after ~350ms debounce.
Older responses must not overwrite newer queries (`useRequestGeneration`).
Query-only URL updates must not reset page scroll.

TEXT SEARCH:
- debounce
- keep input focused
- preserve query
- preserve old results
- result-area loading only
- ignore/cancel stale requests

CHECKBOX/SELECT:
- auto-update simple filters
- no redundant Apply / `عرض النتائج`
- same results refresh feedback

Quick-search shortcuts start collapsed (`اختصارات البحث السريع`) and auto-collapse when the live search draft changes to meaningful text. The accordion trigger stays enabled so the user can expand it again while a query is present; further typing auto-collapses it again.

## Date navigation

Schedule uses `AppDateNavigator` as the only selected `YYYY-MM-DD` source.
Selecting a visible date changes selection only.
Selecting an outside date rebuilds the visible 7-day range.

## Post-load scroll

After an explicit date selection, load that date's slots then scroll once to `اختار المعاد`.
Initial load and Court changes must not auto-scroll.

## Responsive behavior

Mobile-first, RTL-first. Desktop uses available width; it must not look like a centered phone mockup.
Bottom navigation is removed.
Desktop view always exposes `عرض الهاتف` outside hidden mobile-only UI.
