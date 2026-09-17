# Durable Domain Invariants

This document outlines the core business domain rules and invariants enforced on the Sloty frontend.
The backend remains the authoritative source of truth for business logic, permissions, and data constraints.

---

## 1. Bookings

### Lifecycle & Statuses
- **`HOLD`:** Slot reserved pending initial deposit. Blocks other reservations on that slot until deposit is recorded or hold expires.
- **`CONFIRMED`:** Valid booking with payment recorded (meets minimum deposit).
- **`COMPLETED`:** Service rendered. Locked from operational edits, cancellations, and reschedules.
- **`CANCELLED`:** Booking cancelled. Releases the time slot. Requires cancellation reason. Informational refund preview is verified by backend at cancellation time.
- **`NO_SHOW`:** Customer did not arrive. Releases or marks slot as inactive.
- **`EXPIRED`:** Unconfirmed `HOLD` whose start time arrived or internal hold expiry duration elapsed. Releases slot.

### Availability Slots Grid Statuses
On the operational schedule, slots carry backend availability states:
- `FREE`: Slot is open for reservation.
- `UNAVAILABLE`: Court is closed, inactive, or slot is not open.
- `RECURRING_RESERVED`: Protected occurrence of an active weekly recurrence.
- `HOLD`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`, `EXPIRED`: Mirror active booking states.

### Recurrence
- Weekly recurrence is created via `is_recurring: true`.
- Recurrence conflicts are evaluated by the backend; frontend never calculates recurring occurrence conflicts.
- Stopping recurrence via `endBookingRecurrence()` stops future weeks while preserving historical and current booking records.

---

## 2. Transactions & Financial Ledger

### Immutable Ledger
- Transactions form an append-only, immutable ledger.
- Existing transactions cannot be edited or hard-deleted.
- Correction is performed exclusively via void/cancellation (`cancelTransaction()`) with an explicit reason.
- Settled transactions cannot be voided.

### Payment Methods
Supported methods:
- `CASH`: Cash on-premise.
- `INSTAPAY`: Electronic transfer via InstaPay (requires digital payment reference if court policy demands it).
- `E_WALLET`: Mobile electronic wallet (Vodafone Cash, Orange Money, etc.).

### Financial Calculations
- Total Price is locked at booking agreed price snapshot.
- Paid Amount = sum of active, non-voided transactions.
- Remaining Amount = `total_price - paid_amount`.
- Frontend displays backend-calculated money amounts and never computes ad-hoc financial ledger math.

---

## 3. Settlements & Current Custody

### Current Custody
- Current custody represents unclosed cash collected by employees (`collected_by`).
- Employee Custody view (`عهدتي`): Scoped to the individual collector's unsettled transactions.
- Club-wide Custody view: Available to `ADMIN` and `OWNER` for all collectors.
- Custody values (`net_amount`, `transaction_count`, `totals_by_payment_method`) come directly from backend snapshots. The frontend never computes custody by reducing local transaction lists.

### Settlement Workflow
- Settle action creates a permanent settlement batch locking all included transactions.
- After a settlement or payment mutation, financial state is invalidated across mounted finance surfaces via the current-financial-state signal.

---

## 4. Courts, Working Hours, & Pricing

### Court Settings
- `slot_duration_minutes`: Slot grid duration interval (typically 60 minutes).
- `minimum_deposit`: Minimum first payment required to confirm a booking or retained on late cancellation.
- `requires_digital_payment_reference`: Policy flag enforcing references for InstaPay and E-wallet payments.

### Pricing Rules
- **Pricing Authority:** Pricing is defined **exclusively** by child `CourtWorkingHourPricePeriod` rows tied to `CourtWorkingHour`.
- **No Legacy Pricing Fields:** The frontend does **not** consume, store, or reference:
  - `default_price`
  - `pricing_configured`
  - `minimum_slot_price`
  - `maximum_slot_price`
- **Contiguous Operating Hours:** Working hours must form contiguous, non-overlapping intervals aligned to `slot_duration_minutes`.
- **Midnight Semantic:** End time `00:00` represents next-day midnight (`24:00`). Intervals ending at `00:00` belong to the operational start date. General overnight scheduling past midnight is disallowed.

---

## 5. Players & Customer Identity

- Customer identity fields: `customer_name`, `customer_phone`.
- Customer identity on existing bookings is immutable.
- Phone input formats use the Egyptian mobile format with placeholder `01X XXX XXXX`.
- Player search queries backend club players without client-side cache manipulation.

