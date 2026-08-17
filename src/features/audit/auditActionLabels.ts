export type SupportedAuditAction =
  | 'BOOKING_CREATED'
  | 'BOOKING_UPDATED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_NO_SHOW'
  | 'BOOKING_EXPIRED'
  | 'BOOKING_RESCHEDULED'
  | 'TRANSACTION_CREATED'
  | 'TRANSACTION_CANCELLED'
  | 'SETTLEMENT_CREATED'
  | 'SETTLEMENT_MARKED_SETTLED'
  | 'RECURRING_AGREEMENT_CREATED'
  | 'RECURRING_AGREEMENT_CANCELLED'
  | 'RECURRING_AGREEMENT_AUTO_TERMINATED'
  | 'RECURRING_DEPOSIT_COLLECTED'
  | 'RECURRING_DEPOSIT_REFUND_DUE'
  | 'RECURRING_DEPOSIT_REFUNDED'
  | 'RECURRING_DEPOSIT_FORFEITED'
  | 'RECURRING_OCCURRENCE_GENERATED'
  | 'RECURRING_GENERATION_FAILED'

export const auditActionLabelMap: Record<SupportedAuditAction, string> = {
  BOOKING_CREATED: 'إنشاء حجز',
  BOOKING_UPDATED: 'تعديل حجز',
  BOOKING_CANCELLED: 'إلغاء حجز',
  BOOKING_COMPLETED: 'إكمال حجز',
  BOOKING_NO_SHOW: 'تسجيل عدم حضور',
  BOOKING_EXPIRED: 'انتهاء حجز',
  BOOKING_RESCHEDULED: 'إعادة جدولة حجز',
  TRANSACTION_CREATED: 'تسجيل معاملة مالية',
  TRANSACTION_CANCELLED: 'إلغاء معاملة مالية',
  SETTLEMENT_CREATED: 'إنشاء تسوية',
  SETTLEMENT_MARKED_SETTLED: 'تعليم التسوية كمكتملة',
  RECURRING_AGREEMENT_CREATED: 'إنشاء حجز أسبوعي',
  RECURRING_AGREEMENT_CANCELLED: 'إلغاء حجز أسبوعي',
  RECURRING_AGREEMENT_AUTO_TERMINATED: 'إنهاء الحجز الأسبوعي تلقائيًا',
  RECURRING_DEPOSIT_COLLECTED: 'تحصيل تأمين الحجز الأسبوعي',
  RECURRING_DEPOSIT_REFUND_DUE: 'استحقاق استرداد تأمين الحجز الأسبوعي',
  RECURRING_DEPOSIT_REFUNDED: 'استرداد تأمين الحجز الأسبوعي',
  RECURRING_DEPOSIT_FORFEITED: 'احتجاز تأمين الحجز الأسبوعي',
  RECURRING_OCCURRENCE_GENERATED: 'إنشاء حجز أسبوعي تلقائي',
  RECURRING_GENERATION_FAILED: 'تعذر إنشاء الحجز الأسبوعي',
}

export const auditActionOptions = [
  { value: '', label: 'كل الإجراءات' },
  ...Object.entries(auditActionLabelMap).map(([value, label]) => ({
    value,
    label,
  })),
]

export function getAuditActionLabel(action: string): string {
  const mappedLabel = auditActionLabelMap[action as SupportedAuditAction]

  if (mappedLabel) {
    return mappedLabel
  }

  return action
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || action
}
