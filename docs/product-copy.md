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
- Booking card note label: `ملاحظة`
- Booking/Transaction detail note label: `ملاحظات`

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
| Current employee custody section | المبالغ الموجودة مع الموظفين حاليًا |
| Reports | التقارير |
| Audit | سجل النشاط |
| Settings | الإعدادات |

Do not use `لوحة التحكم` as the Home label.
Do not use `عهد الموظفين`, `التحصيلات`, `تحصيلاتي`, or `مبالغ الموظفين` as ordinary Burger destinations.
Do not use `التقارير الاستهلاكية للملاعب` as the Reports nav label.
Do not alternate Audit with `سجل النشاطات`, `Audit Logs`, or `سجل التدقيق` in ordinary product UI.

Audit interaction copy:

- Activity detail sheet title: `تفاصيل النشاط`
- Detail loading: `جاري تحميل تفاصيل النشاط...`
- Detail failure: `تعذر تحميل تفاصيل النشاط`
- Detail retry: `حاول مرة تانية`

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
- Stop weekly recurrence: `إيقاف الحجز الأسبوعي` (inline, outline/secondary, not danger)
- Stop-weekly confirm title: `إيقاف الحجز الأسبوعي؟`
- Stop-weekly success: `تم إيقاف الحجز الأسبوعي`
- Customer edit: `تعديل بيانات الحجز`
- Reschedule: `تغيير الموعد`
- Secondary group: `••• خيارات أخرى`
- HOLD remaining time: `متبقي 37 دقيقة` (or hour variants). Elapsed display: `انتهت مهلة دفع العربون`. Do not promise `هيتلغي تلقائي` from the countdown.

## Customer

- `اسم العميل`
- `رقم الموبايل`
- Customer phone placeholder: `01X XXX XXXX` as muted example text, never as a default value
- History search: `اسم العميل أو رقم الموبايل` (server name/phone only; notes search is a Backend gap)

Keep API fields `customer_phone` and `phone_number`. Employee/admin account phone labels may stay more formal.

## Finance

Staff:

- `معاملاتي المالية`
- `عهدتي`
- Current section: `العهدة الحالية`

Management hub:

- Nav/page: `إدارة الأموال`
- Page heading: `المبالغ مع الموظفين`
- Current section: `المبالغ الموجودة مع الموظفين حاليًا`
- Historical: `تم استلامها سابقًا`
- Checkbox: `مراجعة المبالغ المستلمة سابقًا`
- Filter default: `كل الموظفين`
- Court default: `كل الملاعب`
- Live collector/history filters; do not require `عرض النتائج`
- Current card action: `استلام المبلغ`
- Historical card: `عرض التفاصيل`
- Linked rows: `عرض المعاملات المرتبطة` / `إخفاء المعاملات`
- Secondary ledger link: `عرض سجل المعاملات المالية`

Current custody states:

- `لا توجد مبالغ مستحقة للتسليم حاليًا`
- `صافي المبلغ المستحق حاليًا: 0 ج.م`
- `المبلغ المستحق للتسليم: X ج.م`

Confirmation:

- `تأكيد استلام المبلغ`
- `تم استلام المبلغ بنجاح`
- Stale/candidate changed: `المبلغ اتغير. جبنا آخر حالة من السيرفر.`

Transaction settlement chips/filters:

- `لم يتم استلامها`
- `تم استلامها`

Do not use ordinary user-facing `مراجعة العهدة`, `استلام العهدة`, `غير مسوى`, or `عهد الموظفين`.

Offline BookingIntent:

- Save CTA: `احفظ طلب الحجز`
- Saving: `جاري حفظ الطلب...`
- Save success: `تم حفظ طلب الحجز`
- Pending: `بانتظار التأكيد`
- Ready: `المعاد متاح` / `المعاد لسه متاح`
- Conflict: `المعاد مبقاش متاح`
- Expired: `انتهى الطلب`
- Dismissed: `تم تجاهل الطلب`
- Book now: `احجز الآن`
- Alternative: `اختار معاد تاني`
- Offline recurrence explanation: `الحجز الأسبوعي يحتاج اتصال بالإنترنت علشان نتأكد من التكرار والتعارضات.`

Do not use Booking success copy such as `تم الحجز` for offline save. It is only allowed after the existing Backend Booking API succeeds.

Offline Transactions:

- Freshness/context: `بدون إنترنت · آخر تحديث 6:42 م`
- Boundary: `سجل المعاملات المعروض محدود بآخر ٧ أيام محفوظة على الجهاز.`
- Outside cache: `البيانات للفترة دي محتاجة إنترنت علشان تتعرض.`
- Offline search limitation: `البحث دون إنترنت يشمل مرجع الدفع فقط.`
- Read-only detail: `تفاصيل العملية للقراءة فقط، وأي إجراء مالي يحتاج اتصال.`
- Action requirement: `يحتاج اتصال بالإنترنت`

Do not label offline finance as a separate `المعاملات الأوفلاين` product area, and do not promise offline payment, refund, cancellation, or settlement creation.
