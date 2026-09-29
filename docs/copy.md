# Product Copy

Canonical repeated vocabulary lives in `src/shared/copy/appCopy.ts`.
Unique feature paragraphs stay local to their respective screens.

Tone: **مصري بسيط ومحترف** (Simple, professional Egyptian Arabic). Explain the employee's next task directly, without exposing technical backend internals.

---

## 1. Navigation

| Destination | Path | Label | Notes |
| :--- | :--- | :--- | :--- |
| Schedule (Home) | `/schedule` | `الرئيسية` | Do not use `لوحة التحكم` as the Home label. |
| Operational Schedule | `/schedule` | `الجدول` | Header / breadcrumb label. |
| Dashboard | `/dashboard` | `المتابعة` | Operational analytics (secondary nav). |
| Bookings History | `/bookings` | `سجل الحجوزات` | All historical bookings for selected club. |
| Staff Ledger | `/transactions` | `معاملاتي المالية` | Nav label for `STAFF` role. |
| Owner/Admin Ledger | `/transactions` | `سجل المعاملات المالية` | Nav label for `OWNER` and `ADMIN` roles. |
| Staff Custody | `/settlements` | `عهدتي` | Nav label for `STAFF` role. |
| Owner/Admin Settlements | `/settlements` | `إدارة الأموال` | Nav label for `OWNER` and `ADMIN` roles. |
| Staff Balances Section | `/settlements` | `المبالغ مع الموظفين` | Section header inside Settlements hub. |
| Reports | `/reports` | `التقارير` | Court utilization reports. |
| Audit Trail | `/audit` | `سجل النشاط` | Append-only business audit history. |
| Settings | `/settings` | `الإعدادات` | Club settings hub. |
| Court Settings | `/settings/courts` | `إعدادات الملاعب` | Court setup and working hours editor. |

> [!WARNING]
> Do not use `عهد الموظفين`, `التحصيلات`, `تحصيلاتي`, or `مبالغ الموظفين` as sidebar/burger destinations.
> Do not use `التقارير الاستهلاكية للملاعب` as the Reports nav label.
> Do not alternate Audit with `سجل النشاطات`, `Audit Logs`, or `سجل التدقيق`.

---

## 2. Roles

| Role Key | Arabic Label | Description |
| :--- | :--- | :--- |
| `ADMIN` | `مدير المنصة` | Sloty platform administrator with cross-club authority. |
| `OWNER` | `مالك` | Club owner with full tenant authority across their clubs. |
| `STAFF` | `موظف` | Club staff member scoped to assigned courts. |

---

## 3. Booking Statuses

| Backend Status | Arabic Label | Meaning / Context |
| :--- | :--- | :--- |
| `HOLD` | `بانتظار العربون` | Temporary reservation awaiting deposit confirmation. |
| `CONFIRMED` | `العربون مدفوع` | Deposit paid; booking confirmed. |
| `COMPLETED` | `تم اللعب` | Match played and completed. |
| `CANCELLED` | `ملغي` | Booking cancelled. |
| `NO_SHOW` | `عدم حضور` | Customer did not show up. |
| `EXPIRED` | `انتهت المهلة` | Hold duration expired without deposit payment. |

> [!IMPORTANT]
> Do not use `لم يحضر` or `منتهي` for exact booking statuses (`لم يحضر العميل` is reserved as a no-show cancellation reason).

---

## 4. Slot Statuses

### Operational Schedule (`/schedule`)
- `FREE`: Slot is open for booking (`متاح`).
- `UNAVAILABLE`: Court is closed or past slot time (`غير متاح`).
- `RECURRING_RESERVED`: Virtual future weekly occurrence (`↻ محجوز أسبوعيًا`).
- `HOLD`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`, `EXPIRED`: Concrete booking slots using booking status labels.

### Guest Public Schedule (`/public/.../schedule`)
- Sanitized to two guest-facing states only:
  - Available: `متاح`
  - Unavailable: `غير متاح`
- Zero internal status names, customer names, phone numbers, or payment states are ever displayed.

---

## 5. Booking Actions

| Action | Arabic Label | Usage & Styling |
| :--- | :--- | :--- |
| Deposit & Confirm | `سجّل العربون وأكّد الحجز` | Primary action on `HOLD` bookings. |
| Complete | `تم اللعب` | Action on ended, fully-paid `CONFIRMED` bookings. |
| No Show | `عدم حضور` | Action on ended `CONFIRMED` bookings when customer did not attend. |
| Collect Remaining | `حصّل [المبلغ]` | Quick payment action when balance is owed. |
| Cancel Booking | `إلغاء الحجز` | Destructive action; placed at end of `••• خيارات أخرى` menu with danger styling. |
| Stop Weekly Recurrence | `إيقاف الحجز الأسبوعي` | Outline/secondary styling. Confirmation title: `إيقاف الحجز الأسبوعي؟`. |
| Edit Booking Details | `تعديل بيانات الحجز` | Opens sheet to edit customer name, phone, or notes. |
| Reschedule | `تغيير الموعد` | Opens reschedule sheet to select a new slot. |
| More Options | `••• خيارات أخرى` | Secondary actions menu toggle. |

---

## 6. Financial Ledger & Transactions

| Term | Arabic Label | Usage |
| :--- | :--- | :--- |
| Payment | `تحصيل` | Positive inflow transaction. |
| Refund | `استرداد` | Refund transaction. |
| Cash | `نقدي` | Payment method `CASH`. |
| Digital Wallet | `محفظة إلكترونية` | Payment method `DIGITAL_WALLET`. |
| Bank Transfer | `تحويل بنكي` | Payment method `BANK_TRANSFER`. |
| Other | `أخرى` | Payment method `OTHER`. |
| Payment Reference | `مرجع الدفع` | Required for digital wallet / bank transfer if enabled. |
| Required Deposit | ` أقل عربون تقدر تسجل بيه` | Snapshot deposit amount. |
| Total Price | `إجمالي الحجز` | Total agreed booking price. |
| Paid Amount | `المدفوع` | Sum of confirmed payments. |
| Remaining Balance | `المتبقي دلوقتي` | Remaining unpaid balance. |

---

## 7. Current Custody & Settlements

| Concept | Arabic Label | Context |
| :--- | :--- | :--- |
| Collector | `المحصل` | Label for OWNER or STAFF collector identity. Do not use `الموظف المحصل`. |
| Collector required | `تعذر تحديد المحصل لهذه التسوية.` | Confirm error when preview/create has no collector ID. |
| Current Custody | `العهدة الحالية` | Heading for live unsettled cash section. |
| Custody with Employee | `معاه دلوقتي` | Badge/stat showing collector's current unsettled cash. |
| Receive Amount | `استلام المبلغ` | Primary CTA to initiate settlement confirmation. |
| Confirm Settlement | `تأكيد استلام المبلغ` | Modal confirmation CTA. |
| Settlement Success | `تم استلام المبلغ بنجاح` | Toast on completed settlement. |
| Settled Previously | `تم استلامها سابقًا` | Toggle/tab for historical settlements. |
| Empty Custody | `لا توجد مبالغ مستحقة للتسليم حاليًا` | Zero unsettled balance state. |
| Zero Net Balance | `صافي المبلغ المستحق حاليًا: 0 ج.م` | Displayed when collector has zero balance. |
| Self Settlement Prohibited | `المبلغ ده خاص بتحصيلاتك، ولازم يستلمه شخص عنده صلاحية الاستلام.` | Warning when a user attempts to settle with themselves. |

> [!WARNING]
> Do not use `مراجعة العهدة`, `استلام العهدة`, `غير مسوى`, or `عهد الموظفين` in user-facing copy.

---

## 8. Recurring Bookings

| Label | Copy | Context |
| :--- | :--- | :--- |
| Weekly Indicator | `↻ حجز أسبوعي` | Chip/badge on weekly recurring bookings. |
| Virtual Occurrence | `↻ محجوز أسبوعيًا` | Slot badge on future weekly reserved slots. |
| Checkbox | `ثبّت نفس الموعد كل أسبوع` | Checkbox in booking creation sheet. |
| Helper Text | `التكرار الأسبوعي بيتأكد ويتحدث من السيرفر.` | Booking creation helper. |
| Virtual Slot Helper | `المعاد المعروض تكرار مستقبلي من الحجز الأسبوعي، وليس حجزًا جديدًا مستقلًا.` | Bottom sheet explanation on virtual recurrence slots. |
| Online Recurring Unavailable Title | `التثبيت الأسبوعي مش متاح` | Floating amber warning title for `RECURRING_UNAVAILABLE` on online create. |
| Online Recurring Unavailable Body | `فيه حجز متعارض يوم {local datetime}` / `فيه حجز متعارض في أحد الأسابيع الجاية.` | ~5s floating warning; keep Add Booking sheet open; never show `conflicting_booking_id`; do not add to Needs Review. |
| Stop Confirm Body | `الحجز الحالي هيفضل زي ما هو، لكن المعاد مش هيتحجز تلقائيًا في الأسابيع الجاية.` | Confirmation dialog message. |
| Stop Success | `تم إيقاف الحجز الأسبوعي` | Success feedback toast. |

---

## 9. Customer Details

- **Customer Name:** `اسم العميل`
- **Mobile Number:** `رقم الموبايل`
- **Phone Placeholder:** `01X XXX XXXX` (display as muted placeholder text, never default input value)
- **Search Placeholder:** `اسم العميل أو رقم الموبايل`
- **Phone required (ar):** `رقم الموبايل مطلوب`
- **Phone invalid (ar):** `رقم الموبايل غير صحيح`
- **Phone required (en):** `Mobile number is required`
- **Phone invalid (en):** `Enter a valid mobile number`

Phone validation copy is resolved from `src/shared/copy/phoneValidation.ts` using the document language. Do not hardcode these strings in feature forms.

---

## 10. Settings & Working Hours

- **Section Header:** `إعدادات الملاعب`
- **Digital Reference Toggle:** `طلب مرجع للدفع الإلكتروني`
- **Digital Reference Helper:** `عند التفعيل، يجب إدخال مرجع العملية عند الدفع بمحفظة إلكترونية أو تحويل بنكي.`
- **Add Pricing Period:** `+ إضافة فترة جديدة`
- **Apply Day to Week:** `حفظ وتطبيق مواعيد [اليوم] على باقي الأسبوع`
- **Apply Day Helper:** `يحفظ التعديلات الحالية ويطبق نفس الفترات والأسعار على الأيام الأخرى`
- **Save Validation Error:** `حصلت مشكلة في بعض البيانات. راجع الحقول المحددة.`

---

## 11. Public Site (SEO pages)

Copy for `/` and `/assiut/` lives in `src/features/publicSite/publicSite.copy.ts`; the same strings feed visible headings, meta descriptions, and JSON-LD. See [`seo.md`](./seo.md).

- **Audience & register:** Players, pitch owners, and staff arriving from search. Use clear, simple Modern Standard Arabic (فصحى مبسطة) so wording matches how people search. Operational screens keep the simple Egyptian tone above.
- **Brand:** Always pair `Sloty` and `سلوتي` in identity text (`سلوتي (Sloty)`, `Sloty | سلوتي`). Treat سلوتي as feminine (`منصة`): `تساعد`، `تبدأ`.
- **Location:** Visible copy uses `أسيوط` and `مصر`. Do not write misspellings (`اسيوط`, `Assuit`) in visible text.
- **Truthfulness:** Players see available times and contact the court to confirm (`تواصل مع الملعب لتأكيد الحجز`). Do not promise player self-booking, prices, ratings, or listed venues.

| Element | Copy |
| :--- | :--- |
| Identity statement | `سلوتي (Sloty) منصة مصرية لحجز وإدارة ملاعب كرة القدم والمرافق الرياضية، تبدأ من أسيوط، وتساعد اللاعبين على معرفة المواعيد المتاحة وأصحاب الملاعب وفريق العمل على إدارة الحجوزات والمواعيد والمدفوعات.` |
| Homepage H1 | `إدارة وحجز الملاعب بسهولة مع Sloty` |
| Homepage title | `Sloty \| سلوتي لحجز وإدارة ملاعب كرة القدم في أسيوط ومصر` |
| Assiut H1 | `ملاعب كرة القدم والحجز في أسيوط` |
| Assiut title | `حجز ملاعب كرة القدم في أسيوط \| Sloty` |
| Assiut link text | `حجز ملاعب كرة القدم في أسيوط` |
| Homepage link text (from Assiut) | `سلوتي لإدارة وحجز ملاعب كرة القدم` |
| Header login | `تسجيل الدخول` |
| Footer / CTA login | `تسجيل الدخول لفريق العمل` |
| Public schedule tab title | `جدول مواعيد الملعب \| Sloty` |
| Private app tab title | `Sloty \| سلوتي` |
