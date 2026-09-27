import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '../../../../core/api/apiError.helpers'
import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import {
  formatArabicMonthYear,
  getCurrentMonthValue,
  getNextMonthValue,
  getPreviousMonthValue,
} from '../../../../shared/utils/date'
import { getCourtMonthlyStatistics } from '../../../courts/courtsApi'
import type { CourtMonthlyStatistics } from '../../../courts/courts.types'
import {
  formatStatisticsIncome,
  getCachedMonthlyStatistics,
  getMonthlyStatisticsQueryKey,
  setCachedMonthlyStatistics,
} from './monthlyCourtStatistics.helpers'

export interface MonthlyCourtStatisticsProps {
  clubSlug?: string | null
  courtId?: number | null
  initialMonth?: string
}

/**
 * Minimal monthly court statistics section displayed at the end of Money Management.
 *
 * Scoped to the currently selected court and selected month.
 * Strictly consumes the backend-authoritative endpoint without client-side calculation.
 */
export function MonthlyCourtStatistics({
  clubSlug,
  courtId,
  initialMonth,
}: MonthlyCourtStatisticsProps) {
  const [selectedMonth, setSelectedMonth] = useState(
    () => initialMonth ?? getCurrentMonthValue(),
  )
  const [statistics, setStatistics] = useState<CourtMonthlyStatistics | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    const abortController = new AbortController()

    async function loadStatistics(): Promise<void> {
      if (!clubSlug || !courtId) {
        setStatistics(null)
        setIsLoading(false)
        setError(null)
        return
      }

      const queryKey = getMonthlyStatisticsQueryKey(
        clubSlug,
        courtId,
        selectedMonth,
      )
      const cacheKey = queryKey.join(':')

      const cachedData = getCachedMonthlyStatistics(cacheKey)
      if (cachedData) {
        setStatistics(cachedData)
        setIsLoading(false)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)
      setStatistics(null)

      try {
        const data = await getCourtMonthlyStatistics(
          clubSlug,
          courtId,
          selectedMonth,
          { signal: abortController.signal },
        )
        if (!isActive) return
        setCachedMonthlyStatistics(cacheKey, data)
        setStatistics(data)
      } catch (err: unknown) {
        if (!isActive || abortController.signal.aborted) return
        setError(getApiErrorMessage(err, 'تعذر تحميل الإحصائيات حاليًا.'))
        setStatistics(null)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadStatistics()

    return () => {
      isActive = false
      abortController.abort()
    }
  }, [clubSlug, courtId, selectedMonth])

  if (!clubSlug || !courtId) {
    return null
  }

  function handlePreviousMonth(): void {
    setSelectedMonth((prev) => getPreviousMonthValue(prev))
  }

  function handleNextMonth(): void {
    setSelectedMonth((prev) => getNextMonthValue(prev))
  }

  return (
    <section aria-labelledby="monthly-court-statistics-heading" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2
          className="text-lg font-bold text-[var(--sloty-text-primary)]"
          id="monthly-court-statistics-heading"
        >
          الإحصائيات الشهرية
        </h2>

        {/* Minimal Month Stepper */}
        <div
          aria-label="اختيار الشهر"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] px-2 py-1.5 shadow-[var(--sloty-shadow)]"
          dir="ltr"
          role="group"
        >
          <button
            aria-label="الشهر السابق"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--sloty-primary)] transition-colors hover:bg-[var(--sloty-soft-mint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sloty-primary)]/20"
            onClick={handlePreviousMonth}
            title="الشهر السابق"
            type="button"
          >
            <span aria-hidden="true" className="select-none text-lg font-bold">
              ‹
            </span>
          </button>

          <span
            aria-live="polite"
            className="min-w-[120px] text-center text-sm font-bold text-[var(--sloty-text-primary)]"
          >
            {formatArabicMonthYear(selectedMonth)}
          </span>

          <button
            aria-label="الشهر التالي"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--sloty-primary)] transition-colors hover:bg-[var(--sloty-soft-mint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sloty-primary)]/20"
            onClick={handleNextMonth}
            title="الشهر التالي"
            type="button"
          >
            <span aria-hidden="true" className="select-none text-lg font-bold">
              ›
            </span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <AppCard>
          <p className="text-sm font-medium text-[var(--sloty-text-muted)]">
            جاري تحميل الإحصائيات...
          </p>
        </AppCard>
      ) : null}

      {error ? (
        <AppCard>
          <p className="text-sm font-semibold text-[var(--sloty-danger)]">
            {error}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && statistics ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppCard className="space-y-1">
            <p className="text-sm font-semibold text-[var(--sloty-text-muted)]">
              إجمالي الدخل
            </p>
            <p className="text-2xl font-bold text-[var(--sloty-text-primary)]">
              {formatStatisticsIncome(statistics.total_income)}
            </p>
          </AppCard>

          <AppCard className="space-y-1">
            <p className="text-sm font-semibold text-[var(--sloty-text-muted)]">
              إجمالي الحجوزات
            </p>
            <p className="text-2xl font-bold text-[var(--sloty-text-primary)]">
              {statistics.total_bookings}
            </p>
          </AppCard>
        </div>
      ) : null}
    </section>
  )
}
