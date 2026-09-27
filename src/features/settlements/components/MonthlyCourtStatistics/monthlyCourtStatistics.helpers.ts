import { formatMoneyAmount } from '../../../../shared/utils/money'
import type { CourtMonthlyStatistics } from '../../../courts/courts.types'

export type MonthlyStatisticsQueryKey = [
  'monthly-statistics',
  string,
  number | string,
  string,
]

export function getMonthlyStatisticsQueryKey(
  clubSlug: string,
  courtId: number | string,
  month: string,
): MonthlyStatisticsQueryKey {
  return ['monthly-statistics', clubSlug, courtId, month]
}

const statisticsCache = new Map<string, CourtMonthlyStatistics>()

export function getCachedMonthlyStatistics(
  cacheKey: string,
): CourtMonthlyStatistics | undefined {
  return statisticsCache.get(cacheKey)
}

export function setCachedMonthlyStatistics(
  cacheKey: string,
  data: CourtMonthlyStatistics,
): void {
  statisticsCache.set(cacheKey, data)
}

export function clearMonthlyStatisticsCache(): void {
  statisticsCache.clear()
}

export function formatStatisticsIncome(totalIncome: string | number): string {
  const numeric = typeof totalIncome === 'number' ? totalIncome : Number(totalIncome)

  if (Number.isFinite(numeric)) {
    return formatMoneyAmount(numeric)
  }

  return formatMoneyAmount(totalIncome)
}
