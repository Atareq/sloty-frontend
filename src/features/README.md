# Features

`src/features` owns domain product code: pages, feature components, API wrappers, types, and helpers.

Current active features include auth, dashboard, schedule, bookings, transactions, settlements, clubs, courts, clubUsers, adminUsers, settings, reports, audit, locations, and the unfinished Platform Admin settings placeholder.

Keep feature-specific state and mutations inside the relevant feature folder. Put reusable presentational primitives in `src/shared`.

Canonical Booking details live in `bookings/components/BookingActionSheet` and always receive hydrated Booking Detail when opened from History, Schedule occupied slots, or Needs Action. Customer edit lives in `EditBookingDetailsSheet`. Non-recurring reschedule lives in `RescheduleBookingSheet`. Virtual `RECURRING_RESERVED` details live in `schedule/components/VirtualRecurringSlotDetailsSheet` because that slot is not a Booking.

Transaction history uses the shared two-arrow `ListSortControl` for Staff and Owner/Manager ledgers. Booking History uses the same control mapped to appointment `start_time`.
