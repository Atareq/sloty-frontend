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
Booking cards render backend list `notes` directly when present and never fetch
Booking Detail per row for notes. Full Booking notes remain in
`BookingActionSheet`.

Transactions stay server-backed online for the existing filters and pagination.
Their offline/backend-unreachable mode reads the scoped previous-seven-day
snapshot from `src/offline`, applies only safe local filters/payment-reference
search/sort, and opens read-only transaction details. Financial writes remain
online-only and must not be queued. Transaction notes are shown only in the
detail sheet when present, not on Transaction list cards.

Settlements own Backend-authoritative current custody. Staff/restricted Manager
custody uses the self-scoped settlement preview; Owner/authorized Manager
all-employee custody uses the grouped `unsettled-summary` endpoint. Dashboard
period analytics may use dates, but custody components must display Backend
`net_amount`, `transaction_count`, and `totals_by_payment_method` directly
without Transaction-history reduction or payment/refund arithmetic.

Offline Current Custody uses the scoped `current_custody_snapshots` table. A
successful Backend preview/summary response may be cached; a later failed
request may render that exact snapshot with freshness copy. Do not reconstruct
custody from cached Transactions, and do not treat no cached snapshot as zero.

Settlement preview is a fresh Backend snapshot, not a frozen grouped-summary
copy. Settlement creation posts only `{ collected_by, court?, notes? }`; the
Backend rechecks the candidate transactions and either closes them or returns a
structured stale/empty code. After payment, refund-producing cancellation,
transaction cancellation, settlement creation, or settlement status changes,
mounted finance surfaces should rerun their authoritative loaders through the
current-financial-state signal instead of subtracting amounts or marking rows
settled locally.

Audit Log is read-only business history. List cards use the Audit list response
for concise summaries and never enrich rows with current entity requests.
Opening one card may load one Audit detail response into an `AppSheet`; that
detail also renders only Audit response fields and safe before/after changes.
