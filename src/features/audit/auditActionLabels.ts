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
  | 'RECURRING_OCCURRENCE_GENERATED'
  | 'RECURRING_GENERATION_FAILED'
  | 'MEMBERSHIP_DELETED'

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
  RECURRING_OCCURRENCE_GENERATED: 'إنشاء حجز أسبوعي تلقائي',
  RECURRING_GENERATION_FAILED: 'تعذر إنشاء الحجز الأسبوعي',
  MEMBERSHIP_DELETED: 'حذف عضوية',
}

export const auditFilterActions: SupportedAuditAction[] = [
  'BOOKING_CREATED',
  'BOOKING_UPDATED',
  'BOOKING_CANCELLED',
  'BOOKING_COMPLETED',
  'BOOKING_NO_SHOW',
  'BOOKING_EXPIRED',
  'BOOKING_RESCHEDULED',
  'TRANSACTION_CREATED',
  'TRANSACTION_CANCELLED',
  'SETTLEMENT_CREATED',
  'SETTLEMENT_MARKED_SETTLED',
  'MEMBERSHIP_DELETED',
]

export const auditActionOptions = [
  { value: '', label: 'كل الإجراءات' },
  ...auditFilterActions.map((value) => ({
    value,
    label: auditActionLabelMap[value],
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
