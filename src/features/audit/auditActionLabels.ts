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
}

export const auditActionOptions = [
  { value: '', label: 'كل الإجراءات' },
  ...Object.entries(auditActionLabelMap).map(([value, label]) => ({
    value,
    label,
  })),
]

export function getAuditActionLabel(action: string): string {
  return auditActionLabelMap[action as SupportedAuditAction] ?? action
}
