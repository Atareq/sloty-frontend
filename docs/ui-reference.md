Sloty UI/UX Design Reference Report
Sports Courts Rental Management System

Current frontend implementation note:

This document remains a design-direction reference. Authenticated pages in the current React frontend receive the shared `PageHeader` from `AppShell`; feature pages must not render a second page header. Use shared `PageActions` for feature-specific page buttons, use shared `AppSelect` for product-facing dropdowns instead of native browser select menus, follow the shared `AppCard` and `AppButton` patterns, and keep one Sloty visual fingerprint across the app. Do not create custom page headers or separate-looking prototype pages unless the existing shared pattern clearly does not fit.

Current local working tree note:

Approved staged/unstaged UI implementation in the local working tree is the source of truth during integration. Documentation should be synchronized to current approved implementation rather than used to restore older UI from stale docs, old commits, prototype code, or GitHub master.

Current interaction and navigation foundation:

- Non-full-page tasks use the shared `AppSheet` where applicable. On mobile it is a safe-area-aware bottom sheet; on desktop it is a centered modal. Its neutral X, backdrop, Escape, and browser/Android Back all request dismissal, while feature code protects genuine unsaved input.
- Mobile navigation consists of the global `PageHeader`, a narrow burger drawer, and the reused floating `+ حجز جديد` action. The old mobile bottom navigation is removed; desktop keeps its sidebar.
- Responsive presentation follows the viewport automatically. The production drawer has no mobile/desktop toggle, opens flush from the right with rounded exposed left corners, and presents logout as a Lucide LogOut muted-danger row.
- The floating booking action appears on mobile `/dashboard` and `/bookings` only, hides during any modal task or open drawer, and returns users to Schedule. It is hidden on `/schedule`.
- PageHeader may expose an explicit Home affordance to `/schedule` on non-Home pages; Home and Back remain distinct. Mobile places the burger on the RTL/top-right start edge and Home on the opposite/top-left edge. The original `.sloty-green-surface` visual belongs to the transient page-context region at the top of the page; it fades/blurs with that context on scroll and is gone after collapse. Only Burger/Home remain sticky. It is not a second page-level hero and not a permanently floating header card.
- Recurrence is presented inside Booking and Schedule; there is no separate recurring-agreement route or product navigation.
- `RECURRING_RESERVED` opens virtual recurring slot details from the selected Schedule slot and `recurring_context`. Do not load the anchor Booking as the selected future occurrence.
- Canonical product copy lives in `src/shared/copy/appCopy.ts` and `docs/product-copy.md`.
- Mobile text inputs use at least a 16px-equivalent font size without disabling browser zoom. Temporary success feedback uses `AppSuccessNotice` (~3 seconds); errors needing attention stay visible.

Later sections of this file still contain historical screen inventories and old bottom-navigation sketches (`المزيد`, cash/Instapay wording). Those sketches are not current product architecture. Current navigation has no `/more` route and no mobile bottom nav.

Current Schedule date/control UX:

- Schedule uses `AppDateNavigator`, not a native browser date input, as the primary date selector.
- `AppDateNavigator` contains a rolling date strip, a fully clickable date trigger, and an in-app `@daypicker/react` calendar with Lucide icons.
- Mobile calendar presentation behaves like a bottom sheet; desktop behaves like a compact modal.
- Selecting a date already visible changes selection only; selecting an outside date rebuilds the 7-day range from that date.
- Selected dates use Sloty's rounded green surface/button language. Today uses a subtle HOLD-palette amber marker (`border-amber-400`, `bg-amber-100`, `text-amber-900`) without competing with selected green.
- Schedule's direct task hierarchy is the authorized Court selector when applicable, `اختار اليوم` with the canonical date navigator, then `اختار المعاد` and the Court board. It must not render another header/hero, page title, Club/date identity, or employee identity below the shell `PageHeader`.
- Explicit date selection loads the corresponding slots and then smoothly scrolls once to `اختار المعاد`; initial load and Court changes do not auto-scroll. Loading feedback stays inside the slot workspace.
- Schedule cards are scan controls, not detail cards: show only start time and human status, plus `↻` for an existing recurring booking or a FREE slot with backend `can_start_recurring: true`. Never show customer, phone, notes, price, or payment amounts on the card.
- Booking creation keeps one optional `ثبّت نفس الموعد كل أسبوع` checkbox and one `تأكيد الحجز` action, sending the choice directly as `is_recurring`. A backend-ineligible free slot disables the checkbox and shows a human conflict reason/date from `recurring_blocked_reason` and `first_recurring_conflict_start`; do not calculate conflicts or expose an alternate-start, booking-type, availability-preview, or recurring-wizard flow.
- `RECURRING_RESERVED` is a distinct backend Schedule state. Its card uses the ordinary `محجوز` label plus a subtle top-right `↻`. It opens `VirtualRecurringSlotDetailsSheet` using the selected future slot date/time and `recurring_context`; never open the anchor Booking as the selected occurrence, and never infer the state from other fields.
- Successful creation closes the Add Booking sheet, refreshes slots without changing Court/date, and shows the same short success feedback for normal and recurring Bookings. It does not auto-open the returned HOLD Booking.
- Recurring Booking details show contextual `↻ حجز أسبوعي`. Strictly active recurrence adds inline danger `إيقاف الحجز الأسبوعي` while the recurrence container remains neutral; its confirmation explains that the current Booking remains, while cancellation and no-show warn that recurrence also ends. Unsupported active recurring reschedule stays hidden. `إلغاء الحجز` stays last under `••• خيارات أخرى` with danger styling.
- `hold_expires_at` is the authoritative HOLD countdown input. Missing HOLD expiry omits countdown copy. Recurring completion loads `GET recurrence-next/` for active confirmed recurrence and presents backend next occurrence/price/deposit plus `requires_payment_reference`; it never derives or sends a next amount.
- Lightweight summary and closing actions follow the primary slot-selection workspace and must not turn Schedule into another Dashboard.
- Active filter chips are one accessible clickable button per chip; clicking the chip removes only its own filter and buttons must not be nested.
- AppSelect owns dropdown presentation and interaction with Sloty surface/border/green/soft-mint styling, Lucide ChevronDown/Check icons, RTL layout, and keyboard support.
- Chronological history lists that have confirmed server ordering use the shared two-arrow `ListSortControl` immediately before the result cards, on the visual left in RTL. `↓` = `الأحدث أولًا` (newest). `↑` = `الأقدم أولًا` (oldest). Newest is the Product default and uses a muted mint selected state, not a primary CTA. The control emits semantic newest/oldest values only and must not render an ordering dropdown.
- AppSelect is for categorical choices. Boolean operational inclusion conditions use comfortable, whole-row checkbox controls; related Boolean state choices may use one shared `FilterCheckboxGroup` with RTL layout and Sloty green accent.
- Never expose raw ISO timestamps as intentional product text; use the shared Arabic date-time formatter while preserving ISO API/query values.
- Refund-policy presentation starts with the affected booking occurrence, then the Court notice policy and backend deadline, then the backend result. Deposit collection time is historical context only.
- Destructive user wording in Club Settings must say `حذف المستخدم من النادي نهائيًا` and refer only to removing a Manager/Staff membership from that club, never deleting the global account or an Owner membership.
- Deactivation is reversible through membership `is_active`: `إيقاف المستخدم` leads to `متوقف مؤقتًا`, while `تفعيل المستخدم` restores `نشط`. Permanent deletion warns that historical bookings, payments, and operations remain, removes the membership row, and never leaves a `DELETED` card.
- Court Settings labels the HOLD duration `مدة انتظار الحجز بدون العربون` and the refund notice `سياسة استرداد التأمين`; transport fields remain `internal_hold_expiry_hours` and `cancellation_refund_notice_days`.

1. UI Vision

Sloty should not look like a childish football app. It should look like a professional sports operations system built for real court owners, managers, staff, and later players.

The interface should communicate:

Fast, trusted, local, organized, football-related, money-safe, and easy to use on mobile.

The correct design direction is:

Clean Football Operations Dashboard

This means:

Professional dashboard feeling
Mobile-first experience
Arabic-first / RTL-first interface
Football green identity
Clear booking statuses
Simple payment and settlement screens
Minimal icons
Fast booking creation
Owner-friendly reports
Staff-friendly daily schedule

The system is not only for players. It is mainly for people running courts daily, handling money, deposits, bookings, staff activity, and settlements. So the UI must feel serious and reliable.

2. Core UI Principle

The main UI principle should be:

The system must be faster and clearer than paper.

If staff feel that paper is faster, they will not use the system.

This means the UI must be:

Fast
Simple
Mobile-friendly
Clear
Not crowded
Not over-designed
Not full of unnecessary effects
Easy to use during rush hours

Staff should be able to create a booking very quickly, ideally in less than 30 seconds.

3. Target Users and UI Needs
3.1 Court Staff / Receptionist

This is the most important daily user.

Staff needs:

See today’s schedule quickly
Know free and booked slots
Create booking fast
Add payment fast
Complete booking fast
Cancel booking when needed
See remaining money
Use the system from mobile

Staff does not need:

Complex reports
Advanced charts
Too many filters
Complicated tables
Many icons
Long forms

UI for staff should be:

Big cards, big buttons, simple actions.

3.2 Club Owner

Owner needs:

See today’s bookings
See week’s bookings
Monitor remaining payments
Monitor staff money
View unsettled transactions
Settle staff shifts
Review basic reports
See staff activity
Control pricing
Monitor manipulation

UI for owner should be:

Dashboard cards + simple tables + filters.

Owner can handle more information than staff, but still should not be overloaded.

3.3 Club Manager

Manager needs:

Manage club operations
View all courts inside the club
Manage bookings
Monitor staff
Maybe settle transactions if owner allows

UI for manager should be close to owner UI, but with fewer authority-level actions.

3.4 Platform Super Admin

Platform admin needs:

Manage all clubs
Manage all courts
View all bookings
View empty slots
View all transactions
Monitor system usage
Filter everything
Support clubs
Review audit logs

UI for platform admin can be more dashboard/table-based, especially on desktop.

3.5 Future Player

Player is not MVP 1.

Later, player UI should focus on:

Search courts
See available slots
Book easily
Pay deposit
Get confirmation

But this should not affect the MVP 1 staff/owner UI too much.

4. Design Style
Recommended Style

Sloty should use:

White cards
Soft gray background
Football green primary color
Dark professional text
Colored status chips
Simple line icons
Rounded corners
Minimal shadows
Clear hierarchy

The design should feel modern but not over-fancy.

Good design keywords:

Clean
Modern
Fast
Operational
Arabic-first
Mobile-first
Trustworthy
Football-inspired

Bad design directions:

Gaming style
Too many football images
Dark neon theme
Overloaded dashboard
Heavy animations
Complex admin template
Childish sports app
5. Brand Identity

Sloty’s visual identity should be based on football, but in a subtle professional way.

Use football identity through:
Grass green primary color
Subtle court/field references
Status cards resembling time slots
Small football/court icon where useful
Green success/confirmed states
Clean sports-business language
Avoid football identity through:
Grass background everywhere
Football ball icons everywhere
Stadium images behind text
Neon green everywhere
Overuse of sports illustrations
Cartoon-like visuals

The app is for managing money and bookings, not only for fun.

6. Recommended Color Palette
6.1 Primary Palette
Usage	Name	Hex
Main brand color	Deep Grass Green	#0B6B3A
Dark primary	Dark Green	#064E3B
Light primary background	Soft Mint	#ECFDF5
App background	Off White	#F8FAFC
Card background	White	#FFFFFF
Main text	Charcoal	#111827
Secondary text	Slate Gray	#6B7280
Border	Light Gray	#E5E7EB
6.2 Status Colors
Booking Status	Color	Hex	Usage
Hold	Amber	#F59E0B	Temporary reservation
Confirmed	Green	#16A34A	Active booking with payment
Completed	Blue	#2563EB	Played and finished
Cancelled	Red	#DC2626	Cancelled booking
No-show	Dark Red	#991B1B	Customer did not attend
Expired	Gray	#9CA3AF	Hold expired
6.3 Payment Method Colors
Payment Method	Color	Hex
Cash	Green	#059669
Instapay	Indigo	#4F46E5
E-wallet	Purple	#7C3AED
6.4 Final Palette Summary
Primary Green:        #0B6B3A
Primary Dark:         #064E3B
Primary Light:        #ECFDF5

Background:           #F8FAFC
Surface/Card:         #FFFFFF
Border:               #E5E7EB

Text Primary:         #111827
Text Secondary:       #6B7280

Success/Confirmed:    #16A34A
Warning/Hold:         #F59E0B
Danger/Cancelled:     #DC2626
No-show:              #991B1B
Completed:            #2563EB
Expired:              #9CA3AF

Cash:                 #059669
Instapay:             #4F46E5
E-wallet:             #7C3AED
7. Color Usage Rules
Use green for:
Main action buttons
Brand identity
Confirmed booking
Positive states
Cash/payment success
Active selected states
Do not use green for:
Every card
Every icon
Every title
Every section
Whole page backgrounds

Too much green will make the app look cheap and visually tiring.

Recommended balance:

Background: light gray/off-white
Cards: white
Primary actions: green
Text: charcoal
Status: status-specific colors
Payment methods: method-specific colors
8. Typography
Recommended Arabic Fonts

Use one of these:

Cairo
IBM Plex Sans Arabic
Tajawal
Noto Sans Arabic
Best Recommendation

Use:

IBM Plex Sans Arabic for a premium modern feeling
or
Cairo for a familiar local Egyptian feeling

For Sloty, I recommend:

Cairo for MVP because it is readable, familiar, and works well for Arabic local users.

Later, if you want a more premium SaaS feeling, you can test IBM Plex Sans Arabic.

Font Size Recommendations
Element	Size
Page title	20–24px
Section title	18–20px
Card title	16–18px
Normal text	14–16px
Helper text	12–13px
Button text	14–16px
Status chip	12–14px

Avoid very small text because staff will use phones, sometimes outdoors or in poor lighting.

9. RTL Arabic-First Design

The system should be designed for Arabic from the beginning.

Rules:

Default language: Arabic
Default direction: RTL
Layout must be RTL-native
Navigation should follow RTL expectations
Back arrow should point correctly for RTL
Forms should align right
Status labels should be Arabic
Buttons should use clear Arabic text
Currency should be shown naturally

Recommended currency format:

250 جنيه

Better than:

250 EGP

for local staff and owners.

10. Icons Strategy
Recommended Icon Style

Use simple line icons.

Good libraries:

Lucide Icons
Heroicons
Material Symbols

Use one icon library only.
Do not mix icon styles.

Recommended Icons
Usage	Icon
Schedule	Calendar
Time	Clock
Customer	User
Phone	Phone
Payment	Wallet / Banknote
Cash	Banknote
Confirmed	CheckCircle
Cancelled	XCircle
Warning/Hold	AlertTriangle
Reschedule	RefreshCw
Staff	Users
Club	Building
Activity log	Activity
Reports	BarChart
Settlement	Receipt / WalletCards
Icon Count Rules

On mobile:

Bottom navigation: 3–5 icons maximum
Top bar: 1–2 icons maximum
Main card: 0–1 icon maximum
Action buttons should use text, not icons only

Do not make every action icon-only.

For local users, this is better:

إضافة دفعة
إكمال الحجز
إلغاء الحجز

than only showing icons.

11. Mobile Navigation

The system is mobile-first.

For mobile, use:

Bottom navigation

Do not use a desktop sidebar for staff mobile screens.

11.1 Staff Bottom Navigation

Recommended:

الجدول | الحجوزات | المدفوعات | المزيد

Alternative:

الجدول | حجز جديد | المدفوعات | المزيد

Best structure:

Bottom nav:
الجدول
الحجوزات
المدفوعات
المزيد
Floating action button:
حجز جديد
11.2 Owner Bottom Navigation

Recommended:

الرئيسية | الجدول | التسويات | الموظفون | المزيد
11.3 Manager Bottom Navigation

Recommended:

الجدول | الحجوزات | المدفوعات | الموظفون | المزيد
11.4 Platform Admin Navigation

For desktop/tablet:

Sidebar navigation

For mobile:

الأندية | الحجوزات | الفترات | التقارير | المزيد
12. Desktop Navigation

Desktop is mainly useful for:

Platform Super Admin
Owner reports
Settlement review
Audit logs
Filtering bookings
Managing clubs/courts

Use:

Sidebar
Top bar
Tables
Filters
Dashboard cards

Desktop should not be the primary design for staff.

13. General Page Structure

Every page should follow this structure:

1. Header
2. Important summary
3. Main content
4. Actions
5. Secondary details

Example booking details page:

Header:
Booking #123

Summary:
Confirmed — Remaining 250 جنيه

Main content:
Customer + time + court

Actions:
Add Payment / Complete / Cancel

Secondary:
Transactions / audit history

This keeps the UI clean and predictable.

14. Card Design

Use cards as the main visual unit.

Recommended card style:

background: #FFFFFF;
border: 1px solid #E5E7EB;
border-radius: 16px;
padding: 16px;
box-shadow: very soft shadow;

Avoid:

Heavy shadows
Strong gradients
Too many borders
Overloaded cards
Colored backgrounds everywhere

Cards should feel clean and easy to scan.

15. Buttons
15.1 Primary Buttons

Used for main actions:

حجز جديد
إضافة دفعة
تأكيد
إكمال الحجز

Style:

Background: #0B6B3A
Text: White
Rounded: 12–16px
Height: 44–48px mobile
15.2 Secondary Buttons

Used for less important actions:

تعديل
تغيير الموعد
عرض التفاصيل

Style:

Background: White
Border: #E5E7EB
Text: #111827
15.3 Danger Buttons

Used for risky actions:

إلغاء الحجز
No-show
تعطيل المستخدم

Style:

Background: #DC2626 or white with red text/border

For destructive actions, prefer:

Confirmation modal
Clear warning text
Reason field if needed
16. Status Chips

Status should always be visible.

Use chips, not only text.

Arabic Status Labels
Status	Arabic Label
Hold	انتظار الدفع
Confirmed	مؤكد
Completed	مكتمل
Cancelled	ملغي
No-show	لم يحضر
Expired	منتهي
Status Chip Colors
انتظار الدفع   → Amber
مؤكد           → Green
مكتمل          → Blue
ملغي           → Red
لم يحضر        → Dark Red
منتهي          → Gray

Status chips should appear on:

Booking cards
Booking details
Schedule slots
Reports
Search results
17. Booking Card Design

Booking cards are the most important UI component.

17.1 Empty Slot Card
8:00 م - 9:00 م
متاح
السعر: 250 جنيه

[حجز]

Design:

Light background
Green outline or subtle available indicator
One clear button
17.2 Hold Booking Card
8:00 م - 9:00 م
انتظار الدفع

العميل: أحمد محمد
الموبايل: 010xxxxxxxx
ينتهي خلال: 10 ساعات
المتبقي: 300 جنيه

[إضافة دفعة] [إلغاء]

Design:

Amber status chip
Warning feeling, but not aggressive
Add payment button should be primary
17.3 Confirmed Booking Card
8:00 م - 9:00 م
مؤكد

العميل: أحمد محمد
المدفوع: 50 / 300 جنيه
المتبقي: 250 جنيه

[إضافة دفعة] [إكمال]

Design:

Green status chip
Remaining amount clear
Main actions visible
17.4 Completed Booking Card
8:00 م - 9:00 م
مكتمل

العميل: أحمد محمد
الإجمالي: 300 جنيه
تم التحصيل بالكامل

Design:

Blue status chip
No edit actions
View-only
17.5 Cancelled Booking Card
8:00 م - 9:00 م
ملغي

العميل: أحمد محمد
السبب: العميل ألغى

Design:

Red chip
No active action
Should not block slot
18. Staff Schedule Page

This is the most important MVP screen.

Purpose

Allow staff to:

See today’s slots
Know free/booked slots
Add booking fast
Add payment fast
Complete bookings
Suggested Layout
Top Header
- Court name
- Today’s date
- Staff name/profile icon

Quick Summary Cards
- Today bookings
- Holds
- Remaining money

Date Selector
- Today / Tomorrow / Week
- Calendar picker

Slot List
- Slot cards

Floating Action Button
+ حجز جديد

Bottom Navigation
الجدول | الحجوزات | المدفوعات | المزيد
Staff Home Priorities

Top visible information:

Current court
Today’s bookings
Holds waiting for payment
Remaining money
Upcoming slot
Add booking button

Do not show reports or charts on staff main page.

19. Add Booking Page

The add booking page must be extremely fast.

Required Fields
Customer name
Customer phone
Date
Time slot
Price, read-only for staff
Optional Fields
Add payment now
Notes
Payment Section

Collapsed by default or simple toggle:

هل تم دفع عربون؟
[لا] [نعم]

If yes:

Amount
Method
Reference if required
UX Rules
Do not make staff fill too many fields.
Price should be calculated automatically.
Staff should not edit price.
Save without payment creates Hold.
Save with payment creates Confirmed.
Show clear success message after save.
20. Booking Details Page

Use one canonical `BookingActionSheet` from Schedule booked slots, Schedule closing rows, and Booking History cards. HOLD must not use a separate details design.

Information order:

1. Customer name and LTR phone when supplied.
2. Weekday/date, time range, and smaller Court context.
3. One human Egyptian-Arabic state sentence.
4. Backend total, paid, and remaining values, including explicit zero values.
5. At most one visible primary action, except ended fully-paid confirmed bookings which show both `إكمال` and `عدم حضور`.
6. Valid secondary actions under `••• خيارات أخرى`.

State-driven primary actions:

- HOLD: `سجّل العربون وأكّد الحجز`.
- Positive remaining balance: `حصّل X ج.م`.
- Ended, fully-paid confirmed booking: visible `إكمال` and `عدم حضور`.
- Active fully-paid confirmed and final read-only statuses: no fabricated primary action.

Use `إلغاء الحجز؟` with a danger `إلغاء الحجز` confirmation. Show the booking appointment, `سياسة استرداد التأمين`, backend refund deadline, and backend eligibility result before confirmation. Do not show reschedule/backend roadmap explanations. Recurring details show contextual `↻ حجز أسبوعي`, but must not expose a recurring page, `RecurringAgreement`, or unsupported single-occurrence cancellation.

HOLD expiry text may use only authoritative `hold_expires_at`. When the field is absent, omit the countdown; never derive the deadline from Court `internal_hold_expiry_hours` or booking creation time.

For active recurring completion, use backend `recurrence_next` to present the next occurrence, total price, required deposit, continuation availability, and human blocked reason. `إكمال واستمرار أسبوعيًا` may send next-deposit method/reference/notes; `إكمال وإيقاف الحجز الأسبوعي` sends `continue_recurring: false`. Never calculate next-week data or send a next-deposit amount.
21. Add Payment Page / Modal

This should be a small focused form.

Fields
Amount
Method
Reference, conditional
Notes, optional
Method Selection

Use segmented buttons or cards:

كاش | إنستاباي | محفظة

Colors:

Cash → Green
Instapay → Indigo
E-wallet → Purple
Validation

Show clear messages:

المبلغ مطلوب
المبلغ يجب أن يكون أكبر من صفر
المبلغ أكبر من المتبقي
رقم العملية مطلوب لهذا النوع من الدفع
22. Complete Booking Flow

When staff clicks:

إكمال الحجز

If remaining amount = 0:

Complete directly after confirmation.

If remaining amount > 0:

Show confirmation modal:

المتبقي 250 جنيه.
هل تم تحصيل هذا المبلغ كاش؟

Buttons:

تأكيد التحصيل والإكمال
إلغاء

If confirmed:

System creates cash transaction.
Booking becomes Completed.
Booking is locked.

This modal is very important to prevent accidental fake cash records.

23. Cancellation Flow

Staff cancellation requires reason.

Modal
سبب الإلغاء
[العميل ألغى]
[لم يتم دفع العربون]
[حجز خاطئ]
[حجز مكرر]
[تغيير موعد]
[أخرى]

If Other:

Show notes field.

Owner cancellation reason is optional.

24. Reschedule Flow

Staff can move non-completed booking to a free slot.

UI Flow
Open booking details.
Click تغيير الموعد.
Show available slots.
Select new slot.
Show price difference if any.
Confirm move.
Rules Display

If new slot has higher price:

السعر الجديد أعلى.
الفرق: 50 جنيه.
سيتم إضافته إلى المتبقي.

If lower price:

سيتم الاحتفاظ بالسعر الأصلي إلا إذا قام المالك بتعديله.
25. Owner Dashboard

`/dashboard` remains routed as `المتابعة`. It is follow-up analytics, not the normal operational Home.

The visible Home labeled `الرئيسية` is `/schedule`. Do not create a second Home page or restore Dashboard as the landing destination.

Primary hierarchy for the retained Dashboard/follow-up page:

1. Real user greeting plus assigned/selected Court and human date.
2. Accurate today's booking total and backend HOLD count.
3. `محتاجين إجراء`, using backend aggregate classifications and filtered Booking links until item summaries exist.
4. Staff `عهدتي`, or permission-gated management `إدارة الأموال`.
5. Period controls, status breakdown, and financial analytics as secondary content.

The current aggregate response does not identify upcoming bookings, nearest HOLD expiry, next booking, or individual action records. Omit those blocks until the backend supplies authoritative values. Never relabel all bookings as upcoming, calculate a HOLD deadline from Court policy, download full history to derive Home, or construct fake booking details.

Staff remains fixed to today and the assigned Court, sees no Court/period selectors, and can never settle their own custody. Owner and Manager settlement actions use centralized permissions. A rolling seven-day range is labeled `آخر 7 أيام`, not `هذا الأسبوع`, and period metrics use neutral wording.

When booking-level Home records become available, their state sentences and primary CTA labels must come from the same canonical booking-action presentation helper used by `BookingActionSheet`; Home must not duplicate lifecycle mutations.

26. Settlement Page

This is one of the most important owner screens.

Purpose

Owner reviews money collected by staff and settles it.

Suggested Layout
Select Staff
Ahmed - Court 1

Unsettled Summary
Cash: 1200 جنيه
Instapay: 500 جنيه
E-wallet: 300 جنيه
Total: 2000 جنيه

Transaction List
- Booking time
- Customer
- Amount
- Method
- Created at

[Confirm Settlement]
Settlement UI Rules
Totals must be very clear.
Payment methods must be separated.
Staff name must be visible.
Court name must be visible.
Date range must be visible.
Settlement button must require confirmation.
After settlement, transactions become locked.
27. Platform Admin UI

Platform admin UI can be more table-heavy.

Main Screens
Clubs list
Create club
Courts list
Users list
Global bookings
Empty slots
Transactions
Settlements
Audit logs
Platform Admin Dashboard

Should include:

Total clubs
Active clubs
Active courts
Today bookings
Empty slots
Platform usage
Recent activity
Filters

Platform admin needs strong filters:

Club
Court
Date
Status
User
Payment method
Settlement status
28. Tables vs Cards
Use cards for:
Staff schedule
Booking list on mobile
Quick summaries
Payment actions
Settlement summary
Use tables for:
Platform admin club list
Owner reports
Settlement transaction list
Audit logs
User management
Desktop views

On mobile, tables should be avoided or converted into cards.

29. Forms Design
General Form Rules
Keep fields minimal.
Group related fields.
Use clear labels.
Use large inputs.
Use validation messages under fields.
Use proper keyboard types:
phone keypad for phone
numeric keypad for amount
Avoid long forms on staff screens.
Field Order for Add Booking
1. Customer name
2. Customer phone
3. Date
4. Time
5. Price
6. Payment optional
7. Notes optional
30. UX Wording

Use simple Arabic.

Avoid technical language.

Good labels
حجز جديد
إضافة دفعة
إكمال الحجز
تغيير الموعد
إلغاء الحجز
المبلغ المتبقي
تم التحصيل
انتظار الدفع
Avoid confusing labels
Transaction
Settlement Batch
Validated Payment
Booking Lifecycle

Instead translate them to simple operational words:

Technical	Arabic UI
Transaction	دفعة
Settlement	تسوية
Booking	حجز
Hold	انتظار الدفع
Confirmed	مؤكد
Completed	مكتمل
Void	إلغاء الدفعة
Remaining	المتبقي
31. Empty States

Use helpful empty states.

No bookings today
لا توجد حجوزات اليوم
ابدأ بإضافة أول حجز لهذا اليوم
[حجز جديد]
No unsettled transactions
لا توجد مبالغ غير مسواة لهذا الموظف
No courts
لم يتم إضافة ملاعب بعد
أضف أول ملعب للبدء

Use subtle football/court illustration if desired, but do not overdo it.

32. Loading States

Use skeleton loaders or simple loading indicators.

Important areas:

Schedule loading
Booking details loading
Settlement preview loading
Dashboard cards loading

Avoid blank screens.

33. Error States

Errors should be direct and clear.

Examples:

هذا الموعد محجوز بالفعل
لا يمكنك تعديل حجز مكتمل
لا يمكنك إضافة دفعة أكبر من المتبقي
هذا المستخدم غير نشط
ليس لديك صلاحية لهذا الإجراء

Do not show technical backend errors to users.

34. Confirmation Modals

Use confirmation modals for risky actions:

Complete booking with remaining amount
Cancel booking
Mark no-show
Void transaction
Confirm settlement
Deactivate user
Deactivate court

Modal should include:

Clear title
Clear explanation
Confirm button
Cancel button

Danger actions should use red button.

35. Responsive Design
Mobile

Primary experience for:

Staff
Some owners
Managers

Use:

Cards
Bottom nav
Floating action button
Single-column layout
Large buttons
Minimal filters
Tablet

Good for:

Owner dashboard
Manager schedule
Settlement review

Use:

Two-column layouts
Wider cards
Better date views
Desktop

Good for:

Platform admin
Reports
Audit logs
User management

Use:

Sidebar
Tables
Filters
Dashboard grids
36. Suggested Screen List for MVP
Staff Screens
Login
Today schedule
Add booking
Booking details
Add payment
Reschedule booking
Cancel booking
Complete booking
My payments / unsettled summary
Owner Screens
Login
Dashboard
Club list
Court schedule
Booking details
Staff list
Create staff
Settlement page
Settlement history
Reports
Activity log
Manager Screens
Login
Club schedule
Booking details
Add booking
Add payment
Staff activity
Settlement page, if allowed
Platform Admin Screens
Login
Platform dashboard
Clubs list
Create/edit club
Courts list
Create/edit court
Users list
Create/edit user
Global bookings
Empty slots
Transactions
Settlements
Audit logs
37. Screen Priority for Development

Build screens in this order:

Priority 1 — Must Have for Staff
Login
Today schedule
Add booking
Booking details
Add payment
Complete booking
Priority 2 — Must Have for Owner
Dashboard
Schedule
Staff list
Settlement page
Reports summary
Priority 3 — Must Have for Platform Admin
Clubs list
Create club
Courts list
Users list
Global bookings view
Priority 4 — Later
Advanced reports
Audit log UI
Charts
Player app UI
Public court pages
38. Recommended Component System

Create reusable components:

Core Components
AppButton
AppInput
AppSelect
AppModal
AppCard
StatusChip
PaymentMethodChip
MoneySummaryCard
BookingCard
SlotCard
TransactionItem
SettlementSummary
EmptyState
ConfirmDialog
PageHeader
Booking Components
BookingStatusChip
BookingSummaryCard
BookingActions
BookingTransactionList
AddPaymentForm
RescheduleSlotPicker
Dashboard Components
DashboardStatCard
DateFilter
CourtFilter
StaffFilter
RecentActivityList
39. Recommended Design Tokens

Use design tokens from the beginning.

Spacing
4px
8px
12px
16px
24px
32px
Border radius
Small: 8px
Medium: 12px
Large cards: 16px
Bottom sheets/modals: 20px
Button heights
Mobile button: 44–48px
Small button: 36–40px
Card padding
Mobile: 12–16px
Desktop: 16–24px
40. Recommended Layout Patterns
Staff Schedule

Single column.

Owner Dashboard

Mobile:

Single column cards

Desktop:

2–4 cards per row
Settlement

Mobile:

Summary first
Transaction cards below

Desktop:

Summary cards + transaction table
Platform Admin

Desktop-first but still responsive.

41. Visual Hierarchy

Every screen should answer:

What page am I on?
What is the most important number/status?
What do I need to do next?
What are the secondary details?

Example booking details:

Booking status
Remaining amount
Main actions
Transactions
Notes/audit
42. Important UX Rules
Rule 1

Do not hide core actions.

Staff should easily find:

Add booking
Add payment
Complete booking
Cancel
Rule 2

Do not make the staff think too much.

Use clear labels and direct actions.

Rule 3

Do not rely only on colors.

Use color + text.

Example:

Bad:

Green card only

Good:

Green chip + "مؤكد"
Rule 4

Do not show too many charts.

MVP owner dashboard should focus on simple numbers.

Rule 5

Do not use icon-only actions for dangerous operations.

For cancellation, no-show, settlement, use text and confirmation.

43. Recommended Arabic Labels
Navigation
الرئيسية
الجدول
الحجوزات
المدفوعات
التسويات
الموظفون
الأندية
الملاعب
التقارير
المزيد
Booking Actions
حجز جديد
إضافة دفعة
إكمال الحجز
تغيير الموعد
إلغاء الحجز
تسجيل عدم حضور
عرض التفاصيل
Payment Labels
المبلغ
طريقة الدفع
نقدي
محفظة رقمية
تحويل بنكي
أخرى
رقم العملية
ملاحظات
المتبقي
المدفوع
الإجمالي
Settlement Labels
عهدتي
إدارة الأموال
المبالغ مع الموظفين
مبالغ محتاجة استلام
تم استلامها سابقًا
مراجعة المبالغ المستلمة سابقًا
استلام المبلغ
تأكيد استلام المبلغ
إجمالي المبلغ
تفصيل طرق الدفع
الموظف
الفترة
44. Recommended First Design Prototype

The first UI prototype should include:

Staff login
Staff schedule
Add booking
Booking details
Add payment
Complete booking modal
Owner dashboard
Settlement page
Platform admin clubs list

This is enough to test whether the design direction works.

45. What to Avoid in MVP UI

Avoid:

Dark mode first
Heavy animations
Complex charts
Big image backgrounds
Stadium photos
Too much green
Too many icons
Desktop-first layout
Small buttons
Tiny text
Overloaded forms
Complicated calendar grid on mobile
Admin template full of tables for staff
Generic SaaS UI without football identity
46. Final UI Direction Statement

The final UI direction for Sloty is:

Sloty should be a clean Arabic-first mobile operations dashboard for football court management, using deep green as a football identity color, white card-based layouts, clear booking status chips, simple payment and settlement flows, minimal icons, large mobile-friendly actions, and strong visual clarity for staff and owners.

47. Final Practical Recommendation

Start the design with the staff schedule page.

Why?

Because if the staff schedule page is good, the product has a chance.

If the staff page is slow, confusing, or crowded, the product will fail even if the backend is strong.

The most important screen in the whole MVP is:

Staff Today Schedule

48. Booking History Review

Booking History is a compact lookup and review surface, not a financial detail grid. The visible card contains customer name, phone, human appointment, human status, and only a subtle recurring marker when returned by the backend. Opening the whole card uses the canonical booking action sheet.

The page starts with a visible unified `اسم العميل أو رقم الموبايل أو ملاحظة` search, followed by the three supported primary review checkboxes: upcoming bookings, bookings needing action, and bookings with a remaining balance. Search is debounced, URL-backed, and server-side; it must not filter only the loaded page. The current Backend still searches name/phone only, so notes search is a contract gap. Removing the Search chip clears the visible draft and pending debounce. Appointment-time ordering uses the same compact two-arrow control immediately before the cards (`↓` newest / `↑` oldest) through `ordering=-start_time` / `ordering=start_time`. Detailed Court, status, date, overdue, ended, and expiring-HOLD filters open in the same responsive sheet on mobile, tablet, and desktop. Staff stays scoped to the assigned membership Court without exposing a Court selector or accepting a Court URL override.

49. Transaction History Review

Transaction history opens to all available server history with no hidden date window. `اليوم` and `آخر 7 أيام` are explicit shortcuts. Cards stay lightweight. `عرض التفاصيل` hydrates Transaction Detail for that row only.

Settled, cancelled, refund, other-user, or authoritatively incomplete rows do not expose cancellation. Eligible rows use `إلغاء المعاملة`; the confirmation explains correction versus customer refund. Newest/oldest ordering uses the compact two-arrow control immediately before the cards (`↓` newest / `↑` oldest) for every role that can open the ledger. Transaction server search and linked customer identity remain omitted until the Backend contract supports them.
