import { useEffect, useState } from 'react'
import {
  getApiErrorMessage,
  getApiFieldErrors,
} from '../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { CancelTransactionSheet } from '../components/CancelTransactionSheet/CancelTransactionSheet'
import type { CancelTransactionValues } from '../components/CancelTransactionSheet/CancelTransactionSheet'
import { cancelTransaction, listTransactions } from '../transactionsApi'
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

function getActorId(
  value: Transaction['created_by'] | Transaction['cancelled_by'],
): number | null {
  if (!value) {
    return null
  }

  return typeof value === 'number' ? value : value.id
}

function getActorName(
  value: Transaction['created_by'] | Transaction['cancelled_by'],
): string | null {
  if (!value || typeof value === 'number') {
    return null
  }

  return value.name ?? `#${value.id}`
}

/**
 * Basic transaction history for the currently selected club context.
 */
export function TransactionsListPage() {
  const { currentUser, selectedClubSlug, selectedMembership } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState<Transaction | null>(null)
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelFieldErrors, setCancelFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const selectedClubName = selectedMembership?.club.name ?? null

  async function reloadTransactions(): Promise<void> {
    if (!selectedClubSlug) {
      setTransactions([])
      return
    }

    const transactionsResponse = await listTransactions(selectedClubSlug)
    setTransactions(transactionsResponse.results)
  }

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
      } catch (error) {
        if (isActive) {
          setTransactions([])
          setError(
            getApiErrorMessage(
              error,
              'تعذر تحميل المعاملات. حاول مرة أخرى',
            ),
          )
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

  async function handleCancelTransaction(
    values: CancelTransactionValues,
  ): Promise<void> {
    if (!selectedClubSlug || !cancelTarget) {
      return
    }

    setIsCancelSubmitting(true)
    setCancelError(null)
    setCancelFieldErrors(null)

    try {
      await cancelTransaction(selectedClubSlug, cancelTarget.id, values)
      setCancelTarget(null)
      await reloadTransactions()
    } catch (error) {
      setCancelError(
        getApiErrorMessage(error, 'تعذر إلغاء الدفع. حاول مرة أخرى'),
      )
      setCancelFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsCancelSubmitting(false)
    }
  }

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
            const cancelledAtLabel = formatTransactionDate(
              transaction.cancelled_at ?? undefined,
            )
            const cancelledByName = getActorName(transaction.cancelled_by)
            const createdById = getActorId(transaction.created_by)
            const canCancel =
              transaction.is_cancelled !== true &&
              transaction.is_settled !== true &&
              (!currentUser?.id || !createdById || currentUser.id === createdById)

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
                  <div className="flex flex-wrap justify-end gap-2">
                    <span className="rounded-full bg-[var(--sloty-soft-mint)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]">
                      {paymentMethodLabels[transaction.payment_method]}
                    </span>
                    {transaction.is_cancelled ? (
                      <span className="rounded-full bg-[var(--sloty-danger-soft)] px-3 py-1 text-xs font-black text-[var(--sloty-danger)]">
                        ملغي
                      </span>
                    ) : null}
                  </div>
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
                  {transaction.cancellation_reason ? (
                    <div className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-danger)]">
                        سبب الإلغاء
                      </dt>
                      <dd className="mt-1 font-black text-[var(--sloty-danger)]">
                        {transaction.cancellation_reason}
                      </dd>
                    </div>
                  ) : null}
                  {cancelledAtLabel ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        تاريخ الإلغاء
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {cancelledAtLabel}
                      </dd>
                    </div>
                  ) : null}
                  {cancelledByName ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sloty-bg)] px-3 py-2">
                      <dt className="font-bold text-[var(--sloty-text-muted)]">
                        ألغي بواسطة
                      </dt>
                      <dd className="font-black text-[var(--sloty-text-primary)]">
                        {cancelledByName}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {canCancel ? (
                  <AppButton
                    fullWidth
                    onClick={() => {
                      setCancelTarget(transaction)
                      setCancelError(null)
                      setCancelFieldErrors(null)
                    }}
                    variant="danger"
                  >
                    إلغاء الدفع
                  </AppButton>
                ) : null}
              </AppCard>
            )
          })}
        </section>
      ) : null}

      {cancelTarget ? (
        <CancelTransactionSheet
          error={cancelError}
          fieldErrors={cancelFieldErrors}
          isSubmitting={isCancelSubmitting}
          onClose={() => {
            setCancelTarget(null)
            setCancelError(null)
            setCancelFieldErrors(null)
          }}
          onSubmit={handleCancelTransaction}
        />
      ) : null}
    </div>
  )
}
