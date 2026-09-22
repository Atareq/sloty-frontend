import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { canViewOwnSettlements } from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageActions } from '../../../shared/components/PageActions/PageActions'
import { formatArabicDateTime, formatArabicPeriodRange } from '../../../shared/utils/date'
import { financeCopy } from '../../../shared/copy/appCopy'
import { SettlementTotalsCard } from '../components/SettlementTotalsCard/SettlementTotalsCard'
import { SettlementTransactionsList } from '../components/SettlementTransactionsList/SettlementTransactionsList'
import { getSettlement } from '../settlementsApi'
import {
  formatSettlementActor,
  getSettlementCollectorName,
} from '../settlementDisplay.helpers'
import type { Settlement } from '../settlements.types'

function getTransactions(settlement: Settlement) {
  return settlement.lines ?? settlement.transactions ?? []
}

/**
 * Read-only settlement detail page for backend-generated settlement periods.
 * Settlements are immutable once created via POST. There is no mark-settled action
 * on the frontend — backend owns settlement state transitions.
 */
export function SettlementDetailPage() {
  const { settlementId } = useParams()
  const { role, selectedClubSlug } = useAuth()
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const canViewOwn = canViewOwnSettlements(role)

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
      } catch (err) {
        if (isActive) {
          setSettlement(null)
          setError(getApiErrorMessage(err, 'تعذر تحميل تفاصيل التسوية'))
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

  const transactions = settlement ? getTransactions(settlement) : []

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
            <div>
              <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                {financeCopy.collector}
              </p>
              <h2 className="mt-1 text-2xl font-black text-[var(--sloty-text-primary)]">
                {getSettlementCollectorName(settlement)}
              </h2>
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  {financeCopy.receivedBy}
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {settlement.settled_by_name ??
                    formatSettlementActor(settlement.settled_by)}
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
                  تاريخ التسوية
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {formatArabicDateTime(
                    settlement.created ?? settlement.created_at,
                  ) ?? 'غير محدد'}
                </dd>
              </div>
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
            emptyMessage="لا توجد عمليات داخل هذا الاستلام."
            transactions={transactions}
          />

        </>
      ) : null}
    </div>
  )
}
