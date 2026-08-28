# Sloty Frontend

Sloty is a React frontend for an Arabic-first, RTL-first, mobile-first sports court management product.

This repository is frontend-only. Do not add backend, Django, database, serializer, model, migration, or API implementation changes here.

## Source of truth

1. Current approved local implementation
2. [`AGENTS.md`](./AGENTS.md) engineering guardrails
3. Durable product docs under [`docs/`](./docs/): `product-ux-pattern.md`, `product-copy.md`, `interaction-patterns.md`, `ui-reference.md`, `frontend-current-state.md`, `ux-known-gaps.md`
4. Frontend API wrappers and types under `src/`

`docs/business-analysis.txt`, `docs/documentation.txt`, and `docs/sprints.txt` are historical planning documents. Do not treat them as current frontend architecture.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- ESLint
- Vitest
- Testing Library
- npm

## Commands

```bash
nvm use
npm install
npm run dev
npm run build
npm run lint
npm test
```

For watch-mode tests:

```bash
npm run test:watch
```

## Folder ownership

- `src/app` — router and application composition
- `src/core` — auth, API client, route guards
- `src/layout` — authenticated shell
- `src/shared` — reusable primitives, copy, navigation, helpers
- `src/features` — domain product screens and API wrappers

## Notes

- Keep UI Arabic-first, RTL-first, and mobile-first.
- Do not invent API contracts or production backend URLs in this frontend.
- `references/v0-prototype/` is a gitignored visual reference, not production code.
