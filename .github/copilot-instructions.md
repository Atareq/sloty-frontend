# GitHub Copilot & Coding Agent Instructions

This repository is the Sloty React frontend. It is frontend-only and must never contain backend, Django, database, serializer, model, migration, or API implementation changes.

---

## 1. Source of Truth & Precedence

Clearly distinguish between instruction precedence (how agents must operate) and implementation truth (what the system currently does):

### Instruction Precedence:
1. **Root Guide:** Always read [`AGENTS.md`](../AGENTS.md) first for global architecture, boundaries, and conventions.
2. **Nearest Applicable Scoped Guide:**
   - Offline Subsystem: [`src/offline/AGENTS.md`](../src/offline/AGENTS.md) (governs `src/offline/**` only; `src/pwa/**` is governed by root `AGENTS.md`, [`docs/offline-architecture.md`](../docs/offline-architecture.md), and [`src/pwa/README.md`](../src/pwa/README.md)).
   - Operational Schedule: [`src/features/schedule/AGENTS.md`](../src/features/schedule/AGENTS.md) (governs `src/features/schedule/**`).
   - Guest Public Schedule: [`src/features/publicSchedule/AGENTS.md`](../src/features/publicSchedule/AGENTS.md) (governs `src/features/publicSchedule/**`).
3. **Documentation Index:** Consult [`docs/index.md`](../docs/index.md) to locate the exact durable specification for your task.

### Implementation Truth:
1. Current approved local working tree
2. Current tests describing approved behavior
3. Current API/contracts actually consumed
4. Current durable architecture/product documentation
5. Historical/reference documentation

A stale domain statement in documentation must **never** force current approved code back to old behavior.

---

## 2. Core Architecture Specifications

- **Offline Storage & PWA:** [`docs/offline-architecture.md`](../docs/offline-architecture.md)
- **Schedule (FE-038 Dual-Fetch):** [`docs/schedule-architecture.md`](../docs/schedule-architecture.md)
- **Guest Public Schedule:** [`docs/public-schedule-architecture.md`](../docs/public-schedule-architecture.md)
- **Booking Request Lifecycle:** [`docs/booking-request-lifecycle.md`](../docs/booking-request-lifecycle.md)
- **Current System Capabilities:** [`docs/frontend-current-state.md`](../docs/frontend-current-state.md)

---

## 3. Product, UX, & Copy Standards

- **Product UX & Layout:** [`docs/product-ux-pattern.md`](../docs/product-ux-pattern.md)
- **Component Interactions:** [`docs/interaction-patterns.md`](../docs/interaction-patterns.md)
- **Canonical Arabic Terminology:** [`docs/product-copy.md`](../docs/product-copy.md)
- **Design System & Tokens:** [`docs/ui-reference.md`](../docs/ui-reference.md)
- **Documented Gaps:** [`docs/ux-known-gaps.md`](../docs/ux-known-gaps.md)

---

## 4. Non-Negotiable Rules

- **Frontend Only:** Never touch backend models, migrations, views, serializers, or settings.
- **Worktree Safety:** Never run destructive git commands (`git reset --hard`, `git checkout .`, `git restore .`, `git clean`, `git stash`). The working tree is the active implementation truth.
- **Arabic-first, RTL-first, mobile-first:** Always design and test mobile view first, then tablet and desktop.
- **Design System Integrity:** Use canonical primitives (`AppSheet`, `PageHeader`, `AppSelect`, `AppCard`, `AppButton`). Never create duplicate visual components or parallel prototype variants.
- **Offline Writes:** Saving a Booking Request from an available cached FREE slot is the **only** offline operational write. All other business mutations require internet.
- **Schedule Architecture:** Same Schedule product experience and brand identity across surfaces, with separate orchestration surfaces and data contracts (Guest read-only sanitized public view vs Staff/Owner operational workspace).
