import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  getApiErrorCode,
  getApiErrorMessage,
  isApiClientError,
} from '../../../core/api/apiError.helpers'
import {
  canManageSettlements,
  canViewOwnSettlements,
} from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { AppSheet } from '../../../shared/components/AppSheet/AppSheet'
import { PageActions } from '../../../shared/components/PageActions/PageActions'
import { formatArabicDateTime, formatArabicPeriodRange } from '../../../shared/utils/date'
import { financeCopy } from '../../../shared/copy/appCopy'
import { SettlementTotalsCard } from '../components/SettlementTotalsCard/SettlementTotalsCard'
import { SettlementTransactionsList } from '../components/SettlementTransactionsList/SettlementTransactionsList'
import {
  getSettlement,
  markSettlementSettled,
} from '../settlementsApi'
import {
  formatSettlementActor,
  getSettlementCollectorName,
} from '../settlementDisplay.helpers'
import type { Settlement } from '../settlements.types'

const statusLabels: Record<string, string> = {
  PENDING: 'محتاج استلام',
  SETTLED: 'تم الاستلام',
}

function getTransactions(settlement: Settlement) {
  return settlement.lines ?? settlement.transactions ?? []
}

/**
 * Read-only settlement detail page for backend-generated settlement periods.
 */
export function SettlementDetailPage() {
  const { settlementId } = useParams()
  const {
    currentUser,
    refreshCurrentUser,
    role,
    selectedClubSlug,
    selectedMembership,
  } = useAuth()
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingSettled, setIsMarkingSettled] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const canSettle = canManageSettlements(selectedMembership, role)
  const canViewOwn = canViewOwnSettlements(selectedMembership, role)
  const canMarkSettled = Boolean(
    canSettle &&
      settlement?.status === 'PENDING' &&
      currentUser?.id &&
      settlement.collected_by &&
      currentUser.id !== settlement.collected_by,
  )

  useEffect(() => {
    let isActive = true

    async function loadSettlement(): Promise<void> {
      if (!selectedClubSlug) {
        setSettlement(null)
        setMessage('اختر ناديًا أولًا لعرض المبالغ')
        setError(null)
        setIsLoading(false)
        return
      }

      if (!canViewOwn) {
        setSettlement(null)
        setMessage(null)
        setError('ليس لديك صلاحية عرض التسويات')
        setIsLoading(false)
        return
      }

      if (!settlementId) {
        setSettlement(null)
        setMessage(null)
        setError('لم يتم تحديد التسوية المطلوبة')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      setMessage(null)

      try {
        const response = await getSettlement(selectedClubSlug, settlementId)

        if (isActive) {
          setSettlement(response)
        }
      } catch (error) {
        if (isActive) {
          setSettlement(null)
          setError(getApiErrorMessage(error, 'تعذر تحميل تفاصيل التسوية'))
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadSettlement()

    return () => {
      isActive = false
    }
  }, [canViewOwn, selectedClubSlug, settlementId])

  async function handleMarkSettled(): Promise<void> {
    if (!selectedClubSlug || !settlementId || !canMarkSettled) {
      return
    }

    setIsMarkingSettled(true)
    setError(null)
    setMessage(null)

    try {
      const response = await markSettlementSettled(selectedClubSlug, settlementId)

      setSettlement(response)
      setIsConfirmOpen(false)
      setMessage('تم استلام المبلغ بنجاح')
    } catch (error) {
      const errorCode = getApiErrorCode(error)

      setError(getApiErrorMessage(error, 'تعذر تحديث حالة التسوية'))

      if (
        errorCode === 'SETTLEMENT_ALREADY_DONE' ||
        errorCode === 'TRANSACTION_SETTLED_LOCKED'
      ) {
        try {
          setSettlement(await getSettlement(selectedClubSlug, settlementId))
        } catch {
          setSettlement(null)
        }
      }

      if (isApiClientError(error) && error.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setIsMarkingSettled(false)
    }
  }

  const transactions = settlement ? getTransactions(settlement) : []
  const status = settlement?.status
    ? statusLabels[settlement.status] ?? settlement.status
    : 'غير محدد'

  return (
    <div className="space-y-5">
      <PageActions>
        <Link to="/settlements">
          <AppButton variant="secondary">رجوع إلى إدارة الأموال</AppButton>
        </Link>
      </PageActions>

      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل تفاصيل الاستلام...
          </p>
        </AppCard>
      ) : null}

      {!isLoading && (error || message) ? (
        <AppCard>
          <p
            className={[
              'text-sm font-bold',
              error
                ? 'text-[var(--sloty-danger)]'
                : 'text-[var(--sloty-primary-dark)]',
            ].join(' ')}
          >
            {error ?? message}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && settlement ? (
        <>
          <SettlementTotalsCard
            totalAmount={settlement.total_amount}
            totalsByPaymentMethod={settlement.totals_by_payment_method}
            transactionCount={settlement.transaction_count}
          />

          <AppCard className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                  الموظف
                </p>
                <h2 className="mt-1 text-2xl font-black text-[var(--sloty-text-primary)]">
                  {getSettlementCollectorName(settlement)}
                </h2>
              </div>
              {canMarkSettled ? (
                <AppButton
                  disabled={isMarkingSettled}
                  onClick={() => setIsConfirmOpen(true)}
                >
                  تأكيد استلام المبلغ
                </AppButton>
              ) : null}
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  المستخدم
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {getSettlementCollectorName(settlement)}
                </dd>
              </div>
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  الحالة
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {status}
                </dd>
              </div>
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 md:col-span-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  الفترة
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {(() => {
                    const period = formatArabicPeriodRange(
                      settlement.period_start,
                      settlement.period_end,
                    )

                    if (!period) {
                      return 'غير محدد'
                    }

                    return (
                      <>
                        من {period.startLabel}
                        <br />
                        إلى {period.endLabel}
                      </>
                    )
                  })()}
                </dd>
              </div>
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  تاريخ الإنشاء
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {formatArabicDateTime(settlement.created) ?? 'غير محدد'}
                </dd>
              </div>
              {settlement.status === 'SETTLED' ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    {financeCopy.receivedBy}
                  </dt>
                  <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                    {formatSettlementActor(settlement.settled_by)}
                  </dd>
                </div>
              ) : null}
              {settlement.settled_at ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    تاريخ الاستلام
                  </dt>
                  <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                    {formatArabicDateTime(settlement.settled_at) ?? 'غير محدد'}
                  </dd>
                </div>
              ) : null}
              {settlement.notes?.trim() ? (
                <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 md:col-span-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    ملاحظات
                  </dt>
                  <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                    {settlement.notes}
                  </dd>
                </div>
              ) : null}
            </dl>
          </AppCard>

          <SettlementTransactionsList
            emptyMessage="لا توجد معاملات داخل هذا الاستلام."
            transactions={transactions}
          />

          <AppSheet
            className="md:max-w-md"
            isOpen={isConfirmOpen}
            onRequestClose={() => {
              if (!isMarkingSettled) {
                setIsConfirmOpen(false)
              }
            }}
            title="تأكيد استلام المبلغ"
          >
            <div className="space-y-4 p-4 pt-12 sm:p-5 sm:pt-12">
              <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
                تأكيد استلام المبلغ
              </h2>
              <p className="text-sm font-bold leading-6 text-[var(--sloty-text-muted)]">
                بعد التأكيد المبلغ هيتحوّل إلى مستلم ومقفول.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <AppButton disabled={isMarkingSettled} onClick={handleMarkSettled}>
                  {isMarkingSettled
                    ? 'جاري تأكيد الاستلام...'
                    : 'تأكيد استلام المبلغ'}
                </AppButton>
                <AppButton
                  disabled={isMarkingSettled}
                  onClick={() => setIsConfirmOpen(false)}
                  variant="secondary"
                >
                  إلغاء
                </AppButton>
              </div>
            </div>
          </AppSheet>
        </>
      ) : null}
    </div>
  )
}
