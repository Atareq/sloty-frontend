# Sloty React Frontend Agent Guide

This file is the living root guide for AI coding agents and human engineers working in the Sloty frontend repository.
Always read this file and [`docs/index.md`](docs/index.md) before planning or executing code changes.

---

## 1. Repository Identity & Stack

This is the **Sloty frontend** repository. It is frontend-only and must never contain backend, Django, database, serializer, model, migration, or backend settings changes.

- **Framework & Language:** React 19 + TypeScript (strict mode, no `any`)
- **Build Tool & Bundler:** Vite
- **Styling:** Tailwind CSS (Arabic-first, RTL-first, mobile-first)
- **Routing:** React Router v7
- **Testing:** Vitest + Testing Library
- **Local Storage & Offline:** Dexie (IndexedDB `sloty_local_db` version 3) + `vite-plugin-pwa`
- **Linting & Formatting:** ESLint + Prettier

---

## 2. Source of Truth & Precedence Semantics

When engineering in this repository, clearly distinguish between **instruction precedence** (how agents and engineers must operate) and **implementation truth** (what the system currently does):

### A. Engineering Instruction Precedence
Governs engineering conduct, non-negotiable boundaries, safety rules, and architectural constraints:
1. **Root `AGENTS.md` (this file) & nearest applicable Scoped `AGENTS.md`:**
   - Offline Subsystem: [`src/offline/AGENTS.md`](src/offline/AGENTS.md) (governs `src/offline/**` only; `src/pwa/**` is governed by root `AGENTS.md`, [`docs/offline-architecture.md`](docs/offline-architecture.md), and [`src/pwa/README.md`](src/pwa/README.md)).
   - Operational Schedule: [`src/features/schedule/AGENTS.md`](src/features/schedule/AGENTS.md) (governs `src/features/schedule/**`).
   - Guest Public Schedule: [`src/features/publicSchedule/AGENTS.md`](src/features/publicSchedule/AGENTS.md) (governs `src/features/publicSchedule/**`).
2. **Current Durable Specifications** (under `docs/`): Detailed architecture and UX standards indexed in [`docs/index.md`](docs/index.md).
3. **Current Durable Product & UX Specifications** (under `docs/`).

### B. Implementation & Architecture Truth
When determining factual system behavior, what features exist, and how contracts behave:
1. **Current Approved Local Working Tree:** Active implementation source of truth for approved staged/unstaged changes. Never revert or replace newer approved local implementation with stale documentation or remote branches.
2. **Current Tests Describing Approved Behavior:** Tests encode verified behavioral contracts.
3. **Current APIs & Contracts Actually Consumed:** Live endpoint contracts consumed by the frontend.
4. **Current Durable Architecture & Product Documentation:** High-level architectural specifications.
5. **Historical / Reference Documentation:** Context only; never authoritative over current code.

> [!IMPORTANT]
> A stale domain statement in documentation must **never** force current approved code back to old behavior. When code and documentation diverge on approved behavior, update the documentation to match code reality.

---

## 3. Non-Negotiable Engineering Boundaries

### 1. Strict Frontend Scope
- This repository contains **zero** backend code. Do not propose or execute backend Django, model, migration, or Python edits.

### 2. Worktree Safety & Non-Destructive Operation
- **NEVER run destructive git commands:** `git reset --hard`, `git checkout .`, `git restore .`, `git clean`, or `git stash`.
- Preserve all existing user modifications in the working tree.

### 3. Arabic-First, RTL-First, Mobile-First
- Start layouts from mobile viewports and progressively enhance for tablet and desktop using responsive Tailwind prefixes (`sm:`, `md:`, `lg:`).
- Never ship a desktop page that resembles a centered phone mockup.
- Mobile text-entry controls (`input`, `textarea`, `select`) must remain at least 16px to prevent mobile browser auto-zoom.

### 4. Unified Design System Integrity
- **One PageHeader:** All authenticated shell pages use the single shell-level `PageHeader` from `AppShell`. Never create custom page headers.
- **One AppSheet:** Non-full-page temporary flows use `AppSheet` (mobile bottom sheet / desktop modal).
- **One Brand Palette:** Use Sloty's canonical green palette and surface tokens documented in [`docs/ui-reference.md`](docs/ui-reference.md).
- **No Rogue Primitives:** Do not copy V0 prototype components or add unapproved UI component libraries.

### 5. Schedule Orchestration Separation (Same Schedule Product / Experience)
- **Same Product Experience:** Guest Public Schedule and Authenticated Operational Schedule share the same Sloty visual design, brand palette, and schedule identity.
- **Separate Orchestration & Data Contracts:**
  - **Guest (`/public/:clubSlug/courts/:courtId/schedule`):** Standalone `PublicSchedulePage`, truly anonymous network requests (`omitAuth: true`, `skipAuthRefresh: true`), sanitized availability (`AVAILABLE` → `متاح`, `UNAVAILABLE` → `غير متاح`), zero private customer data, and **zero coupling with Dexie or offline sync**. Detailed in [`docs/public-schedule-architecture.md`](docs/public-schedule-architecture.md).
  - **Staff / Owner (`/schedule`):** Protected workspace, FE-038 dual-fetch lifecycle (cache-first != cache-only), operational slot states, Dexie persistence, and full mutations. Detailed in [`docs/schedule-architecture.md`](docs/schedule-architecture.md).

### 6. Offline Operational Mutation Boundary
- **Allowed Offline:** Saving a local **Booking Request** (`BookingRequestRecord`) from an available cached `FREE` slot (`PENDING_SYNC`).
- **Forbidden Offline:** Booking creation, payments, transaction cancels, settlements, booking cancellations, completions, no-shows, reschedules, and recurrence stops **require active internet** and must never be queued. Detailed in [`docs/offline-architecture.md`](docs/offline-architecture.md).

---

## 4. Codebase Structure & Responsibilities

```text
src/
├── app/          # Root application setup, React Router config, providers
├── core/         # Cross-feature infrastructure: auth context, API client, route guards
├── layout/       # Authenticated shell (AppShell), PageHeader, sidebar, drawer
├── shared/       # Domain-agnostic reusable UI primitives, hooks, helpers, and copy
├── features/     # Domain product modules (pages, components, feature API wrappers)
│   ├── schedule/       # Operational Schedule workspace (/schedule)
│   ├── publicSchedule/ # Guest Public Schedule (/public/.../schedule)
│   ├── bookings/       # Bookings list, BookingActionSheet, lifecycle dialogs
│   ├── transactions/   # Transactions ledger, RecordPaymentSheet, cancel payment
│   ├── settlements/    # Settlement review, confirmation, employee custody
│   ├── dashboard/      # Analytics dashboard (/dashboard)
│   ├── courts/         # Court settings, weekly working-hours editor
│   ├── clubs/          # Club onboarding, settings, location helpers
│   ├── settings/       # Settings hub, users & permissions management
│   ├── audit/          # Read-only business audit logs
│   └── reports/        # Court usage reports
├── offline/      # Dexie sloty_local_db, sync coordinator, adapters, requests
└── pwa/          # Service Worker registration, install prompts, update dialogs
```

---

## 5. Cross-Cutting Engineering Conventions

### Auth & Permissions
- Authentication context is accessed exclusively via `useAuth()`. Never decode JWTs in components.
- Post-login user context is hydrated from `/api/v1/me/`. Club-scoped access depends on the active `selectedMembership`.
- Permissions default to false and are enforced per selected club membership: `can_change_pricing`, `can_manage_working_hours`, `can_manage_settlements`. Backend remains the security authority.

### API Client (`src/core/api/apiClient.ts`)
- All endpoints are centralized in `src/shared/api/apiEndpoints.ts`. Never hardcode API URL strings in feature code.
- `apiRequest()` automatically sends `Accept-Language: ar` and attaches the Bearer token unless `omitAuth: true` is passed.
- Token refresh runs once on 401s; concurrent requests share the in-flight refresh. Login and refresh paths never trigger refresh.

### Coding Style & Refactoring
- **Refactor in Place:** Do not introduce parallel `V2`, `New`, or wizard variants for existing pages, sheets, or flows.
- **Educational Comments & JSDoc:** Add clear JSDoc explanations to services, hooks, reusable components, and API modules. Avoid noisy comments that restate obvious syntax.
- **Strict Typing:** Always define explicit interfaces and avoid `any`.

---

## 6. Subsystem Architecture Map

| Subsystem | Scoped Guide | Technical Specification |
| :--- | :--- | :--- |
| **Offline Storage** | [`src/offline/AGENTS.md`](src/offline/AGENTS.md) | [`docs/offline-architecture.md`](docs/offline-architecture.md) |
| **Booking Requests & Sync** | [`src/offline/AGENTS.md`](src/offline/AGENTS.md) | [`docs/booking-request-lifecycle.md`](docs/booking-request-lifecycle.md) |
| **Operational Schedule** | [`src/features/schedule/AGENTS.md`](src/features/schedule/AGENTS.md) | [`docs/schedule-architecture.md`](docs/schedule-architecture.md) |
| **Guest Public Schedule** | [`src/features/publicSchedule/AGENTS.md`](src/features/publicSchedule/AGENTS.md) | [`docs/public-schedule-architecture.md`](docs/public-schedule-architecture.md) |
| **Product UX & Layout** | — | [`docs/product-ux-pattern.md`](docs/product-ux-pattern.md) |
| **Interaction Patterns** | — | [`docs/interaction-patterns.md`](docs/interaction-patterns.md) |
| **Arabic Copy Standards** | — | [`docs/product-copy.md`](docs/product-copy.md) |
| **UI Design System** | — | [`docs/ui-reference.md`](docs/ui-reference.md) |

---

## 7. Change Review Protocol

After every engineering change:
1. Verify that **no backend files** were modified.
2. Verify that **no destructive git commands** were run.
3. Review whether the corresponding scoped `AGENTS.md` or durable architecture document requires an update to stay synchronized with code reality.
