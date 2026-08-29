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
