import type { AuditLogEntry } from './audit.types'

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

export interface AuditActionUiConfig {
  icon: string
  foregroundClass: string
  softBackgroundClass: string
  accentBorderClass: string
}

export const auditActionUiConfig: Record<
  SupportedAuditAction,
  AuditActionUiConfig
> = {
  BOOKING_CREATED: {
    icon: '+',
    foregroundClass: 'text-green-700',
    softBackgroundClass: 'bg-green-50',
    accentBorderClass: 'border-r-green-500',
  },
  BOOKING_UPDATED: {
    icon: '~',
    foregroundClass: 'text-blue-700',
    softBackgroundClass: 'bg-blue-50',
    accentBorderClass: 'border-r-blue-500',
  },
  BOOKING_CANCELLED: {
    icon: 'x',
    foregroundClass: 'text-red-700',
    softBackgroundClass: 'bg-red-50',
    accentBorderClass: 'border-r-red-500',
  },
  BOOKING_COMPLETED: {
    icon: '✓',
    foregroundClass: 'text-blue-700',
    softBackgroundClass: 'bg-blue-50',
    accentBorderClass: 'border-r-blue-500',
  },
  BOOKING_NO_SHOW: {
    icon: '!',
    foregroundClass: 'text-red-900',
    softBackgroundClass: 'bg-red-100',
    accentBorderClass: 'border-r-red-900',
  },
  BOOKING_EXPIRED: {
    icon: '...',
    foregroundClass: 'text-gray-700',
    softBackgroundClass: 'bg-gray-100',
    accentBorderClass: 'border-r-gray-400',
  },
  BOOKING_RESCHEDULED: {
    icon: '↺',
    foregroundClass: 'text-amber-800',
    softBackgroundClass: 'bg-amber-50',
    accentBorderClass: 'border-r-amber-500',
  },
  TRANSACTION_CREATED: {
    icon: '$',
    foregroundClass: 'text-emerald-700',
    softBackgroundClass: 'bg-emerald-50',
    accentBorderClass: 'border-r-emerald-500',
  },
  TRANSACTION_CANCELLED: {
    icon: 'x',
    foregroundClass: 'text-red-700',
    softBackgroundClass: 'bg-red-50',
    accentBorderClass: 'border-r-red-500',
  },
  SETTLEMENT_CREATED: {
    icon: '#',
    foregroundClass: 'text-indigo-700',
    softBackgroundClass: 'bg-indigo-50',
    accentBorderClass: 'border-r-indigo-500',
  },
  SETTLEMENT_MARKED_SETTLED: {
    icon: '✓',
    foregroundClass: 'text-green-700',
    softBackgroundClass: 'bg-green-50',
    accentBorderClass: 'border-r-green-500',
  },
}

export const neutralAuditActionUiConfig: AuditActionUiConfig = {
  icon: '?',
  foregroundClass: 'text-slate-700',
  softBackgroundClass: 'bg-slate-100',
  accentBorderClass: 'border-r-slate-400',
}

export const auditActionLabelFallbacks: Record<SupportedAuditAction, string> = {
  BOOKING_CREATED: 'تم إنشاء حجز',
  BOOKING_UPDATED: 'تم تعديل حجز',
  BOOKING_CANCELLED: 'تم إلغاء حجز',
  BOOKING_COMPLETED: 'تم إكمال حجز',
  BOOKING_NO_SHOW: 'تم تسجيل عدم حضور',
  BOOKING_EXPIRED: 'انتهى حجز مؤقت',
  BOOKING_RESCHEDULED: 'تم تغيير موعد حجز',
  TRANSACTION_CREATED: 'تم تسجيل دفعة',
  TRANSACTION_CANCELLED: 'تم إلغاء دفعة',
  SETTLEMENT_CREATED: 'تم إنشاء تسوية',
  SETTLEMENT_MARKED_SETTLED: 'تم تأكيد تسوية',
}

export function getAuditActionUiConfig(action: string): AuditActionUiConfig {
  return (
    auditActionUiConfig[action as SupportedAuditAction] ??
    neutralAuditActionUiConfig
  )
}

export function getAuditActionLabel(entry: AuditLogEntry): string {
  const actionLabel = entry.action_label?.trim()

  if (actionLabel) {
    return actionLabel
  }

  return (
    auditActionLabelFallbacks[entry.action as SupportedAuditAction] ??
    entry.action
  )
}
