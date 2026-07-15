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
- Court working hours setup
- Booking Board read-only slots
- Manual booking creation
- Booking details cancel / complete / no-show actions
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

1. Use `selectedClubSlug` in `SchedulePage` instead of choosing the first active club.
2. Use `selectedClubSlug` in `TransactionsListPage` instead of choosing the first active club.
3. Show selected club name and a change-club action in `AppShell`.
4. Remove the optional club slug input from `LoginPage` if backend no longer needs it.
5. Continue payment recording from Booking Details only after club context is clean.
6. Later: settlement, reports, audit logs, and pilot hardening.
