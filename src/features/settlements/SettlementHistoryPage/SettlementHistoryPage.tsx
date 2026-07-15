import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../../core/auth/useAuth'
import { canManageSettlements } from '../../../core/auth/auth.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { listSettlements } from '../settlementsApi'
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

function getSettlementAmount(settlement: Settlement): string | null {
  return settlement.total_amount ?? settlement.totals?.total ?? null
}

/**
 * Read-only settlement history for the selected club context.
 */
export function SettlementHistoryPage() {
  const { selectedClubSlug, selectedMembership } = useAuth()
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const canSettle = canManageSettlements(selectedMembership)

  useEffect(() => {
    let isActive = true

    async function loadSettlements(): Promise<void> {
      if (!selectedClubSlug) {
        setSettlements([])
        setError(null)
        setMessage('اختر ناديًا أولًا لعرض التسويات')
        setIsLoading(false)
        return
      }

      if (!canSettle) {
        setSettlements([])
        setError('ليس لديك صلاحية إدارة التسويات')
        setMessage(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      setMessage(null)

      try {
        const response = await listSettlements(selectedClubSlug)

        if (isActive) {
          setSettlements(response.results)
        }
      } catch {
        if (isActive) {
          setSettlements([])
          setError('تعذر تحميل سجل التسويات')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadSettlements()

    return () => {
      isActive = false
    }
  }, [canSettle, selectedClubSlug])

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <Link to="/settlements">
            <AppButton variant="secondary">تسوية جديدة</AppButton>
          </Link>
        }
        description="التسويات السابقة والمعاملات التي تم قفلها"
        tone="brand"
        title="سجل التسويات"
      />

      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل سجل التسويات...
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

      {!isLoading && !error && !message && settlements.length === 0 ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            لا توجد تسويات مسجلة حتى الآن
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && settlements.length > 0 ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {settlements.map((settlement) => {
            const amount = getSettlementAmount(settlement)
            const settledDate =
              formatDate(settlement.settled_at) ??
              formatDate(settlement.created)

            return (
              <AppCard className="space-y-3" key={settlement.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      التسوية
                    </p>
                    <p className="mt-1 text-xl font-black text-[var(--sloty-text-primary)]">
                      #{settlement.id}
                    </p>
                  </div>
                  {amount ? (
                    <p
                      className="rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-sm font-black text-[var(--sloty-primary-dark)]"
                      dir="ltr"
                    >
                      {amount}
                    </p>
                  ) : null}
                </div>

                <dl className="grid grid-cols-1 gap-2 text-sm">
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
                  {settledDate ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        التاريخ
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {settledDate}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <Link to={`/settlements/${settlement.id}`}>
                  <AppButton fullWidth variant="secondary">
                    عرض التفاصيل
                  </AppButton>
                </Link>
              </AppCard>
            )
          })}
        </section>
      ) : null}
    </div>
  )
}
