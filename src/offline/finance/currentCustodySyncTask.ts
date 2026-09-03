import {
  canManageSettlements,
  canViewOwnSettlements,
} from '../../core/auth/auth.types'
import {
  getCurrentCustodySummary,
  getSettlementPreview,
} from '../../features/settlements/settlementsApi'
import type {
  CurrentCustodySummaryResponse,
  SettlementPreview,
} from '../../features/settlements/settlements.types'
import {
  createOfflineRepositories,
  offlineRepositories,
} from '../repositories/offlineRepositories'
import type { DatasetSyncTask } from '../sync/sync.types'

type OfflineRepositories = ReturnType<typeof createOfflineRepositories>

interface CurrentCustodySyncTaskOptions {
  repositories?: OfflineRepositories
  getCurrentCustodySummary?: typeof getCurrentCustodySummary
  getSettlementPreview?: typeof getSettlementPreview
  logger?: (message: string) => void
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Current custody sync cancelled.', 'AbortError')
  }
}

/**
 * Synchronizes the last Backend-authoritative current-custody read model.
 *
 * This task deliberately stores the settlement preview/summary response as-is;
 * it never reads cached Transactions or rebuilds custody from PAYMENT/REFUND
 * rows, because the seven-day ledger cache can miss older unsettled money.
 */
export function createCurrentCustodySyncTask(
  options: CurrentCustodySyncTaskOptions = {},
): DatasetSyncTask {
  const repositories = options.repositories ?? offlineRepositories
  const fetchGroupedSummary =
    options.getCurrentCustodySummary ?? getCurrentCustodySummary
  const fetchOwnPreview = options.getSettlementPreview ?? getSettlementPreview

  return {
    dataset: 'current_custody',
    async run({ operationalContext, signal, startedAt }) {
      throwIfAborted(signal)

      const canManageCurrentCustody = canManageSettlements(
        operationalContext.membership,
        operationalContext.role,
      )
      const canViewOwnCurrentCustody = canViewOwnSettlements(
        operationalContext.membership,
        operationalContext.role,
      )

      if (!canManageCurrentCustody && !canViewOwnCurrentCustody) {
        return {
          dataset: 'current_custody',
          status: 'skipped',
          reason: 'no_current_custody_access',
        }
      }

      if (canManageCurrentCustody) {
        const response: CurrentCustodySummaryResponse =
          await fetchGroupedSummary(operationalContext.clubSlug, {}, { signal })
        throwIfAborted(signal)
        await repositories.replaceCurrentCustodySnapshot(
          operationalContext,
          {
            kind: 'grouped_summary',
            courtId: null,
            payload: response,
          },
          startedAt,
        )
        options.logger?.(
          `[sync] current custody grouped snapshot scope=${operationalContext.scopeKey}`,
        )

        return {
          dataset: 'current_custody',
          status: 'success',
          committedAt: startedAt,
        }
      }

      const response: SettlementPreview = await fetchOwnPreview(
        operationalContext.clubSlug,
        {
          ...(operationalContext.assignedCourtId
            ? { court: operationalContext.assignedCourtId }
            : {}),
        },
        { signal },
      )
      throwIfAborted(signal)
      await repositories.replaceCurrentCustodySnapshot(
        operationalContext,
        {
          kind: 'preview',
          courtId: operationalContext.assignedCourtId,
          payload: response,
        },
        startedAt,
      )
      options.logger?.(
        `[sync] current custody own snapshot scope=${operationalContext.scopeKey}`,
      )

      return {
        dataset: 'current_custody',
        status: 'success',
        committedAt: startedAt,
      }
    },
  }
}
