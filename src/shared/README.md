# Shared

`src/shared` owns reusable product-agnostic or cross-feature code:

- `components/` — canonical UI primitives (`AppButton`, `AppCard`, `AppSheet`, `AppSelect`, two-arrow `ListSortControl`, `AppDateNavigator`, `PageHeader`, `NewBookingFAB`, `FilterSheet`, `FilterCheckboxGroup`, `PhoneNumberInput`, `AppSuccessNotice`, `PageActions`, `StatusChip`, `LiveSearchField`, `ResultRefreshRegion`)
- `copy/` — canonical repeated product vocabulary
- `navigation/` — route constants, nav items, page-header titles
- `api/` — endpoint registry and shared API types
- `utils/` — date, money, query, and display-name helpers
- `validation/` — shared input validation

Do not place booking lifecycle, payment mutation, settlement authorization, or Staff Court-scope rules here. Those belong in `src/features` or `src/core/auth`. Shared components stay presentational and receive typed props from feature code.
