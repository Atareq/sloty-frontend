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
- Booking Board shows only availability-related states: available, confirmed/reserved, and cancelled-but-bookable.
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
- Egypt governorates/cities must come from `GET /egypt-locations/`; club forms must submit governorate/city codes, not Arabic or English labels, and must not hardcode Egypt location lists. Club address forms use governorate, city, and optional address; do not reintroduce `area`.
- Phone country/region selection is frontend UI only. Backend payloads must send one E.164 phone field such as `customer_phone` or `phone_number`; do not send `phone_region`, `country`, or calling-code fields.
- JWT role claims are used by the frontend for UX, navigation, and route protection.
- Components must use `useAuth()` instead of decoding tokens directly.
- Decode access tokens in the auth utility/provider layer only.
- `AuthProvider` owns session hydration and current-user profile loading from `apiEndpoints.auth.me`.
- Components should use `useAuth().currentUser` for displayed user profile data when available.
- `/me` is the post-login source of authenticated user context.
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
- Working hours are weekly recurring rows for one court, saved as a full-week PUT; one court has up to seven numeric weekday rows (`0` Monday through `6` Sunday), and closed days send `opens_at`/`closes_at` as `null`.
- Do not add holiday/Ramadan working-hour exceptions in MVP unless explicitly requested.
- Booking Board integration uses clubs, courts, working-hours, and bookings APIs to generate availability slots.
- Booking Board must fetch working hours for the selected court only.
- Booking Board must not show payment or lifecycle details.
- Sprint 3B creates bookings only from available/cancelled Booking Board slots.
- Sprint 3C adds confirmed booking details and cancel action only.
- Sprint 3D adds complete/no-show actions from confirmed booking details only.
- Sprint 4 adds basic transaction listing and confirmed-booking payment recording through `apiEndpoints.clubs.transactions`; transaction API calls go through `src/features/transactions/transactionsApi.ts`.
- Payment recording opens from confirmed booking details only. Backend validates overpayment and permission rules.
- Booking Board remains availability-focused and must not show money on slot buttons.
- Sprint 5 lifecycle actions stay inside confirmed booking details: cancellation requires a reason sheet, complete requires explicit confirmation, and no-show uses a confirmation/reason sheet.
- Reschedule is deferred until a confirmed backend endpoint/contract exists; do not invent a PATCH flow or custom reschedule path.
- Hold expiry is backend-driven; the frontend must not fake expiry transitions.
- Completed, cancelled, no-show, and expired bookings are read-only when shown in booking details.
- Booking Board remains availability-focused and must not show lifecycle/payment details on slot buttons.
- Sprint 6 implements staff settlement foundation: settlement pages use `selectedClubSlug`, owner can settle, manager can settle only when `selectedMembership.can_manage_settlements` allows it, and staff cannot settle.
- Backend remains the authority for settlement permissions; settled transactions are locked/read-only and the frontend must not offer raw transaction editing.
- Transaction correction is cancel payment with a required reason through the transaction cancel endpoint; do not add edit/void payment flows.
- Cancelled transactions remain visible and frontend code must not manually count them in payment totals.
- Sprint 7 implements backend-calculated dashboard, reports, and audit logs; these pages use `selectedClubSlug` from `useAuth()`.
- Dashboard and report financial metrics must come from backend summary/report endpoints. Do not fake numbers or manually count cancelled transactions in totals; cancelled transactions remain visible while backend summaries decide accounting.
- Audit logs are read-only. Reports and audit access are role/permission-gated UX helpers, with backend remaining the authority.
- Charts are deferred unless an existing charting package is already available; payment gateway, marketplace, commission, and player app logic are deferred.
- Expire and non-transaction financial actions are deferred to later sprints.
- Overnight working-hour ranges are deferred unless explicitly requested.
- Backend permission logic is outside frontend scope; frontend route guards are UX helpers, not security boundaries.
- Do not create backend auth, refresh, or permission assumptions beyond the agreed frontend token claims.
- Role navigation must be generated from `src/shared/navigation/navigation.config.ts` so desktop and mobile menus stay consistent.
- Every new page must use the repo shared `PageHeader` by default unless there is a clear reason not to.
- Do not create custom page headers when `PageHeader` fits the use case.
- Keep one Sloty visual fingerprint across the project: Arabic-first, RTL-first, mobile-first, green brand system, rounded cards, shared `AppCard`/`AppButton` patterns, consistent spacing, and responsive layouts.
- Any new page must look like part of the same product, not a separate prototype.

## Change Review

After every code change, review whether this `AGENTS.md` file needs an update.
