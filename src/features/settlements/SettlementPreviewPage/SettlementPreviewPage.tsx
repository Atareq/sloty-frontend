import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  getApiErrorCode,
  getApiErrorMessage,
  isApiClientError,
} from '../../../core/api/apiError.helpers'
import {
  canViewOwnSettlements,
} from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { offlineRepositories } from '../../../offline/repositories/offlineRepositories'
import type { OfflineScope } from '../../../offline/offline.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageActions } from '../../../shared/components/PageActions/PageActions'
import { financeCopy } from '../../../shared/copy/appCopy'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { ConfirmSettlementDialog } from '../components/ConfirmSettlementDialog/ConfirmSettlementDialog'
import { SettlementPreviewContent } from '../components/SettlementPreviewContent/SettlementPreviewContent'
import {
  notifyCurrentFinancialStateChanged,
} from '../currentFinancialStateInvalidation'
import { createSettlement, getSettlementPreview } from '../settlementsApi'
import type {
  SettlementPreview,
  SettlementPreviewQueryParams,
} from '../settlements.types'

function parsePreviewQuery(search: string): SettlementPreviewQueryParams {
  const query = toQueryObject(search)

  return {
    ...(query.collected_by ? { collected_by: query.collected_by } : {}),
    ...(query.court ? { court: query.court } : {}),
    ...(query.page ? { page: query.page } : {}),
  }
}

const emptySettlementCodes = new Set([
  'NO_UNSETTLED_TRANSACTIONS',
  'SETTLEMENT_ALREADY_DONE',
  'TRANSACTION_SETTLED_LOCKED',
])

const staleSettlementCodes = new Set([
  ...emptySettlementCodes,
  'SETTLEMENT_CONFLICT',
  'SETTLEMENT_ALREADY_SETTLED',
  'SETTLEMENT_INVALID_STATUS',
])

function isEmptySettlementError(error: unknown): boolean {
  const code = getApiErrorCode(error)

  return Boolean(code && emptySettlementCodes.has(code))
}

function isStaleSettlementError(error: unknown): boolean {
  const code = getApiErrorCode(error)

  return Boolean(code && staleSettlementCodes.has(code))
}

function parseIntegerParam(value: number | string | undefined): number | null {
  if (value === undefined || value === '') {
    return null
  }

  const numericValue = Number(value)

  return Number.isInteger(numericValue) ? numericValue : null
}

interface EmptyPreviewStateProps {
  message?: string | null
  onRefresh?: () => void
}

function EmptyPreviewState({ message, onRefresh }: EmptyPreviewStateProps) {
  return (
    <AppCard className="space-y-3">
      <div>
        <p className="text-sm font-black text-[var(--sloty-text-primary)]">
          {message ?? financeCopy.settlementPreviewEmpty}
        </p>
        <p className="mt-1 text-sm font-bold text-[var(--sloty-text-muted)]">
          كل المبالغ الحالية اتسلّمت، أو مفيش عمليات مسجلة بعد.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/settlements">
          <AppButton variant="secondary">العودة إلى إدارة الأموال</AppButton>
        </Link>
        {onRefresh ? (
          <AppButton onClick={onRefresh} variant="secondary">
            تحديث الصفحة
          </AppButton>
        ) : null}
      </div>
    </AppCard>
  )
}

/**
 * Read-only settlement preview opened from Summary staff unsettled money cards.
 */
export function SettlementPreviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    currentUser,
    refreshCurrentUser,
    role,
    selectedClubSlug,
    selectedMembership,
  } = useAuth()
  const canViewOwn = canViewOwnSettlements(selectedMembership, role)
  const queryParams = useMemo(
    () => parsePreviewQuery(location.search),
    [location.search],
  )
  const [preview, setPreview] = useState<SettlementPreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEmptyPreview, setIsEmptyPreview] = useState(false)
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const hasTransactions = Boolean(preview && preview.transaction_count > 0)
  const canApprovePreview = Boolean(preview?.can_approve && hasTransactions)
  const offlineScope: OfflineScope | null = useMemo(
    () =>
      currentUser?.id && selectedClubSlug
        ? { userId: currentUser.id, clubSlug: selectedClubSlug }
        : null,
    [currentUser, selectedClubSlug],
  )

  const loadPreview = useCallback(async (): Promise<void> => {
    if (!selectedClubSlug || !canViewOwn) {
      setPreview(null)
      setError(null)
      setIsEmptyPreview(false)
      setEmptyMessage(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setIsEmptyPreview(false)
    setEmptyMessage(null)
    setIsConfirmOpen(false)
    setConfirmError(null)

    try {
      const nextPreview = await getSettlementPreview(
        selectedClubSlug,
        queryParams,
      )

      setPreview(nextPreview)
      setIsEmptyPreview(nextPreview.transaction_count <= 0)

      if (offlineScope) {
        try {
          await offlineRepositories.replaceCurrentCustodySnapshot(
            offlineScope,
            {
              kind: 'preview',
              collectorId: queryParams.collected_by ?? null,
              courtId: queryParams.court ?? null,
              payload: nextPreview,
            },
            new Date().toISOString(),
          )
        } catch {
          // Non-fatal: the live Backend preview remains authoritative.
        }
      }
    } catch (error) {
      setPreview(null)

      if (isEmptySettlementError(error)) {
        setIsEmptyPreview(true)
        setEmptyMessage(financeCopy.settlementPreviewEmpty)
      } else {
        setError(getApiErrorMessage(error, 'تعذر تحميل تفاصيل المبلغ'))
      }
    } finally {
      setIsLoading(false)
    }
  }, [canViewOwn, offlineScope, queryParams, selectedClubSlug])

  useEffect(() => {
    let isActive = true

    async function loadActivePreview(): Promise<void> {
      if (isActive) {
        await loadPreview()
      }
    }

    void loadActivePreview()

    return () => {
      isActive = false
    }
  }, [loadPreview])

  async function handleConfirmSettlement(): Promise<void> {
    if (!selectedClubSlug || !preview || !canApprovePreview) {
      return
    }

    const collectedBy = parseIntegerParam(
      queryParams.collected_by ?? preview.collected_by,
    )
    const court = parseIntegerParam(queryParams.court)

    if (collectedBy === null) {
      setConfirmError('تعذر تحديد الموظف المحصل لهذه التسوية.')
      return
    }

    setIsConfirmSubmitting(true)
    setConfirmError(null)
    setSuccessMessage(null)

    try {
      const settlement = await createSettlement(selectedClubSlug, {
        collected_by: collectedBy,
        ...(court !== null ? { court } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      })
      const flashMessage = 'تم استلام المبلغ بنجاح'

      setIsConfirmOpen(false)
      setSuccessMessage(flashMessage)
      notifyCurrentFinancialStateChanged({
        clubSlug: selectedClubSlug,
        reason: 'settlement-create',
      })

      if (settlement.id) {
        navigate(`/settlements/${settlement.id}`, {
          state: { flashMessage },
        })
      } else {
        navigate('/settlements', {
          state: { flashMessage },
        })
      }
    } catch (error) {
      if (isStaleSettlementError(error)) {
        setIsConfirmOpen(false)
        setPreview(null)
        setIsEmptyPreview(isEmptySettlementError(error))
        setEmptyMessage(
          isEmptySettlementError(error)
            ? financeCopy.settlementPreviewEmpty
            : financeCopy.settlementPreviewStale,
        )
        notifyCurrentFinancialStateChanged({
          clubSlug: selectedClubSlug,
          reason: 'settlement-stale',
        })
        await loadPreview()
      } else {
        setConfirmError(
          getApiErrorMessage(error, 'تعذر تأكيد استلام المبلغ. حاول مرة أخرى'),
        )

        if (isApiClientError(error) && error.status === 403) {
          await refreshCurrentUser()
        }
      }
    } finally {
      setIsConfirmSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageActions>
        <Link to="/settlements">
          <AppButton variant="secondary">رجوع إلى إدارة الأموال</AppButton>
        </Link>
      </PageActions>

      {!selectedClubSlug ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            اختر ناديًا أولًا لمراجعة المبلغ
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug && !canViewOwn ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-danger)]">
            ليس لديك صلاحية عرض المبالغ.
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug && canViewOwn && isLoading ? (
        <AppCard>
          <div className="space-y-3">
            <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
              جاري تحميل تفاصيل المبلغ...
            </p>
            <div className="h-5 w-36 rounded-full bg-[var(--sloty-bg)]" />
            <div className="h-8 w-48 rounded-full bg-[var(--sloty-bg)]" />
          </div>
        </AppCard>
      ) : null}

      {selectedClubSlug && canViewOwn && !isLoading && error ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-danger)]">{error}</p>
        </AppCard>
      ) : null}

      {selectedClubSlug
      && canViewOwn
      && !isLoading
      && !error
      && isEmptyPreview ? (
        <EmptyPreviewState message={emptyMessage} onRefresh={loadPreview} />
      ) : null}

      {selectedClubSlug
      && canViewOwn
      && !isLoading
      && !error
      && preview
      && !isEmptyPreview ? (
        <>
          <SettlementPreviewContent preview={preview} />

          {canApprovePreview ? (
            <AppCard className="space-y-4">
              <AppButton
                onClick={() => {
                  setConfirmError(null)
                  setIsConfirmOpen(true)
                }}
              >
                تأكيد استلام المبلغ
              </AppButton>
            </AppCard>
          ) : (
            <AppCard>
              <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                {preview.is_self_preview
                  ? financeCopy.selfPreviewDenied
                  : 'تقدر تراجع المبلغ هنا، لكن تأكيد الاستلام غير متاح.'}
              </p>
            </AppCard>
          )}

          {successMessage ? (
            <AppCard>
              <p className="text-sm font-bold text-[var(--sloty-primary-dark)]">
                {successMessage}
              </p>
            </AppCard>
          ) : null}

          {canApprovePreview ? (
            <ConfirmSettlementDialog
              collectorName={preview.collected_by_name}
              error={confirmError}
              isOpen={isConfirmOpen}
              isSubmitting={isConfirmSubmitting}
              notes={notes}
              onClose={() => setIsConfirmOpen(false)}
              onConfirm={handleConfirmSettlement}
              onNotesChange={setNotes}
              totalAmount={preview.total_amount}
              transactionCount={preview.transaction_count}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
