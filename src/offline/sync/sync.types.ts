import type {
  AuthRole,
  CurrentUserMembership,
} from '../../core/auth/auth.types'
import type {
  BookingRequestQueueResult,
} from '../bookings/bookingRequestSync'
import type { OfflineScope } from '../offline.types'
import type { OfflineFreshnessState } from '../freshness/offlineFreshness'

export type SyncDataset =
  | 'schedule'
  | 'bookings'
  | 'transactions'
  | 'current_custody'

export type SyncTrigger = 'startup' | 'online' | 'resume' | 'manual' | 'retry'

export type SyncResultStatus =
  | 'success'
  | 'failed'
  | 'skipped'
  | 'cancelled'

export type SyncCoordinatorStatus =
  | 'idle'
  | 'syncing'
  | 'partial_failure'
  | 'failed'

export type BackendReachability =
  | 'unknown'
  | 'reachable'
  | 'unreachable'

export interface OperationalSyncContext extends OfflineScope {
  scopeKey: string
  role: AuthRole
  membership: CurrentUserMembership
  membershipId: number
  assignedCourtId: number | null
  assignedCourtName: string | null
}

export interface DatasetSyncRunContext {
  operationalContext: OperationalSyncContext
  trigger: SyncTrigger
  signal: AbortSignal
  startedAt: string
}

export interface DatasetSyncTaskResult {
  dataset: SyncDataset
  status: SyncResultStatus
  committedAt?: string
  reason?: string
  error?: unknown
  metadata?: {
    successfulCourtIds?: number[]
    failedCourtIds?: number[]
  }
}

export interface DatasetSyncTask {
  dataset: SyncDataset
  run: (context: DatasetSyncRunContext) => Promise<DatasetSyncTaskResult>
}

export interface OperationalSyncRequest {
  context: OperationalSyncContext | null
  trigger: SyncTrigger
  force?: boolean
}

export interface OperationalSyncRunResult {
  scopeKey: string | null
  trigger: SyncTrigger
  status: SyncResultStatus | 'partial_failure'
  datasets: Record<SyncDataset, DatasetSyncTaskResult>
  bookingRequests?: BookingRequestQueueResult
  startedAt: string
  completedAt: string
}

export interface OfflineSyncSnapshot {
  status: SyncCoordinatorStatus
  activeScopeKey: string | null
  activeDataset: SyncDataset | null
  lastRunStartedAt: string | null
  lastRunCompletedAt: string | null
  lastRunResult: OperationalSyncRunResult | null
  backendReachability: BackendReachability
}

export interface OfflineSyncFreshnessSnapshot extends OfflineFreshnessState {
  isLoading: boolean
}
