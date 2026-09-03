/**
 * Centralized Sloty product vocabulary.
 *
 * Keep this limited to repeated labels and status wording. Unique feature
 * paragraphs stay local to their screens.
 */

export const navigationCopy = {
  home: 'الرئيسية',
  schedule: 'الجدول',
  followUp: 'المتابعة',
  bookings: 'سجل الحجوزات',
  transactionsStaff: 'معاملاتي المالية',
  transactionsManagement: 'سجل المعاملات المالية',
  custodyStaff: 'عهدتي',
  moneyManagement: 'إدارة الأموال',
  staffMoneyNav: 'المبالغ مع الموظفين',
  staffMoneyPage: 'المبالغ مع الموظفين',
  reports: 'التقارير',
  audit: 'سجل النشاط',
  settings: 'الإعدادات',
  courtSettings: 'إعدادات الملاعب',
  ledgerBackToMoney: '‹ إدارة الأموال',
} as const

/** @deprecated Use `navigationCopy`. Kept so existing imports stay stable. */
export const appNavCopy = navigationCopy

export const roleCopy = {
  OWNER: 'مالك',
  MANAGER: 'مدير',
  STAFF: 'موظف',
  PLATFORM_ADMIN: 'مدير المنصة',
} as const

export const bookingStatusCopy = {
  HOLD: 'بانتظار العربون',
  CONFIRMED: 'العربون مدفوع',
  COMPLETED: 'تم اللعب',
  CANCELLED: 'ملغي',
  NO_SHOW: 'عدم حضور',
  EXPIRED: 'انتهت المهلة',
} as const

export const bookingActionCopy = {
  recordDepositAndConfirm: 'سجّل العربون وأكّد الحجز',
  complete: 'تم اللعب',
  noShow: 'عدم حضور',
  cancelBooking: 'إلغاء الحجز',
  endRecurrence: 'إيقاف الحجز الأسبوعي',
  editCustomer: 'تعديل بيانات الحجز',
  reschedule: 'تغيير الموعد',
  otherOptions: '••• خيارات أخرى',
  collectRemaining: (amountLabel: string) => `حصّل ${amountLabel}`,
  endedNeedsClose: 'انتهى الموعد ولسه محتاج يتقفل',
  remainingAfterEnd: (amountLabel: string) =>
    `الحجز خلص ولسه عليه ${amountLabel}`,
  remainingNow: (amountLabel: string) => `متبقي ${amountLabel}`,
  completedWithRemaining:
    'حجز تم اللعب به مبلغ متبقي — يحتاج مراجعة مالية',
  notes: 'ملاحظات',
  requiredDeposit: 'العربون المطلوب',
  bookingTotal: 'إجمالي الحجز',
  paidAmount: 'المدفوع',
  remainingNowLabel: 'المتبقي دلوقتي',
} as const

export const recurringCopy = {
  weeklyBooking: '↻ حجز أسبوعي',
  weeklyReserved: '↻ محجوز أسبوعيًا',
  weeklyCheckbox: 'ثبّت نفس الموعد كل أسبوع',
  currentPrice: 'السعر الحالي',
  weeklyHelper: 'المعاد ده متثبت للعميل كل أسبوع.',
  stopWeeklyConfirmTitle: 'إيقاف الحجز الأسبوعي؟',
  stopWeeklyConfirmBody:
    'الحجز الحالي هيفضل زي ما هو، لكن المعاد مش هيتحجز تلقائيًا في الأسابيع الجاية.',
  stopWeeklySuccess: 'تم إيقاف الحجز الأسبوعي',
} as const

export const customerCopy = {
  customerName: 'اسم العميل',
  mobileNumber: 'رقم الموبايل',
  /** Server `search` currently covers customer name and phone. Notes are a Backend gap. */
  customerOrMobileSearch: 'اسم العميل أو رقم الموبايل',
} as const

export const financeCopy = {
  withEmployeeNow: 'معاه دلوقتي',
  receiveAmount: 'استلام المبلغ',
  confirmReceiveAmount: 'تأكيد استلام المبلغ',
  receiveAmountSuccess: 'تم استلام المبلغ بنجاح',
  viewDetails: 'عرض التفاصيل',
  viewLinkedTransactions: 'عرض المعاملات المرتبطة',
  hideLinkedTransactions: 'إخفاء المعاملات',
  reviewPreviouslyReceived: 'مراجعة المبالغ المستلمة سابقًا',
  amountsNeedingReceipt: 'مبالغ محتاجة استلام',
  previouslyReceived: 'تم استلامها سابقًا',
  allEmployees: 'كل الموظفين',
  collector: 'الموظف المحصل',
  financialLedgerLink: 'عرض سجل المعاملات المالية',
  collectedBy: 'حصّلها',
  receivedBy: 'تم الاستلام بواسطة',
  paymentReference: 'مرجع الدفع',
  noAmountWithYou: 'مفيش مبالغ معاك دلوقتي.',
  noAmountNeedingHandover: 'مفيش مبلغ معاك محتاج يتسلّم دلوقتي.',
  settlementPreviewEmpty: 'مفيش مبلغ حالي للموظف دلوقتي.',
  currentCustody: 'العهدة الحالية',
  currentEmployeeMoney: 'المبالغ الموجودة مع الموظفين حاليًا',
  currentCustodyEmpty: 'لا توجد مبالغ مستحقة للتسليم حاليًا',
  currentCustodyZero: 'صافي المبلغ المستحق حاليًا: 0 ج.م',
  currentCustodyPositive: (amountLabel: string) =>
    `المبلغ المستحق للتسليم: ${amountLabel}`,
  settlementPreviewStale: 'المبلغ اتغير. جبنا آخر حالة من السيرفر.',
  selfPreviewDenied:
    'المبلغ ده خاص بتحصيلاتك، ولازم يستلمه شخص عنده صلاحية الاستلام.',
} as const

export const searchCopy = {
  quickShortcuts: 'اختصارات البحث السريع',
  resultsRefreshing: 'نتائج البحث',
} as const

export const settingsCopy = {
  courtSettings: 'إعدادات الملاعب',
  requireDigitalPaymentReference: 'طلب مرجع الدفع للمدفوعات الإلكترونية',
  requireDigitalPaymentReferenceHelper:
    'لو الإعداد ده مفعّل، لازم الموظف يكتب مرجع العملية عند الدفع بمحفظة إلكترونية أو تحويل بنكي.',
  addPricingPeriod: '+ إضافة فترة جديدة',
  copyDayToRest: (weekdayLabel: string) =>
    `نسخ مواعيد ${weekdayLabel} لباقي أيام الأسبوع`,
  workingHoursSaveSummary:
    'حصلت مشكلة في بعض البيانات. راجع الحقول المحددة.',
  confirmPassword: 'تأكيد كلمة المرور',
  passwordMismatch: 'تأكيد كلمة المرور غير مطابق',
  showPassword: 'إظهار كلمة المرور',
  hidePassword: 'إخفاء كلمة المرور',
} as const

export const validationCopy = {
  required: 'هذا الحقل مطلوب',
  emailInvalid: 'البريد الإلكتروني غير صحيح',
  passwordRequired: 'كلمة المرور مطلوبة',
  amountRequired: 'المبلغ مطلوب',
  amountPositive: 'المبلغ يجب أن يكون أكبر من صفر',
  firstPaymentMinimum: (amountLabel: string) =>
    `الدفعة الأولى لازم تكون على الأقل ${amountLabel}.`,
} as const

export const sessionCopy = {
  expired: 'انتهت الجلسة. سجّل دخولك تاني علشان تكمل.',
} as const

export const auditCopy = {
  helper:
    'متابعة الإجراءات والتعديلات التي أجراها المستخدمون داخل النادي.',
} as const

/** @deprecated Use `financeCopy`. Kept so existing imports stay stable. */
export const moneyCopy = financeCopy
