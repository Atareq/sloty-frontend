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
- Booking Board read-only slots
- Manual booking creation
- Booking details cancel / complete / no-show actions
- Sprint 4 payment recording from confirmed booking details
- Sprint 5 booking lifecycle foundation from confirmed booking details
- Reschedule is deferred until the backend exposes a confirmed contract
- Sprint 6 settlement foundation with preview, create, history, and detail pages
- Transaction cancel payment foundation
- Basic transactions API/list foundation

## Routing Highlights

- `/login`
- `/select-club`
- `/no-club-access`
- `/dashboard`
- `/schedule`
- `/transactions`
- `/settings/courts`
- `/settings/courts/:courtId`
- `/settlements`
- `/settlements/history`
- `/settlements/:settlementId`
- `/admin/clubs`
- `/admin/clubs/:clubSlug/courts`

## `/me` Club Selection Flow

- `/me` is the post-login source of authenticated user context.
- `/me` memberships are confirmed and used for club-selection UX.
- Manager permissions are read from the selected membership, not the club object.
- Persist only `selectedClubSlug`.
- `0` memberships and not platform admin: `/no-club-access`
- `1` membership: auto-select its club slug, then enter `/dashboard`
- `2+` memberships: `/select-club` unless a valid stored selection already exists
- Platform admin: can access `/admin/clubs` without `selectedClubSlug`
- Backend remains the source of truth for permissions

## API Error Handling

- `apiRequest` sends `Accept-Language: ar` by default while preserving explicit caller headers.
- Backend localized `message`, stable `code`, `field_errors`, `details`, and `request_id` are preserved by `ApiClientError`.
- UI logic must use code/status/field names rather than Arabic message text, and form pages should map backend `field_errors` near relevant inputs when practical.

## UI Rules

- Authenticated pages receive the shared `PageHeader` from `AppShell`; feature pages must not render a second page header.
- Feature-specific page buttons use the shared layout-only `PageActions` component when they need to sit below the shell header.
- Product-facing dropdowns use shared `AppSelect` instead of native browser select menus.
- Categorical filters remain `AppSelect`; Boolean operational inclusion conditions use checkboxes, with shared `FilterCheckboxGroup` available for related Boolean state choices.
- Active filter chips are fully clickable removable buttons, not nested icon-only controls.
- Schedule uses the shell `PageHeader` as its only page identity header. Its local order is booking controls, `AppDateNavigator`, status legend, lightweight summary, closing actions, then the Court board; the summary is not sticky and does not repeat title, Club/date, or user identity.
- Product date-time text uses shared `formatArabicDateTime()` rather than raw backend ISO timestamps while API and query values remain unchanged.
- Cancellation refund explanations use the affected booking time, backend notice period/deadline, and backend result. Deposit collection time is historical and is not a refund-eligibility basis.
- `/settings/users` permanent deletion, when backend DELETE support is confirmed, deletes only a Manager/Staff membership from the selected club and never the global user account. Owner memberships are excluded.
- Reuse shared `AppCard` and `AppButton` patterns
- Keep the green brand system, rounded cards, consistent spacing, and responsive layouts
- New pages should look like part of one product, not separate prototypes

## Known Next Tasks

1. Remove the optional club slug input from `LoginPage` if backend no longer needs it.
2. Add reschedule only after backend exposes a confirmed endpoint/contract; do not reuse detail PATCH speculatively.
3. Payment gateway, reports, audit logs, and pilot hardening remain deferred.

## Settlements

- Sprint 6 settlement foundation is implemented for review, confirmation, history, and detail.
- Settlement pages use `selectedClubSlug`; owner can settle, and manager access depends on `can_manage_settlements`.
- Settlement preview uses `GET clubs/{club_slug}/settlements/preview/`; confirmation posts `{ collected_by, court?, notes? }` to `clubs/{club_slug}/settlements/`.
- Settled transactions are shown as locked/read-only. Cancelled transactions remain visible and are not manually counted in frontend totals.

## Dashboard, Reports, And Audit Logs

- Sprint 7 dashboard, reports, and audit foundation is implemented.
- Dashboard, reports, and audit pages use `selectedClubSlug` and backend endpoints for metrics and log data.
- Financial metrics come from backend summary/report responses only; the frontend does not calculate revenue or cancelled-payment totals from raw rows.
- Reports and audit logs are read-only. Sprint 8 is QA and pilot hardening.

## Working Hours

- Working hours now use `clubs/{club_slug}/courts/{court_id}/working-hours/`.
- The old flat `court-working-hours/` endpoint is removed from frontend usage.
- Court settings saves the full weekly schedule with PUT using numeric weekdays (`0` Monday through `6` Sunday).
- Working Hours uses period-based `pricing_periods` rows instead of `opens_at`/`closes_at`.
- Overnight working-hour ranges are not supported in this version, and Booking Board uses backend-generated slots.

## Schedule Date UX

- Schedule uses `AppDateNavigator` as the primary date selector, not a native browser date input.
- The navigator has a rolling 7-day strip, a fully clickable date trigger, and an in-app `@daypicker/react` calendar with Lucide icons.
- Mobile calendar presentation behaves like a bottom sheet; desktop behaves like a compact modal.
- Selecting a visible date changes only the selected date. Selecting a calendar date outside the visible range rebuilds the range from that date.
- Selected days use Sloty's rounded green treatment. Today uses a subtle amber HOLD-palette marker unless selected green is the primary state.
- Schedule controls are organized as title/Court selector, then date navigation, then the lower-weight status legend.

## Transactions

- Payment corrections use the cancel payment flow with a required reason.
- Cancelled transactions remain visible in the transaction list and are marked as cancelled.
