# Known UX Gaps

Presentation-only limitations. Do not invent backend behavior to close these.

## BACKEND CONTRACT GAP

- All-employee current-money cards reuse Dashboard `staff_unsettled_money`. That list may be truncated versus `staff_with_unsettled_transactions_count`, and it does not include `period_start` / `period_end` or a complete linked-transaction set. The frontend does not N+1 settlement previews per employee.
- Linked transactions expand only when settlement preview already returned `transactions[]` (selected employee or own custody). Dashboard all-employee cards have no expander.
- Booking history `search` covers customer name and phone. Notes search is not in the current contract; the frontend does not claim it or filter notes on the loaded page.
- Transaction list has no server `search` for customer name, phone, or payment reference. No current-page-only search box is shown.
- Transaction list has no server ordering or transaction-type query param. Those controls are omitted.
- Transaction list has no `settlement_id` / context filter into `/transactions`. The hub does not simulate “هذه المعاملات في السجل” from the loaded page.
- Transaction rows do not include `customer_name` / `customer_phone`. The frontend does not fetch one Booking per row. Display uses booking start/end, amount, method, collector, and payment reference when present.
- Settlement `settled_by` may be a numeric id only. The frontend shows calm unavailable copy and does not N+1 user detail.
- `needs_action=true` is not locally extended with paginated EXPIRED rows. If EXPIRED must appear in Needs Action, that is a backend filter contract.
- Refund entitlement after reschedule cannot be enforced in the frontend; the backend must not improve refund eligibility after moving a Booking later.
- ~12h working session equals refresh-token lifetime. The frontend refreshes access tokens but does not invent a local session timer.
- Active recurring reschedule remains unsupported and hidden.
- Skip-week and single-occurrence cancellation from a virtual reserved slot are not supported. Virtual reserved slots can only stop recurrence.
- Richer Dashboard operational records (upcoming booking identity, nearest HOLD expiry, next booking, booking-level Home actions) remain omitted until the backend supplies them.

## OPS

- HOLD automatic cancellation still depends on `python manage.py expire_hold_bookings` being scheduled. Booking details show remaining time only (`متبقي 37 دقيقة`) and must not promise auto-cancel until ops confirms that command in the target environment.

## PRODUCT DECISION

- Employee/admin account phone fields may still say `رقم الهاتف`; ordinary customer booking UX uses `رقم الموبايل`.
- No-show reason default `لم يحضر العميل` is a reason string, not the Booking status label.
- Restricted Managers without `can_manage_settlements` keep `عهدتي` rather than `إدارة الأموال`.

## FUTURE CLEANUP

- Remaining feature-local `font-black` on secondary text outside the priority surfaces touched in this pass.
- Schedule slot buttons still use compact local tones instead of `StatusChip`.
