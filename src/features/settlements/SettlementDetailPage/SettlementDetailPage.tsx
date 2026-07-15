import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../../core/auth/useAuth'
import { canManageSettlements } from '../../../core/auth/auth.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { SettlementTotalsCard } from '../components/SettlementTotalsCard/SettlementTotalsCard'
import { SettlementTransactionsList } from '../components/SettlementTransactionsList/SettlementTransactionsList'
import { getSettlement } from '../settlementsApi'
import type { Settlement } from '../settlements.types'

function formatDate(value: string | undefined): string | null {
  if (!value) {
    return null
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

/**
 * Read-only settlement detail with locked transaction list.
 */
export function SettlementDetailPage() {
  const { selectedClubSlug, selectedMembership } = useAuth()
  const { settlementId } = useParams()
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const canSettle = canManageSettlements(selectedMembership)

  useEffect(() => {
    let isActive = true

    async function loadSettlement(): Promise<void> {
      if (!selectedClubSlug) {
        setSettlement(null)
        setError(null)
        setMessage('اختر ناديًا أولًا لعرض التسويات')
        setIsLoading(false)
        return
      }

      if (!canSettle) {
        setSettlement(null)
        setError('ليس لديك صلاحية إدارة التسويات')
        setMessage(null)
        setIsLoading(false)
        return
      }

      if (!settlementId) {
        setSettlement(null)
        setError('رابط التسوية غير صحيح')
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
      } catch {
        if (isActive) {
          setSettlement(null)
          setError('تعذر تحميل تفاصيل التسوية')
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

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <Link to="/settlements/history">
            <AppButton variant="secondary">سجل التسويات</AppButton>
          </Link>
        }
        description="تفاصيل المبالغ والمعاملات المقفلة"
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
                : 'text-[var(--sloty-text-muted)]',
            ].join(' ')}
          >
            {error ?? message}
          </p>
        </AppCard>
      ) : null}

      {settlement && !isLoading ? (
        <>
          <AppCard className="space-y-4">
            <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              هذه التسوية مقفلة ولا يمكن تعديل معاملاتها
            </p>
            <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              {settlement.staff ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    الموظف
                  </dt>
                  <dd className="font-black text-[var(--sloty-text-primary)]">
                    {settlement.staff.name}
                  </dd>
                </div>
              ) : null}
              {settlement.date_from || settlement.date_to ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    الفترة
                  </dt>
                  <dd className="font-black text-[var(--sloty-text-primary)]">
                    {settlement.date_from ?? '...'} -{' '}
                    {settlement.date_to ?? '...'}
                  </dd>
                </div>
              ) : null}
              {settlement.settled_by ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    تم بواسطة
                  </dt>
                  <dd className="font-black text-[var(--sloty-text-primary)]">
                    {settlement.settled_by.name}
                  </dd>
                </div>
              ) : null}
              {settlement.settled_at || settlement.created ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                  <dt className="font-bold text-[var(--sloty-text-muted)]">
                    تاريخ التسوية
                  </dt>
                  <dd className="font-black text-[var(--sloty-text-primary)]">
                    {formatDate(settlement.settled_at) ??
                      formatDate(settlement.created)}
                  </dd>
                </div>
              ) : null}
              {settlement.notes ? (
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

          {settlement.totals ? (
            <SettlementTotalsCard totals={settlement.totals} />
          ) : null}

          <SettlementTransactionsList transactions={settlement.transactions ?? []} />
        </>
      ) : null}
    </div>
  )
}
