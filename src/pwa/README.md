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

Do not use service-worker update events as business-data synchronization triggers.
Operational dataset coordination lives in `src/offline/sync`.
