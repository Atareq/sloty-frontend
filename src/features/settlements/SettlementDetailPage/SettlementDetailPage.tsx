import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  getApiErrorCode,
  getApiErrorMessage,
  isApiClientError,
} from '../../../core/api/apiError.helpers'
import { canManageSettlements } from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { SettlementTotalsCard } from '../components/SettlementTotalsCard/SettlementTotalsCard'
import { SettlementTransactionsList } from '../components/SettlementTransactionsList/SettlementTransactionsList'
import {
  getSettlement,
  markSettlementSettled,
} from '../settlementsApi'
import type {
  Settlement,
  SettlementActor,
} from '../settlements.types'

const statusLabels: Record<string, string> = {
  PENDING: 'قيد المراجعة',
  SETTLED: 'مسواة',
  CANCELLED: 'ملغاة',
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'غير محدد'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatActor(actor: number | SettlementActor | null | undefined): string {
  if (!actor) {
    return 'غير محدد'
  }

  if (typeof actor === 'number') {
    return `#${actor}`
  }

  return actor.name ?? `#${actor.id}`
}

function getTransactions(settlement: Settlement) {
  return settlement.lines ?? settlement.transactions ?? []
}

/**
 * Read-only settlement detail page for backend-generated settlement periods.
 */
export function SettlementDetailPage() {
  const { settlementId } = useParams()
  const { refreshCurrentUser, role, selectedClubSlug, selectedMembership } =
    useAuth()
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingSettled, setIsMarkingSettled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const canSettle = canManageSettlements(selectedMembership, role)

  useEffect(() => {
    let isActive = true

    async function loadSettlement(): Promise<void> {
      if (!selectedClubSlug) {
        setSettlement(null)
        setMessage('اختر ناديًا أولًا لعرض التسويات')
        setError(null)
        setIsLoading(false)
        return
      }

      if (!canSettle) {
        setSettlement(null)
        setMessage(null)
        setError('ليس لديك صلاحية إدارة التسويات')
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
  }, [canSettle, selectedClubSlug, settlementId])

  async function handleMarkSettled(): Promise<void> {
    if (!selectedClubSlug || !settlementId) {
      return
    }

    setIsMarkingSettled(true)
    setError(null)
    setMessage(null)

    try {
      const response = await markSettlementSettled(selectedClubSlug, settlementId)

      setSettlement(response)
      setMessage('تم تحديث حالة التسوية')
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
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/settlements">
              <AppButton variant="secondary">التسويات المالية والجرد</AppButton>
            </Link>
          </div>
        }
        description="الفترة المعروضة يتم تحديدها تلقائيًا من أول معاملة داخلة في التسوية حتى وقت تأكيد التسوية."
        tone="brand"
        title="تفاصيل التسوية"
      />

      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل تفاصيل التسوية...
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
                  رقم التسوية
                </p>
                <h2 className="mt-1 text-2xl font-black text-[var(--sloty-text-primary)]">
                  #{settlement.id}
                </h2>
              </div>
              {settlement.status === 'PENDING' ? (
                <AppButton
                  disabled={isMarkingSettled}
                  onClick={handleMarkSettled}
                >
                  {isMarkingSettled ? 'جاري التحديث...' : 'تأكيد الاستلام'}
                </AppButton>
              ) : null}
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  المستخدم
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {settlement.collected_by_name ??
                    (settlement.collected_by
                      ? `#${settlement.collected_by}`
                      : 'غير محدد')}
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
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  بداية الفترة
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {formatDate(settlement.period_start)}
                </dd>
              </div>
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  نهاية الفترة
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {formatDate(settlement.period_end)}
                </dd>
              </div>
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  أنشئت بواسطة
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {formatActor(settlement.created_by)}
                </dd>
              </div>
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  تاريخ الإنشاء
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {formatDate(settlement.created)}
                </dd>
              </div>
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  تم التسوية بواسطة
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {formatActor(settlement.settled_by)}
                </dd>
              </div>
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  تاريخ التسوية
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {formatDate(settlement.settled_at)}
                </dd>
              </div>
              <div className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 md:col-span-2">
                <dt className="font-bold text-[var(--sloty-text-muted)]">
                  ملاحظات
                </dt>
                <dd className="mt-1 font-black text-[var(--sloty-text-primary)]">
                  {settlement.notes || 'لا توجد ملاحظات'}
                </dd>
              </div>
            </dl>
          </AppCard>

          <SettlementTransactionsList
            emptyMessage="لا توجد معاملات داخل هذه التسوية."
            transactions={transactions}
          />
        </>
      ) : null}
    </div>
  )
}
