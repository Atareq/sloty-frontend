# PWA

`src/pwa` owns Sloty's installability and static application-shell lifecycle:

- manifest configuration and role-aware `/` launch
- one service-worker registration
- Chromium `beforeinstallprompt` handling
- iOS Safari Add-to-Home-Screen instructions
- standalone detection
- prompt-based application updates

The generated Service Worker precaches compiled frontend files, icons, and approved static UI assets. It must not runtime-cache authenticated API/business responses or queue mutations. Schedule, Booking, Transaction, BookingIntent, sync metadata, and minimal verified-context records belong to the scoped `src/offline` IndexedDB layer, not this folder's CacheStorage policy.

PWA prompts live in `AppShell`. They remain hidden while any modal task, shared sheet/drawer, or known full-page editor may contain unsaved work.

Do not use service-worker update events as business-data synchronization triggers.
Operational dataset coordination lives in `src/offline/sync`.
