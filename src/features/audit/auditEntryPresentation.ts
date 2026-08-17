import { bookingStatusLabels } from '../bookings/bookingDisplay.helpers'
import { getRecurringWeekdayLabel } from '../recurringAgreements/recurringAgreementsDisplay.helpers'
import {
  recurringAgreementStatusLabels,
  recurringDepositStatusLabels,
  type RecurringAgreementStatus,
  type RecurringDepositStatus,
} from '../recurringAgreements/recurringAgreements.types'
import { formatTime12Hour } from '../schedule/scheduleBoard.helpers'
import { settlementStatusLabels } from '../settlements/settlements.types'
import {
  paymentMethodLabels,
  transactionTypeLabels,
  type PaymentMethod,
  type TransactionType,
} from '../transactions/transactions.types'
import { formatArabicDateTime, formatArabicDateWithWeekday } from '../../shared/utils/date'
import { formatMoneyAmount } from '../../shared/utils/money'
import type { AuditLogEntry } from './audit.types'
import { getAuditActionLabel } from './auditActionUi'

export interface AuditPresentationDetail {
  label: string
  value: string
}

export interface AuditPresentationChange {
  label: string
  before: string
  after: string
}

export interface AuditEntryPresentation {
  title: string
  description?: string
  badgeLabel?: string
  actorLabel?: string
  courtLabel?: string
  createdLabel?: string
  details: AuditPresentationDetail[]
  changes: AuditPresentationChange[]
}

type AuditValueFormatter = (value: unknown) => string | null

const sensitiveKeyParts = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  'auth',
  'secret',
  'serializer',
]

const genericMetadataLabels: Record<string, string> = {
  booking_id: 'الحجز',
  customer_name: 'العميل',
  customer_phone: 'رقم العميل',
  court_id: 'الملعب',
  court_name: 'الملعب',
  transaction_id: 'المعاملة',
  payment_method: 'طريقة الدفع',
  amount: 'المبلغ',
  settlement_id: 'التسوية',
  recurring_agreement_id: 'الحجز الأسبوعي',
  reason: 'السبب',
}

const fieldPresenters: Record<
  string,
  {
    label: string
    format: AuditValueFormatter
  }
> = {
  customer_name: { label: 'اسم العميل', format: formatText },
  customer_phone: { label: 'رقم العميل', format: formatText },
  court_name: { label: 'الملعب', format: formatText },
  start_time: { label: 'موعد البداية', format: formatTime },
  end_time: { label: 'موعد النهاية', format: formatTime },
  status: { label: 'الحالة', format: formatBookingStatus },
  source: { label: 'نوع الحجز', format: formatBookingSource },
  total_price: { label: 'القيمة', format: formatMoney },
  amount: { label: 'القيمة', format: formatMoney },
  payment_method: { label: 'طريقة الدفع', format: formatPaymentMethod },
  transaction_type: { label: 'نوع المعاملة', format: formatTransactionType },
  deposit_status: { label: 'حالة التأمين', format: formatRecurringDepositStatus },
  deposit_amount: { label: 'مبلغ التأمين', format: formatMoney },
  cancellation_reason: { label: 'سبب الإلغاء', format: formatCancellationReason },
}

function getEntryMetadata(entry: AuditLogEntry): Record<string, unknown> {
  return entry.metadata ?? {}
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase()

  return sensitiveKeyParts.some((part) => normalizedKey.includes(part))
}

function isSafePrimitive(value: unknown): value is string | number | boolean {
  return ['string', 'number', 'boolean'].includes(typeof value)
}

function formatText(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  const text = String(value).trim()

  return text || null
}

function formatBoolean(value: unknown): string | null {
  return typeof value === 'boolean' ? (value ? 'نعم' : 'لا') : null
}

function formatMoney(value: unknown): string | null {
  return typeof value === 'string' || typeof value === 'number'
    ? formatMoneyAmount(value)
    : null
}

function formatPaymentMethod(value: unknown): string | null {
  return typeof value === 'string'
    ? paymentMethodLabels[value as PaymentMethod] ?? value
    : null
}

function formatTransactionType(value: unknown): string | null {
  return typeof value === 'string'
    ? transactionTypeLabels[value as TransactionType] ?? value
    : null
}

function formatBookingStatus(value: unknown): string | null {
  return typeof value === 'string'
    ? bookingStatusLabels[value as keyof typeof bookingStatusLabels] ?? value
    : null
}

function formatRecurringStatus(value: unknown): string | null {
  return typeof value === 'string'
    ? recurringAgreementStatusLabels[value as RecurringAgreementStatus] ?? value
    : null
}

function formatRecurringDepositStatus(value: unknown): string | null {
  return typeof value === 'string'
    ? recurringDepositStatusLabels[value as RecurringDepositStatus] ?? value
    : null
}

function formatSettlementStatus(value: unknown): string | null {
  return typeof value === 'string'
    ? settlementStatusLabels[value as keyof typeof settlementStatusLabels] ??
        value
    : null
}

function formatBookingSource(value: unknown): string | null {
  if (value === 'RECURRING') {
    return 'أسبوعي'
  }

  if (value === 'MANUAL') {
    return 'يدوي'
  }

  if (value === 'ADMIN_CORRECTION') {
    return 'تصحيح إداري'
  }

  return formatText(value)
}

function formatCancellationReason(value: unknown): string | null {
  if (value === 'PREVIOUS_OCCURRENCE_NOT_COMPLETED') {
    return 'عدم اكتمال الحجز الأسبوعي السابق في الوقت المحدد'
  }

  return formatText(value)
}

function formatTime(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  return formatTime12Hour(value)
}

function formatDateTime(value: unknown): string | null {
  return typeof value === 'string' ? formatArabicDateTime(value) : null
}

function formatDate(value: unknown): string | null {
  return typeof value === 'string' ? formatArabicDateWithWeekday(value) : null
}

function formatWeekday(value: unknown): string | null {
  return typeof value === 'number' || typeof value === 'string'
    ? getRecurringWeekdayLabel(Number(value))
    : null
}

function formatBookingTimeRange(metadata: Record<string, unknown>): string | null {
  const startTime = typeof metadata.start_time === 'string' ? metadata.start_time : null
  const endTime = typeof metadata.end_time === 'string' ? metadata.end_time : null

  if (!startTime || !endTime) {
    return null
  }

  const dateValue =
    typeof metadata.date === 'string'
      ? metadata.date
      : typeof metadata.start_date === 'string'
        ? metadata.start_date
        : null
  const dateLabel = dateValue ? formatDate(dateValue) : null

  return [dateLabel, `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`]
    .filter(Boolean)
    .join('، ')
}

function addDetail(
  details: AuditPresentationDetail[],
  label: string,
  value: string | null,
): void {
  if (value) {
    details.push({ label, value })
  }
}

function formatGenericMetadataValue(key: string, value: unknown): string | null {
  if (!isSafePrimitive(value) || isSensitiveKey(key)) {
    return null
  }

  if (typeof value === 'boolean') {
    return formatBoolean(value)
  }

  const presenter = fieldPresenters[key]

  return presenter ? presenter.format(value) : formatText(value)
}

function getGenericDetails(
  metadata: Record<string, unknown>,
  usedKeys: Set<string>,
): AuditPresentationDetail[] {
  return Object.entries(metadata).flatMap(([key, value]) => {
    if (usedKeys.has(key)) {
      return []
    }

    const label = genericMetadataLabels[key]

    if (!label) {
      return []
    }

    const formattedValue = formatGenericMetadataValue(key, value)

    return formattedValue ? [{ label, value: formattedValue }] : []
  })
}

function getChangedKeys(
  beforeData: Record<string, unknown>,
  afterData: Record<string, unknown>,
): string[] {
  const keys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)])

  return [...keys].filter((key) => beforeData[key] !== afterData[key])
}

function getAuditChanges(entry: AuditLogEntry): AuditPresentationChange[] {
  const beforeData = entry.before_data
  const afterData = entry.after_data

  if (!beforeData || !afterData) {
    return []
  }

  return getChangedKeys(beforeData, afterData).flatMap((key) => {
    if (isSensitiveKey(key)) {
      return []
    }

    const presenter = fieldPresenters[key]

    if (!presenter) {
      return []
    }

    const before = presenter.format(beforeData[key])
    const after = presenter.format(afterData[key])

    if (!before || !after || before === after) {
      return []
    }

    return [{ label: presenter.label, before, after }]
  })
}

function getActorLabel(entry: AuditLogEntry): string | undefined {
  const actorName = entry.actor_name?.trim()

  if (actorName) {
    return actorName
  }

  if (entry.actor && typeof entry.actor === 'object' && entry.actor.name) {
    return entry.actor.name
  }

  if (typeof entry.actor === 'number') {
    return `مستخدم #${entry.actor}`
  }

  return undefined
}

function getCourtLabel(entry: AuditLogEntry): string | undefined {
  const courtName = entry.court_name?.trim()

  if (courtName) {
    return courtName
  }

  return typeof entry.court === 'number' ? `ملعب #${entry.court}` : undefined
}

function getBaseTitle(entry: AuditLogEntry): string {
  return getAuditActionLabel(entry)
}

function getDescription(entry: AuditLogEntry): string | undefined {
  const description = entry.description?.trim()
  const message = entry.message?.trim()

  return description || message || undefined
}

function addBookingDetails(
  details: AuditPresentationDetail[],
  metadata: Record<string, unknown>,
  usedKeys: Set<string>,
): void {
  addDetail(details, 'العميل', formatText(metadata.customer_name))
  addDetail(details, 'رقم العميل', formatText(metadata.customer_phone))
  addDetail(details, 'الملعب', formatText(metadata.court_name))
  addDetail(details, 'موعد الحجز', formatBookingTimeRange(metadata))
  addDetail(details, 'الحالة', formatBookingStatus(metadata.status))
  addDetail(details, 'نوع الحجز', formatBookingSource(metadata.source))
  addDetail(details, 'القيمة', formatMoney(metadata.total_price))
  addDetail(details, 'سبب الإلغاء', formatCancellationReason(metadata.cancellation_reason))

  ;[
    'customer_name',
    'customer_phone',
    'court_name',
    'start_time',
    'end_time',
    'date',
    'start_date',
    'status',
    'source',
    'total_price',
    'cancellation_reason',
  ].forEach((key) => usedKeys.add(key))
}

function addTransactionDetails(
  details: AuditPresentationDetail[],
  metadata: Record<string, unknown>,
  usedKeys: Set<string>,
): string | null {
  const transactionType = formatTransactionType(metadata.transaction_type)

  addDetail(details, 'نوع المعاملة', transactionType)
  addDetail(details, 'القيمة', formatMoney(metadata.amount))
  addDetail(details, 'طريقة الدفع', formatPaymentMethod(metadata.payment_method))
  addDetail(details, 'مرجع الدفع', formatText(metadata.payment_reference))
  addDetail(details, 'العميل', formatText(metadata.customer_name))
  addDetail(details, 'الملعب', formatText(metadata.court_name))

  ;[
    'transaction_type',
    'amount',
    'payment_method',
    'payment_reference',
    'customer_name',
    'court_name',
  ].forEach((key) => usedKeys.add(key))

  return transactionType
}

function addSettlementDetails(
  details: AuditPresentationDetail[],
  metadata: Record<string, unknown>,
  usedKeys: Set<string>,
): void {
  addDetail(details, 'الموظف', formatText(metadata.collected_by_name))
  addDetail(details, 'صافي التسوية', formatMoney(metadata.total_amount))
  addDetail(details, 'عدد المعاملات', formatText(metadata.transaction_count))
  addDetail(details, 'الحالة', formatSettlementStatus(metadata.status))
  addDetail(details, 'تمت بواسطة', formatText(metadata.settled_by_name))
  addDetail(details, 'تاريخ التسوية', formatDateTime(metadata.settled_at))

  ;[
    'collected_by_name',
    'total_amount',
    'transaction_count',
    'status',
    'settled_by_name',
    'settled_at',
  ].forEach((key) => usedKeys.add(key))
}

function addRecurringDetails(
  details: AuditPresentationDetail[],
  metadata: Record<string, unknown>,
  usedKeys: Set<string>,
): void {
  addDetail(details, 'العميل', formatText(metadata.customer_name))
  addDetail(details, 'الملعب', formatText(metadata.court_name))
  addDetail(details, 'اليوم', formatWeekday(metadata.weekday))
  addDetail(details, 'وقت الحجز', formatBookingTimeRange(metadata))
  addDetail(details, 'تاريخ البداية', formatDate(metadata.start_date))
  addDetail(details, 'الحالة', formatRecurringStatus(metadata.status))
  addDetail(details, 'مبلغ التأمين', formatMoney(metadata.deposit_amount))
  addDetail(details, 'حالة التأمين', formatRecurringDepositStatus(metadata.deposit_status))
  addDetail(details, 'سبب الإلغاء', formatCancellationReason(metadata.cancellation_reason))
  addDetail(details, 'تاريخ السريان', formatDate(metadata.effective_date))
  addDetail(details, 'موعد التعثر', formatDateTime(metadata.failed_occurrence_start))
  addDetail(details, 'سبب التعثر', formatText(metadata.action_required_code))

  ;[
    'customer_name',
    'court_name',
    'weekday',
    'start_time',
    'end_time',
    'start_date',
    'status',
    'deposit_amount',
    'deposit_status',
    'cancellation_reason',
    'effective_date',
    'failed_occurrence_start',
    'action_required_code',
  ].forEach((key) => usedKeys.add(key))
}

function getSpecializedTitle(
  entry: AuditLogEntry,
  metadata: Record<string, unknown>,
): string {
  if (
    entry.action === 'TRANSACTION_CREATED' &&
    metadata.transaction_type === 'REFUND'
  ) {
    return 'تسجيل استرداد للعميل'
  }

  if (entry.action === 'RECURRING_AGREEMENT_AUTO_TERMINATED') {
    return 'تم إنهاء الحجز الأسبوعي تلقائيًا'
  }

  return getBaseTitle(entry)
}

function getSpecializedDescription(
  entry: AuditLogEntry,
  metadata: Record<string, unknown>,
): string | undefined {
  if (
    entry.action === 'RECURRING_AGREEMENT_AUTO_TERMINATED' ||
    metadata.cancellation_reason === 'PREVIOUS_OCCURRENCE_NOT_COMPLETED'
  ) {
    return 'تم إنهاء الحجز الأسبوعي تلقائيًا لعدم اكتمال الحجز السابق في الوقت المحدد.'
  }

  return getDescription(entry)
}

/**
 * Centralizes audit-row interpretation so the list never fetches N+1 details.
 *
 * The backend stores structured audit payloads; this pure formatter translates
 * optional list data into Arabic presentation while tolerating partial rollout.
 */
export function getAuditEntryPresentation(
  entry: AuditLogEntry,
): AuditEntryPresentation {
  const metadata = getEntryMetadata(entry)
  const usedKeys = new Set<string>()
  const details: AuditPresentationDetail[] = []

  if (entry.action.startsWith('BOOKING_')) {
    addBookingDetails(details, metadata, usedKeys)
  }

  if (entry.action.startsWith('TRANSACTION_')) {
    addTransactionDetails(details, metadata, usedKeys)
  }

  if (entry.action.startsWith('SETTLEMENT_')) {
    addSettlementDetails(details, metadata, usedKeys)
  }

  if (entry.action.startsWith('RECURRING_')) {
    addRecurringDetails(details, metadata, usedKeys)
  }

  details.push(...getGenericDetails(metadata, usedKeys))

  return {
    title: getSpecializedTitle(entry, metadata),
    description: getSpecializedDescription(entry, metadata),
    badgeLabel: getBaseTitle(entry),
    actorLabel: getActorLabel(entry),
    courtLabel: getCourtLabel(entry),
    createdLabel: formatDateTime(entry.created) ?? undefined,
    details,
    changes: getAuditChanges(entry),
  }
}
