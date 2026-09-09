# Sloty Frontend Documentation Index

This file is the canonical documentation index and navigation map for the Sloty React frontend repository.
Always consult this index to determine which documents govern the subsystem or feature you are modifying.

---

## 1. Source of Truth & Precedence Semantics

When engineering in this repository, clearly distinguish between **instruction precedence** (how agents and engineers must operate) and **implementation truth** (what the system currently does):

### A. Engineering Instruction Precedence
Governs engineering conduct, non-negotiable boundaries, safety rules, and architectural constraints:
1. **Root [`AGENTS.md`](../AGENTS.md) & nearest applicable Scoped `AGENTS.md`:**
   - Offline Subsystem: [`src/offline/AGENTS.md`](../src/offline/AGENTS.md) (governs `src/offline/**` only; `src/pwa/**` is governed by root `AGENTS.md`, [`docs/offline-architecture.md`](offline-architecture.md), and [`src/pwa/README.md`](../src/pwa/README.md)).
   - Operational Schedule: [`src/features/schedule/AGENTS.md`](../src/features/schedule/AGENTS.md) (governs `src/features/schedule/**`).
   - Guest Public Schedule: [`src/features/publicSchedule/AGENTS.md`](../src/features/publicSchedule/AGENTS.md) (governs `src/features/publicSchedule/**`).
2. **Current Durable Architecture Specifications** (under `docs/`).
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

## 2. Current Durable Documents

These documents represent the active, authoritative source of truth for the Sloty frontend. They are actively maintained and reflect actual code behavior.

| Document | Scope & Purpose | Governs |
| :--- | :--- | :--- |
| [`AGENTS.md`](../AGENTS.md) | Root repository instructions & guardrails | Global boundaries, stack, worktree safety, frontend-only rule, instruction hierarchy |
| [`docs/offline-architecture.md`](offline-architecture.md) | Offline storage, PWA, and sync architecture | Dexie `sloty_local_db`, scope isolation, freshness, sync coordinator, bounded cache windows |
| [`docs/schedule-architecture.md`](schedule-architecture.md) | Authenticated operational Schedule (`/schedule`) | FE-038 contract (cache-first != cache-only), date navigation, slot lifecycle, closing section, Share action |
| [`docs/public-schedule-architecture.md`](public-schedule-architecture.md) | Guest Public Schedule (`/public/.../schedule`) | Same Schedule product experience, separate orchestration, anonymous API, sanitized availability (`متاح`/`غير متاح`), zero private data |
| [`docs/booking-request-lifecycle.md`](booking-request-lifecycle.md) | Offline Booking Request state machine | `PENDING_SYNC` → automated sync → `BOOKED` / `NEEDS_REVIEW`, `client_request_id` idempotency |
| [`docs/frontend-current-state.md`](frontend-current-state.md) | Current system capabilities snapshot | High-level operational summary of all active features and technical capabilities |
| [`docs/product-ux-pattern.md`](product-ux-pattern.md) | Core product UX patterns & layout | Mobile-first, responsive layouts, `PageHeader`, `NewBookingFAB`, `AppSheet`, touch targets |
| [`docs/interaction-patterns.md`](interaction-patterns.md) | Screen & component interaction guidelines | Action sheets, detail sheets, drawers, modals, filter flows, search behaviors |
| [`docs/product-copy.md`](product-copy.md) | Canonical Egyptian-Arabic terminology | Standardized Arabic labels, status badges, finance terminology, error phrasing |
| [`docs/ui-reference.md`](ui-reference.md) | Visual design tokens & design system | Sloty green brand palette, surface tokens, border radius, typography, component styling |
| [`docs/ux-known-gaps.md`](ux-known-gaps.md) | Intentional UX gaps & deferred work | Documented deliberate simplifications and backlog tracking |
| [`src/offline/AGENTS.md`](../src/offline/AGENTS.md) | Scoped instructions for `src/offline/` | Database tables, scope isolation, dataset sync priorities, storage safety (governs `src/offline/**` only) |
| [`src/features/schedule/AGENTS.md`](../src/features/schedule/AGENTS.md) | Scoped instructions for operational schedule | Request lifecycle, date strip, slot rendering, booking actions, operational closing |
| [`src/features/publicSchedule/AGENTS.md`](../src/features/publicSchedule/AGENTS.md) | Scoped instructions for guest public schedule | Anonymous access, sanitized availability states, privacy boundaries, share link |

---

## 3. Historical & Planning Documents

The following documents contain historical context, initial planning notes, or previous sprint backlogs. They must **not** be treated as authoritative sources of current frontend architecture or API contracts.

| Document | Status | Notes |
| :--- | :--- | :--- |
| `docs/business-analysis.txt` | Historical | Initial market research, business requirements, and domain planning |
| `docs/documentation.txt` | Historical | Early monolithic architecture and initial API drafting notes |
| `docs/sprints.txt` | Historical | Historical sprint-by-sprint implementation notes |
| `docs/refactors/frontend-master-refactor.md` | Historical | Architecture proposal for earlier frontend restructuring |
| `docs/refactors/frontend-master-progress.md` | Historical | Progress log for earlier frontend refactoring phases |
| `todo.txt` | Historical | Early task list and roadmap brainstorming |

---

## 4. Task-Based Routing Guide

Use this guide to quickly locate the relevant documents for your current engineering task:

### Working on Offline Storage, PWA, or Data Synchronization
1. Read [`src/offline/AGENTS.md`](../src/offline/AGENTS.md) for local database and sync rules in `src/offline/**`.
2. For PWA infrastructure under `src/pwa/**`, consult root [`AGENTS.md`](../AGENTS.md), [`docs/offline-architecture.md`](offline-architecture.md), and [`src/pwa/README.md`](../src/pwa/README.md).
3. Read [`docs/offline-architecture.md`](offline-architecture.md) for the complete offline subsystem architecture.
4. If touching customer requests saved offline, read [`docs/booking-request-lifecycle.md`](booking-request-lifecycle.md).

### Working on Authenticated Operational Schedule (`/schedule`)
1. Read [`src/features/schedule/AGENTS.md`](../src/features/schedule/AGENTS.md) for schedule feature rules.
2. Read [`docs/schedule-architecture.md`](schedule-architecture.md) for the FE-038 dual-fetch contract, slot states, closing section, and Share action (`navigator.share` with clipboard fallback).
3. Read [`docs/interaction-patterns.md`](interaction-patterns.md) for `BookingActionSheet` and `AddBookingSheet` workflows.

### Working on Guest Public Schedule (`/public/:clubSlug/courts/:courtId/schedule`)
1. Read [`src/features/publicSchedule/AGENTS.md`](../src/features/publicSchedule/AGENTS.md) for public schedule feature rules.
2. Read [`docs/public-schedule-architecture.md`](public-schedule-architecture.md) for same-product separate-orchestration architecture, anonymous API rules, sanitized availability states, and privacy isolation.

### Working on Booking Request Lifecycle & Offline Intents
1. Read [`docs/booking-request-lifecycle.md`](booking-request-lifecycle.md) for states (`PENDING_SYNC`, `SYNCING`, `BOOKED`, `NEEDS_REVIEW`), error handling, and `client_request_id` idempotency.
2. Read [`src/offline/AGENTS.md`](../src/offline/AGENTS.md) for database persistence and synchronization details.

### Working on UI Layout, Design Tokens, Components, or Styling
1. Read [`docs/ui-reference.md`](ui-reference.md) for Sloty green tokens, surfaces, cards, and typography.
2. Read [`docs/product-ux-pattern.md`](product-ux-pattern.md) for responsive design, `PageHeader`, `AppSheet`, and touch targets.
3. Read [`docs/product-copy.md`](product-copy.md) for exact Arabic labels, buttons, and system messages.

### Working on Financials, Settlements, or Custody
1. Read [`docs/frontend-current-state.md`](frontend-current-state.md#settlements) for current settlement and current-custody behavior.
2. Read [`docs/offline-architecture.md`](offline-architecture.md#7-offline-current-custody-snapshot-rules) for custody snapshot caching rules.
3. Consult root [`AGENTS.md`](../AGENTS.md) for settlement permissions and immutable transaction constraints.
