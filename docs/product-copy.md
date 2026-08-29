# Product Copy

Canonical repeated vocabulary lives in `src/shared/copy/appCopy.ts`.
One-off helper paragraphs stay local to their screens.

Tone: مصري بسيط ومحترف. Explain the employee's next task, not backend modules.

## Mental model

Staff:

- `معاملاتي المالية` = أنا سجلت إيه؟
- `عهدتي` = كام لسه معايا؟

Owner / authorized Manager:

- `إدارة الأموال` = مين معاه فلوس وإزاي أستلمها؟
- `سجل المعاملات المالية` = مراجعة مالية تفصيلية عند الحاجة.

Booking:

- `حجز أسبوعي` = recurring state/context
- `إيقاف الحجز الأسبوعي` = stop future recurrence; current Booking stays
- `إلغاء الحجز` = destructive current-Booking action

## Navigation

| Concept | Label |
| --- | --- |
| Home | الرئيسية | `/schedule` |
| Follow-up analytics | المتابعة | `/dashboard`, not primary nav |
| Bookings history | سجل الحجوزات |
| Staff ledger | معاملاتي المالية |
| Owner/Manager money hub | إدارة الأموال |
| Staff / restricted Manager custody | عهدتي |
| Owner/Manager advanced ledger | سجل المعاملات المالية |
| Money section on the hub | المبالغ مع الموظفين |
| Reports | التقارير |
| Audit | سجل النشاط |
| Settings | الإعدادات |

Do not use `لوحة التحكم` as the Home label.
Do not use `عهد الموظفين`, `التحصيلات`, `تحصيلاتي`, or `مبالغ الموظفين` as ordinary Burger destinations.
Do not use `التقارير الاستهلاكية للملاعب` as the Reports nav label.
Do not alternate Audit with `سجل النشاطات`, `Audit Logs`, or `سجل التدقيق` in ordinary product UI.

## Booking statuses

| Backend status | Label |
| --- | --- |
| HOLD | بانتظار العربون |
| CONFIRMED | العربون مدفوع |
| COMPLETED | تم اللعب |
| CANCELLED | ملغي |
| NO_SHOW | عدم حضور |
| EXPIRED | انتهت المهلة |

Do not use `لم يحضر` or `منتهي` for those exact Booking statuses.
`لم يحضر العميل` may remain a no-show *reason* default. Recurrence `ENDED` may still display as `منتهي` in audit history.

## Actions

- HOLD: `سجّل العربون وأكّد الحجز`
- Remaining balance: `حصّل X ج.م`
- Ended fully-paid confirmed: visible `تم اللعب` and `عدم حضور`
- Cancel: `إلغاء الحجز` (final option in `•••`, danger styling)
- Stop weekly recurrence: `إيقاف الحجز الأسبوعي` (inline danger action; recurrence container remains neutral)
- Stop-weekly confirm title: `إيقاف الحجز الأسبوعي؟`
- Stop-weekly success: `تم إيقاف الحجز الأسبوعي`
- Customer edit: `تعديل بيانات الحجز`
- Reschedule: `تغيير الموعد`
- Secondary group: `••• خيارات أخرى`
- HOLD remaining time: `متبقي 37 دقيقة` (or hour variants). Elapsed display: `انتهت مهلة دفع العربون`. Do not promise `هيتلغي تلقائي` from the countdown.

## Customer

- `اسم العميل`
- `رقم الموبايل`
- History search: `اسم العميل أو رقم الموبايل أو ملاحظة` (current server search remains name/phone only; notes search is a Backend gap)

Keep API fields `customer_phone` and `phone_number`. Employee/admin account phone labels may stay more formal.

## Finance

Staff:

- `معاملاتي المالية`
- `عهدتي`
- Empty: `مفيش مبالغ معاك دلوقتي.`

Management hub:

- Nav/page: `إدارة الأموال`
- Section: `المبالغ مع الموظفين`
- Current: `مبالغ محتاجة استلام`
- Historical: `تم استلامها سابقًا`
- Checkbox: `مراجعة المبالغ المستلمة سابقًا`
- Filter default: `كل الموظفين`
- Live collector/history filters; do not require `عرض النتائج`
- Current card: `معاه دلوقتي` / `استلام المبلغ`
- Historical card: `عرض التفاصيل`
- Linked rows: `عرض المعاملات المرتبطة` / `إخفاء المعاملات`
- Secondary ledger link: `عرض سجل المعاملات المالية`

Confirmation:

- `تأكيد استلام المبلغ`
- `تم استلام المبلغ بنجاح`

Transaction settlement chips/filters:

- Staff filter: `لسه في عهدتي`
- Staff row state: `لسه في عهدتك`
- Owner/Manager filter and row state: `لسه مع الموظف`
- Settled: `تم الاستلام`

Transaction records:

- `إلغاء المعاملة`
- `تم إلغاء المعاملة`
- `تعذر إلغاء المعاملة. حاول مرة أخرى.`
- Search placeholder when the Backend supports it: `اسم العميل أو رقم الموبايل أو مرجع الدفع`
- Court setting: `طلب مرجع الدفع للمدفوعات الإلكترونية`

List ordering (visible UI is two arrows; these strings are labels/tooltips):

- `الترتيب`
- `الأحدث أولًا` (`↓` newest first)
- `الأقدم أولًا` (`↑` oldest first)

Do not use ordinary user-facing `مراجعة العهدة`, `استلام العهدة`, `غير مسوى`, or `عهد الموظفين`.
