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
- Do not parse or build feature logic from `/me` memberships until the response shape is confirmed.
- Sprint 2A clubs/courts setup API calls must go through feature wrappers such as `clubsApi` and `courtsApi`.
- Sprint 2B court working-hours setup lives inside the courts feature; keep it separate from booking-slot generation.
- Court working-hours setup API calls belong in the courts feature wrapper/component.
- Booking Board integration uses clubs, courts, working-hours, and bookings APIs to generate availability slots.
- Booking Board must not show payment or lifecycle details.
- Sprint 3B creates bookings only from available/cancelled Booking Board slots.
- Sprint 3C adds confirmed booking details and cancel action only.
- Sprint 3D adds complete/no-show actions from confirmed booking details only.
- Sprint 4 adds basic transaction listing and confirmed-booking payment recording through `apiEndpoints.clubs.transactions`; keep settlement, reports, charts, and owner financial dashboards deferred.
- Expire and non-transaction financial actions are deferred to later sprints.
- Overnight working-hour ranges are deferred unless explicitly requested.
- Backend permission logic is outside frontend scope; frontend route guards are UX helpers, not security boundaries.
- Do not create backend auth, refresh, or permission assumptions beyond the agreed frontend token claims.
- Role navigation must be generated from `src/shared/navigation/navigation.config.ts` so desktop and mobile menus stay consistent.

## Change Review

After every code change, review whether this `AGENTS.md` file needs an update.
