import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import {
  getApiErrorMessage,
  getApiFieldErrors,
  isApiClientError,
} from '../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import {
  formatArabicDateTime,
  formatArabicDateWithWeekday,
} from '../../../shared/utils/date'
import { formatMoneyAmount } from '../../../shared/utils/money'
import {
  cancelRecurringAgreement,
  getRecurringAgreement,
  getRecurringCancellationPreview,
  refundRecurringDeposit,
} from '../recurringAgreementsApi'
import {
  formatRecurringTimeRange,
  getRecurringActionRequiredLabel,
  getRecurringAgreementStatusLabel,
  getRecurringCancellationReasonLabel,
  getRecurringCourtLabel,
  getRecurringWeekdayLabel,
  isAutoTerminatedRecurringAgreement,
} from '../recurringAgreementsDisplay.helpers'
import {
  type RecurringAgreement,
  type RecurringAgreementCancelPayload,
  type RecurringAgreementCancellationPreview,
} from '../recurringAgreements.types'
import { RecurringCancellationSheet } from '../components/RecurringCancellationSheet/RecurringCancellationSheet'
import { RecurringDepositStatusBadge } from '../components/RecurringDepositStatusBadge/RecurringDepositStatusBadge'

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  return (
    <div className="rounded-2xl bg-[var(--sloty-bg)] p-3">
      <dt className="text-sm font-bold text-[var(--sloty-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-black text-[var(--sloty-text-primary)]">
        {value}
      </dd>
    </div>
  )
}

/**
 * Recurring agreement details and supported agreement-level actions.
 */
export function RecurringAgreementDetailsPage() {
  const { agreementId } = useParams()
  const { refreshCurrentUser, selectedClubSlug } = useAuth()
  const [agreement, setAgreement] = useState<RecurringAgreement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCancellationOpen, setIsCancellationOpen] = useState(false)
  const [cancellationPreview, setCancellationPreview] =
    useState<RecurringAgreementCancellationPreview | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancellationError, setCancellationError] = useState<string | null>(null)
  const [isRefunding, setIsRefunding] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)
  const [, setRefundFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const isAutoTerminated = agreement
    ? isAutoTerminatedRecurringAgreement(agreement)
    : false

  useEffect(() => {
    let isActive = true

    async function loadAgreement(): Promise<void> {
      if (!selectedClubSlug || !agreementId) {
        setError('رابط الحجز الأسبوعي غير صحيح')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await getRecurringAgreement(
          selectedClubSlug,
          agreementId,
        )

        if (isActive) {
          setAgreement(response)
        }
      } catch (error) {
        if (isActive) {
          setError(getApiErrorMessage(error, 'تعذر تحميل الحجز الأسبوعي'))
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadAgreement()

    return () => {
      isActive = false
    }
  }, [agreementId, selectedClubSlug])

  async function handlePreviewCancellation(
    values: RecurringAgreementCancelPayload,
  ): Promise<void> {
    if (!selectedClubSlug || !agreementId) {
      return
    }

    setIsPreviewLoading(true)
    setCancellationError(null)
    setCancellationPreview(null)

    try {
      setCancellationPreview(
        await getRecurringCancellationPreview(
          selectedClubSlug,
          agreementId,
          values,
        ),
      )
    } catch (error) {
      setCancellationError(
        getApiErrorMessage(error, 'تعذر مراجعة إلغاء الحجز الأسبوعي'),
      )
    } finally {
      setIsPreviewLoading(false)
    }
  }

  async function handleCancelAgreement(
    values: RecurringAgreementCancelPayload,
  ): Promise<void> {
    if (!selectedClubSlug || !agreementId) {
      return
    }

    setIsCancelling(true)
    setCancellationError(null)

    try {
      setAgreement(
        await cancelRecurringAgreement(selectedClubSlug, agreementId, values),
      )
      setIsCancellationOpen(false)
      setCancellationPreview(null)
    } catch (error) {
      setCancellationError(
        getApiErrorMessage(error, 'تعذر إلغاء الحجز الأسبوعي'),
      )

      if (isApiClientError(error) && error.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setIsCancelling(false)
    }
  }

  async function handleRefundDeposit(): Promise<void> {
    if (!selectedClubSlug || !agreementId) {
      return
    }

    setIsRefunding(true)
    setRefundError(null)
    setRefundFieldErrors(null)

    try {
      setAgreement(await refundRecurringDeposit(selectedClubSlug, agreementId))
    } catch (error) {
      setRefundError(getApiErrorMessage(error, 'تعذر استرداد التأمين'))
      setRefundFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsRefunding(false)
    }
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل تفاصيل الحجز الأسبوعي...
          </p>
        </AppCard>
      ) : null}

      {error ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-danger)]">
            {error}
          </p>
        </AppCard>
      ) : null}

      {agreement ? (
        <>
          {agreement.status === 'ACTION_REQUIRED' ? (
            <AppCard>
              <p className="text-sm font-black text-[var(--sloty-danger)]">
                هذا الحجز الأسبوعي يحتاج إجراء
              </p>
              <dl className="mt-3 grid gap-3 md:grid-cols-3">
                <DetailRow
                  label="سبب الحالة"
                  value={getRecurringActionRequiredLabel(
                    agreement.action_required_code,
                  )}
                />
                <DetailRow
                  label="موعد التعثر"
                  value={formatArabicDateTime(agreement.failed_occurrence_start)}
                />
                <DetailRow
                  label="تاريخ تسجيل الحالة"
                  value={formatArabicDateTime(agreement.action_required_at)}
                />
              </dl>
            </AppCard>
          ) : null}

          {isAutoTerminated ? (
            <AppCard>
              <h2 className="text-lg font-black text-[var(--sloty-danger)]">
                تم إنهاء الحجز الأسبوعي تلقائيًا
              </h2>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--sloty-text-muted)]">
                لم يتم إكمال الحجز الأسبوعي السابق خلال المهلة المسموحة، لذلك
                تم إنهاء الاتفاق تلقائيًا.
              </p>
            </AppCard>
          ) : null}

          <AppCard>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
                  {agreement.customer_name}
                </h2>
                <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
                  {getRecurringCourtLabel(
                    agreement.court,
                    agreement.court_name,
                  )}
                </p>
              </div>
              <span className="rounded-full bg-[var(--sloty-bg)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]">
                {getRecurringAgreementStatusLabel(agreement)}
              </span>
            </div>

            <dl className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailRow label="رقم الهاتف" value={agreement.customer_phone} />
              <DetailRow
                label="اليوم"
                value={getRecurringWeekdayLabel(agreement.weekday)}
              />
              <DetailRow
                label="وقت الحجز"
                value={formatRecurringTimeRange(
                  agreement.start_time,
                  agreement.end_time,
                )}
              />
              <DetailRow
                label="تاريخ البداية"
                value={formatArabicDateWithWeekday(agreement.start_date)}
              />
              <DetailRow
                label="تاريخ الإنشاء"
                value={formatArabicDateTime(agreement.created)}
              />
              <DetailRow label="ملاحظات" value={agreement.notes} />
            </dl>
          </AppCard>

          <AppCard>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
                  التأمين
                </h2>
                <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                  التأمين منفصل عن دفعات الحجوزات الأسبوعية
                </p>
              </div>
              <RecurringDepositStatusBadge status={agreement.deposit_status} />
            </div>

            <dl className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DetailRow
                label="مبلغ التأمين"
                value={formatMoneyAmount(agreement.deposit_amount)}
              />
              <DetailRow
                label="تم التحصيل في"
                value={formatArabicDateTime(agreement.deposit_collected_at)}
              />
              <DetailRow
                label="مستحق الاسترداد في"
                value={formatArabicDateTime(agreement.refund_due_at)}
              />
              <DetailRow
                label="تم الاسترداد في"
                value={formatArabicDateTime(agreement.refunded_at)}
              />
            </dl>

            {refundError ? (
              <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
                {refundError}
              </p>
            ) : null}

            {agreement.deposit_status === 'REFUND_DUE' ? (
              <div className="mt-4">
                <AppButton
                  disabled={isRefunding}
                  onClick={() => void handleRefundDeposit()}
                  variant="primary"
                >
                  {isRefunding ? 'جاري الاسترداد...' : 'استرداد التأمين'}
                </AppButton>
              </div>
            ) : null}

            {agreement.deposit_status === 'FORFEITED' ? (
              <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
                تم احتجاز التأمين حسب حالة الاتفاق التي أرجعها الخادم.
              </p>
            ) : null}
          </AppCard>

          {(agreement.cancellation_requested_at ||
            agreement.cancellation_effective_date ||
            agreement.cancellation_reason) ? (
            <AppCard>
              <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
                بيانات الإلغاء
              </h2>
              <dl className="mt-5 grid gap-3 md:grid-cols-3">
                <DetailRow
                  label="طلب الإلغاء"
                  value={formatArabicDateTime(agreement.cancellation_requested_at)}
                />
                <DetailRow
                  label="تاريخ السريان"
                  value={agreement.cancellation_effective_date}
                />
                <DetailRow
                  label="سبب الإلغاء"
                  value={getRecurringCancellationReasonLabel(
                    agreement.cancellation_reason,
                  )}
                />
                <DetailRow
                  label="تم بواسطة"
                  value={
                    isAutoTerminated && agreement.cancelled_by === null
                      ? 'تم بواسطة النظام'
                      : agreement.cancelled_by_name ??
                        (agreement.cancelled_by
                          ? `مستخدم #${agreement.cancelled_by}`
                          : null)
                  }
                />
              </dl>
            </AppCard>
          ) : null}

          {agreement.status !== 'CANCELLED' ? (
            <AppCard>
              <AppButton
                onClick={() => {
                  setIsCancellationOpen(true)
                  setCancellationPreview(null)
                  setCancellationError(null)
                }}
                variant="danger"
              >
                إلغاء الحجز الأسبوعي
              </AppButton>
            </AppCard>
          ) : null}
        </>
      ) : null}

      {isCancellationOpen ? (
        <RecurringCancellationSheet
          error={cancellationError}
          isPreviewLoading={isPreviewLoading}
          isSubmitting={isCancelling}
          onCancel={handleCancelAgreement}
          onClose={() => {
            setIsCancellationOpen(false)
            setCancellationPreview(null)
            setCancellationError(null)
          }}
          onPreview={handlePreviewCancellation}
          preview={cancellationPreview}
        />
      ) : null}
    </div>
  )
}
