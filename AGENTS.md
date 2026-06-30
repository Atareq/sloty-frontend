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

## Architecture Rules

- Keep shared components presentational and reusable.
- Keep feature-specific state and logic inside feature folders.
- Keep cross-feature primitives in `src/core`, reusable UI/helpers in `src/shared`, and app shell/route protection in `src/layout`.
- Use typed interfaces/types and avoid `any`.
- Add educational comments because this project is also used for frontend learning.
- Prefer JSDoc for services, hooks, API modules, models/types, reusable components, route guards/protected routes, and layout components.
- Avoid noisy comments that repeat obvious code.
- Keep documentation updated when architecture changes.

## Change Review

After every code change, review whether this `AGENTS.md` file needs an update.
