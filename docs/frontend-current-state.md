# Frontend Current State

This file is a short implementation reference for the current Sloty React frontend.

Source-of-truth order:
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
- `/me` current-user hydration
- Post-login club selection
- No-club-access page
- Platform admin clubs/courts setup
- Egypt location dropdowns for club address
- International phone input with E.164 payload submission
- Court working hours setup through nested per-court weekly API
- Booking Board read-only slots
- Manual booking creation
- Booking details cancel / complete / no-show actions
- Sprint 4 payment recording from confirmed booking details
- Sprint 5 booking lifecycle foundation from confirmed booking details
- Reschedule is deferred until the backend exposes a confirmed contract
- Basic transactions API/list foundation

## Routing Highlights

- `/login`
- `/select-club`
- `/no-club-access`
- `/dashboard`
- `/schedule`
- `/transactions`
- `/admin/clubs`
- `/admin/clubs/:clubSlug/courts`

## `/me` Club Selection Flow

- `/me` is the post-login source of authenticated user context.
- `/me` memberships are confirmed and used for club-selection UX.
- Persist only `selectedClubSlug`.
- `0` memberships and not platform admin: `/no-club-access`
- `1` membership: auto-select its club slug, then enter `/dashboard`
- `2+` memberships: `/select-club` unless a valid stored selection already exists
- Platform admin: can access `/admin/clubs` without `selectedClubSlug`
- Backend remains the source of truth for permissions

## UI Rules

- Use shared `PageHeader` by default for new pages
- Reuse shared `AppCard` and `AppButton` patterns
- Keep the green brand system, rounded cards, consistent spacing, and responsive layouts
- New pages should look like part of one product, not separate prototypes

## Known Next Tasks

1. Remove the optional club slug input from `LoginPage` if backend no longer needs it.
2. Add reschedule only after backend exposes a confirmed endpoint/contract; do not reuse detail PATCH speculatively.
3. Payment gateway, settlement, reports, audit logs, and pilot hardening remain deferred.

## Working Hours

- Working hours now use `clubs/{club_slug}/courts/{court_id}/working-hours/`.
- The old flat `court-working-hours/` endpoint is removed from frontend usage.
- Court settings saves the full weekly schedule with PUT, and Booking Board fetches working hours for the selected court.
