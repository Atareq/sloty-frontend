import { formatTime12Hour } from '../schedule/scheduleBoard.helpers'
import type { RecurringAgreement } from './recurringAgreements.types'
import { recurringAgreementStatusLabels } from './recurringAgreements.types'

const weekdayLabels: Record<number, string> = {
  0: 'الاثنين',
  1: 'الثلاثاء',
  2: 'الأربعاء',
  3: 'الخميس',
  4: 'الجمعة',
  5: 'السبت',
  6: 'الأحد',
}

export function getRecurringWeekdayLabel(weekday: number): string {
  return weekdayLabels[weekday] ?? `اليوم #${weekday}`
}

export function formatRecurringTimeRange(
  startTime: string,
  endTime: string,
): string {
  return `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`
}

export function getRecurringCourtLabel(
  courtId: number,
  courtName?: string | null,
  courtLabels: Record<string, string> = {},
): string {
  return courtName ?? courtLabels[String(courtId)] ?? `ملعب #${courtId}`
}

export function isAutoTerminatedRecurringAgreement(
  agreement: Pick<RecurringAgreement, 'status' | 'cancellation_reason'>,
): boolean {
  return (
    agreement.status === 'CANCELLED' &&
    agreement.cancellation_reason === 'PREVIOUS_OCCURRENCE_NOT_COMPLETED'
  )
}

export function getRecurringAgreementStatusLabel(
  agreement: Pick<RecurringAgreement, 'status' | 'cancellation_reason'>,
): string {
  return isAutoTerminatedRecurringAgreement(agreement)
    ? 'منتهي تلقائيًا'
    : recurringAgreementStatusLabels[agreement.status]
}

export function getRecurringCancellationReasonLabel(reason: string): string {
  if (reason === 'PREVIOUS_OCCURRENCE_NOT_COMPLETED') {
    return 'عدم اكتمال الحجز الأسبوعي السابق في الوقت المحدد'
  }

  return reason
}

export function getRecurringActionRequiredLabel(code: string): string {
  if (!code) {
    return 'يحتاج مراجعة من المسؤول'
  }

  if (code === 'PREVIOUS_OCCURRENCE_NOT_COMPLETED') {
    return 'الحجز الأسبوعي السابق لم يكتمل في الوقت المحدد'
  }

  if (code === 'OCCURRENCE_GENERATION_FAILED') {
    return 'تعذر إنشاء أحد حجوزات الأسبوعية'
  }

  return code
}
