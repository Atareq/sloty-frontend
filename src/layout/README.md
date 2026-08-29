# Layout

`AppShell` owns authenticated chrome: `PageHeader`, hamburger drawer, desktop sidebar, `RouteScrollReset`, and `NewBookingFAB`.

Route guards live in `src/core/auth`, not here. Do not place feature pages or domain API calls in layout.
