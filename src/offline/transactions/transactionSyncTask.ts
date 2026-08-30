import {
  canChooseOperationalCourt,
} from '../../core/auth/auth.types'
import {
  listTransactions as defaultListTransactions,
} from '../../features/transactions/transactionsApi'
import type {
  Transaction,
  TransactionQueryParams,
} from '../../features/transactions/transactions.types'
import type { PaginatedResponse } from '../../shared/api/api.types'
import type { OfflineScope } from '../offline.types'
import { offlineRepositories } from '../repositories/offlineRepositories'
import type {
  DatasetSyncTask,
  OperationalSyncContext,
} from '../sync/sync.types'
import { getTransactionSyncWindow } from './transactionSyncWindow'

interface TransactionSyncRepositories {
  replaceTransactionsSnapshot: (
    scope: OfflineScope,
    transactions: Transaction[],
    syncedAt: string,
  ) => Promise<void>
}

interface CreateTransactionSyncTaskOptions {
  repositories?: TransactionSyncRepositories
  listTransactions?: (
    clubSlug: string,
    params?: TransactionQueryParams,
    options?: { signal?: AbortSignal },
  ) => Promise<PaginatedResponse<Transaction>>
  getNow?: () => Date
  logger?: (message: string) => void
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Transaction sync was cancelled.', 'AbortError')
  }
}

function buildCanonicalTransactionSyncParams(
  context: OperationalSyncContext,
  getNow: () => Date,
): TransactionQueryParams | null {
  if (
    !canChooseOperationalCourt(context.role, context.membership) &&
    context.assignedCourtId === null
  ) {
    return null
  }

  const window = getTransactionSyncWindow(getNow())

  return {
    date_from: window.dateFrom,
    date_to: window.dateTo,
    ...(!canChooseOperationalCourt(context.role, context.membership)
      ? { court: context.assignedCourtId ?? undefined }
      : {}),
  }
}

/**
 * Creates the canonical read-only Transaction snapshot sync task.
 *
 * The task fetches the full unfiltered previous-seven-calendar-day period and
 * commits only after every paginated page succeeds. UI filters/search must not
 * be passed into this background cache owner.
 */
export function createTransactionSyncTask(
  options: CreateTransactionSyncTaskOptions = {},
): DatasetSyncTask {
  const repositories = options.repositories ?? offlineRepositories
  const listTransactions = options.listTransactions ?? defaultListTransactions
  const getNow = options.getNow ?? (() => new Date())
  const logger = options.logger

  return {
    dataset: 'transactions',
    async run({ operationalContext, signal, startedAt }) {
      const baseParams = buildCanonicalTransactionSyncParams(
        operationalContext,
        getNow,
      )

      if (!baseParams) {
        return {
          dataset: 'transactions',
          status: 'skipped',
          reason: 'no_authorized_transaction_scope',
        }
      }

      const transactions: Transaction[] = []
      let page = 1
      let hasNextPage = true

      while (hasNextPage) {
        throwIfAborted(signal)
        const params: TransactionQueryParams = {
          ...baseParams,
          ...(page > 1 ? { page: String(page) } : {}),
        }

        logger?.(
          `[transaction-sync] scope=${operationalContext.scopeKey} page=${page}`,
        )
        const response = await listTransactions(
          operationalContext.clubSlug,
          params,
          { signal },
        )

        transactions.push(...response.results)
        hasNextPage = Boolean(response.next)
        page += 1
      }

      throwIfAborted(signal)
      await repositories.replaceTransactionsSnapshot(
        operationalContext,
        transactions,
        startedAt,
      )

      logger?.(
        `[transaction-sync] success scope=${operationalContext.scopeKey} count=${transactions.length}`,
      )

      return {
        dataset: 'transactions',
        status: 'success',
        committedAt: startedAt,
      }
    },
  }
}
