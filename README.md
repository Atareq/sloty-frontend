# Sloty Frontend

Sloty is a React frontend for an Arabic-first, RTL-first, mobile-first sports court management product.

This repository is frontend-only. Do not add backend, Django, database, serializer, model, migration, or API implementation changes here.

Read [`AGENTS.md`](./AGENTS.md) before changing code. For implementation details, the current source code and `AGENTS.md` are authoritative. The files under [`docs/`](./docs/) remain useful product and planning references, but some of them predate the current React implementation.

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

## Notes

- Read `AGENTS.md` before changing code.
- Read the docs in `docs/` when product or UI behavior is relevant.
- Keep UI Arabic-first, RTL-first, and mobile-first.
- Do not invent API contracts or production backend URLs in this frontend.
