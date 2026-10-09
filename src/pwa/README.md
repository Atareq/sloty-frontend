# PWA

`src/pwa` owns Sloty's installability and static application-shell lifecycle:

- manifest configuration and role-aware `/` launch
- one service-worker registration configured for automatic updating (`autoUpdate` with `skipWaiting` and `clientsClaim`)
- Chromium `beforeinstallprompt` handling
- iOS Safari Add-to-Home-Screen instructions
- standalone detection
- install prompt lifecycle (kept separate from application updates)

Sloty frontend releases update automatically via `src/core/release/releaseManager.ts`. No application-update permission ("تحديث الآن" / "لاحقًا") is required. PWA installation prompts remain separate and stay suppressed during active sheets, modal tasks, or full-page editors.

The generated Service Worker precaches compiled frontend files, icons, and approved static UI assets only (`version.json` is excluded from precache). It must not runtime-cache authenticated API/business responses or queue mutations. Schedule, Booking, Transaction, and sync metadata records belong to the scoped `src/offline` IndexedDB layer, not this folder's CacheStorage policy.

The manifest still launches at `/`. `src/app/HomeRoute.tsx` uses `isRunningStandalone()` so a signed-out installed-app launch goes to `/login` instead of public discovery. An explicit `المتابعة كزائر` from Login carries `guestHomeEntryState` (navigation state only, no auth) and renders public discovery at `/` without looping back to `/login`. The prerendered `index.html` and `about/index.html` (see `docs/seo.md`) are ordinary precached HTML; `app.html` is the clean SPA fallback shell (`navigateFallback: 'app.html'`). An inline guard in `index.html` additionally hides homepage markup on standalone launches starting at `/` until React routes.

Do not use service-worker update events as business-data synchronization triggers.
Operational dataset coordination lives in `src/offline/sync`.
