import { useEffect, useState } from 'react'
import { useAuth } from '../../../core/auth/useAuth'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { listTransactions } from '../transactionsApi'
import type { Transaction } from '../transactions.types'
import { paymentMethodLabels } from '../transactions.types'

function formatTransactionDate(value: string | undefined): string | null {
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
 * Basic transaction history for the currently selected club context.
 */
export function TransactionsListPage() {
  const { selectedClubSlug, selectedMembership } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const selectedClubName = selectedMembership?.club.name ?? null

  useEffect(() => {
    let isActive = true

    async function loadTransactions(): Promise<void> {
      if (!selectedClubSlug) {
        setTransactions([])
        setError(null)
        setMessage('اختر ناديًا أولًا لعرض المعاملات')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      setMessage(null)

      try {
        const transactionsResponse = await listTransactions(selectedClubSlug)

        if (isActive) {
          setTransactions(transactionsResponse.results)
        }
      } catch {
        if (isActive) {
          setTransactions([])
          setError('تعذر تحميل المعاملات. حاول مرة أخرى')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadTransactions()

    return () => {
      isActive = false
    }
  }, [selectedClubSlug])

  return (
    <div className="space-y-5">
      <PageHeader
        description={
          selectedClubName
            ? `سجل المدفوعات المسجلة داخل ${selectedClubName}`
            : 'سجل بسيط للمدفوعات المسجلة على حجوزات النادي النشط'
        }
        tone="brand"
        title="المعاملات"
      />

      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل المعاملات...
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

      {!isLoading && !error && !message && transactions.length === 0 ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            لا توجد معاملات مسجلة حتى الآن
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && transactions.length > 0 ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {transactions.map((transaction) => {
            const createdLabel = formatTransactionDate(transaction.created)

            return (
              <AppCard className="space-y-3" key={transaction.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                      المبلغ
                    </p>
                    <p
                      className="mt-1 text-xl font-black text-[var(--sloty-primary-dark)]"
                      dir="ltr"
                    >
                      {transaction.amount}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]">
                    {paymentMethodLabels[transaction.payment_method]}
                  </span>
                </div>

                <dl className="grid grid-cols-1 gap-2 text-sm">
                  {transaction.booking ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        الحجز
                      </dt>
                      <dd
                        className="font-black text-[var(--sloty-text-primary)]"
                        dir="ltr"
                      >
                        #{transaction.booking}
                      </dd>
                    </div>
                  ) : null}
                  {transaction.reference ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        المرجع
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {transaction.reference}
                      </dd>
                    </div>
                  ) : null}
                  {createdLabel ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        التاريخ
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {createdLabel}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </AppCard>
            )
          })}
        </section>
      ) : null}
    </div>
  )
}
