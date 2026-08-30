# Layout

`AppShell` owns authenticated chrome: `PageHeader`, hamburger drawer, desktop sidebar, `RouteScrollReset`, and `NewBookingFAB`.

It also mounts `OfflineSyncProvider` once around authenticated pages so
business-data synchronization lifecycle events are not duplicated inside
feature pages.

Route guards live in `src/core/auth`, not here. Do not place feature pages or domain API calls in layout.
