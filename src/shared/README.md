# Shared

`src/shared` owns reusable product-agnostic or cross-feature code:

- `components/` — canonical UI primitives (`AppButton`, `AppCard`, `AppSheet`, `AppSelect`, `AppDateNavigator`, `PageHeader`, `NewBookingFAB`, `FilterSheet`, `FilterCheckboxGroup`, `PhoneNumberInput`, `AppSuccessNotice`, `PageActions`, `StatusChip`)
- `copy/` — canonical repeated product vocabulary
- `navigation/` — route constants, nav items, page-header titles
- `api/` — endpoint registry and shared API types
- `utils/` — date, money, query, and display-name helpers
- `validation/` — shared input validation

Do not place booking lifecycle, payment mutation, settlement authorization, or Staff Court-scope rules here. Those belong in `src/features` or `src/core/auth`. Shared components stay presentational and receive typed props from feature code.

Shared form primitives rely on the global touch-safe input contract in
`src/index.css`: on touch-capable devices, editable controls remain at least
16px while fine-pointer desktop can keep compact typography. `PhoneNumberInput`
owns the canonical customer-phone placeholder `01X XXX XXXX` and keeps it as
placeholder text only, not a default value.
