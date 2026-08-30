# Features

`src/features` owns domain product code: pages, feature components, API wrappers, types, and helpers.

Current active features include auth, dashboard, schedule, bookings, transactions, settlements, clubs, courts, clubUsers, adminUsers, settings, reports, audit, locations, and the unfinished Platform Admin settings placeholder.

Keep feature-specific state and mutations inside the relevant feature folder. Put reusable presentational primitives in `src/shared`.

Do not attach page-level business synchronization listeners for browser
online/offline or visibility changes. Authenticated operational sync is owned by
`src/offline/sync` and mounted once from `AppShell`.

Canonical Booking details live in `bookings/components/BookingActionSheet`. Customer edit lives in `EditBookingDetailsSheet`. Non-recurring reschedule lives in `RescheduleBookingSheet`. Virtual `RECURRING_RESERVED` details live in `schedule/components/VirtualRecurringSlotDetailsSheet` because that slot is not a Booking.

Schedule owns the BookingIntent UX entry point because it starts from a cached
FREE slot and reuses the existing `AddBookingSheet`. Offline/backend-unreachable
submit saves a local one-time request as `PENDING_RECHECK`, never calls
`createBooking()`, and never shows Booking success copy. Reconnect classification
uses the offline coordinator's successful Schedule refresh before the employee
can manually press `احجز الآن`.

Booking History stays server-backed online. Its offline/backend-unreachable mode
reads the scoped previous-seven-day snapshot from `src/offline`, applies only
safe local filters/search, and opens `BookingActionSheet` read-only.

Transactions stay server-backed online for the existing filters and pagination.
Their offline/backend-unreachable mode reads the scoped previous-seven-day
snapshot from `src/offline`, applies only safe local filters/payment-reference
search/sort, and opens read-only transaction details. Financial writes remain
online-only and must not be queued.
