import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import type { PaginatedResponse } from '../../../shared/api/api.types'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { formatArabicDateWithWeekday } from '../../../shared/utils/date'
import { formatMoneyAmount } from '../../../shared/utils/money'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import { listRecurringAgreements } from '../recurringAgreementsApi'
import {
  formatRecurringTimeRange,
  getRecurringAgreementStatusLabel,
  getRecurringCourtLabel,
  getRecurringWeekdayLabel,
  isAutoTerminatedRecurringAgreement,
} from '../recurringAgreementsDisplay.helpers'
import {
  type RecurringAgreement,
} from '../recurringAgreements.types'
import { RecurringDepositStatusBadge } from '../components/RecurringDepositStatusBadge/RecurringDepositStatusBadge'

function normalizeAgreements(
  response: PaginatedResponse<RecurringAgreement> | RecurringAgreement[],
): RecurringAgreement[] {
  return Array.isArray(response) ? response : response.results
}

function getCourtLabels(courts: Court[]): Record<string, string> {
  return courts.reduce(
    (labels, court) => ({
      ...labels,
      [court.id]: court.name,
    }),
    {} as Record<string, string>,
  )
}

/**
 * Responsive recurring weekly agreements list.
 */
export function RecurringAgreementsListPage() {
  const { selectedClubSlug, selectedMembership } = useAuth()
  const [agreements, setAgreements] = useState<RecurringAgreement[]>([])
  const [courtLabels, setCourtLabels] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    async function loadAgreements(): Promise<void> {
      if (!selectedClubSlug) {
        setError('اختر ناديًا أولًا لعرض الحجوزات الأسبوعية')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const [agreementResponse, courtResponse] = await Promise.all([
          listRecurringAgreements(selectedClubSlug),
          listCourts(selectedClubSlug),
        ])

        if (isActive) {
          setAgreements(normalizeAgreements(agreementResponse))
          setCourtLabels(getCourtLabels(courtResponse.results))
        }
      } catch (error) {
        if (isActive) {
          setError(
            getApiErrorMessage(error, 'تعذر تحميل الحجوزات الأسبوعية'),
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadAgreements()

    return () => {
      isActive = false
    }
  }, [selectedClubSlug, selectedMembership])

  return (
    <div className="space-y-4">
      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل الحجوزات الأسبوعية...
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

      {!isLoading && !error && agreements.length === 0 ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            لا توجد حجوزات أسبوعية بعد
          </p>
        </AppCard>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {agreements.map((agreement) => (
          <Link
            className="block rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] p-4 shadow-[var(--sloty-shadow)] transition hover:border-[var(--sloty-primary)]"
            key={agreement.id}
            to={`/recurring-agreements/${agreement.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  {agreement.customer_name}
                </h2>
                <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
                  {getRecurringCourtLabel(
                    agreement.court,
                    agreement.court_name,
                    courtLabels,
                  )}
                </p>
              </div>
              <span className="rounded-full bg-[var(--sloty-bg)] px-3 py-1 text-xs font-black text-[var(--sloty-primary-dark)]">
                {getRecurringAgreementStatusLabel(agreement)}
              </span>
            </div>

            {isAutoTerminatedRecurringAgreement(agreement) ? (
              <p className="mt-3 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-xs font-bold text-[var(--sloty-danger)]">
                تم إنهاء الاتفاق تلقائيًا لعدم اكتمال الحجز السابق.
              </p>
            ) : null}

            {agreement.status === 'ACTION_REQUIRED' ? (
              <p className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">
                يحتاج هذا الاتفاق مراجعة من المسؤول.
              </p>
            ) : null}

            <div className="mt-4 grid gap-2 text-sm font-bold text-[var(--sloty-text-primary)] sm:grid-cols-2">
              <p>{getRecurringWeekdayLabel(agreement.weekday)}</p>
              <p dir="ltr">
                {formatRecurringTimeRange(
                  agreement.start_time,
                  agreement.end_time,
                )}
              </p>
              <p>{formatArabicDateWithWeekday(agreement.start_date)}</p>
              <p>{formatMoneyAmount(agreement.deposit_amount)}</p>
            </div>

            <div className="mt-3">
              <RecurringDepositStatusBadge status={agreement.deposit_status} />
              {agreement.deposit_status === 'FORFEITED' ? (
                <p className="mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                  تم احتجاز التأمين حسب حالة الاتفاق التي أرجعها الخادم.
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
