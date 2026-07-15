import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../../core/auth/useAuth'
import { canManageSettlements } from '../../../core/auth/auth.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { SettlementTotalsCard } from '../components/SettlementTotalsCard/SettlementTotalsCard'
import { SettlementTransactionsList } from '../components/SettlementTransactionsList/SettlementTransactionsList'
import {
  createSettlement,
  getSettlementPreview,
} from '../settlementsApi'
import type {
  SettlementCreatePayload,
  SettlementPreview,
  SettlementPreviewParams,
} from '../settlements.types'

interface FilterState {
  staff: string
  date_from: string
  date_to: string
}

const initialFilters: FilterState = {
  staff: '',
  date_from: '',
  date_to: '',
}

function buildParams(filters: FilterState): SettlementPreviewParams {
  return {
    ...(filters.staff.trim() ? { staff: filters.staff.trim() } : {}),
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
  }
}

function buildCreatePayload(
  filters: FilterState,
  preview: SettlementPreview | null,
  notes: string,
): SettlementCreatePayload {
  return {
    ...(filters.staff.trim()
      ? { staff: filters.staff.trim() }
      : preview?.staff?.id
        ? { staff: preview.staff.id }
        : {}),
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(notes.trim() ? { notes: notes.trim() } : {}),
  }
}

/**
 * Staff settlement preview and confirmation flow for the selected club.
 */
export function SettlementPreviewPage() {
  const { claims, selectedClubSlug, selectedMembership } = useAuth()
  const navigate = useNavigate()
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [preview, setPreview] = useState<SettlementPreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [notes, setNotes] = useState('')
  const selectedClubName = selectedMembership?.club.name ?? null
  const canSettle = canManageSettlements(selectedMembership)
  const isOwnPreview =
    Boolean(claims?.user_id && preview?.staff?.id) &&
    claims?.user_id === preview?.staff?.id
  const hasTransactions = Boolean(preview && preview.transactions.length > 0)

  useEffect(() => {
    if (!selectedClubSlug || !canSettle) {
      return
    }

    let isActive = true
    const clubSlug = selectedClubSlug

    async function loadPreview(): Promise<void> {
      setIsLoading(true)
      setError(null)
      setSuccessMessage(null)

      try {
        const response = await getSettlementPreview(clubSlug, {})

        if (isActive) {
          setPreview(response)
        }
      } catch {
        if (isActive) {
          setPreview(null)
          setError('تعذر تحميل معاملات التسوية')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      isActive = false
    }
  }, [canSettle, selectedClubSlug])

  function updateFilter(field: keyof FilterState, value: string): void {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
    setSuccessMessage(null)
  }

  async function handlePreviewSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()

    if (!selectedClubSlug || !canSettle) {
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)
    setIsConfirming(false)

    try {
      setPreview(await getSettlementPreview(selectedClubSlug, buildParams(filters)))
    } catch {
      setPreview(null)
      setError('تعذر تحميل معاملات التسوية')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateSettlement(): Promise<void> {
    if (!selectedClubSlug || !preview || !hasTransactions || isOwnPreview) {
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const settlement = await createSettlement(
        selectedClubSlug,
        buildCreatePayload(filters, preview, notes),
      )

      setSuccessMessage('تم إنشاء التسوية بنجاح')
      setIsConfirming(false)
      navigate(`/settlements/${settlement.id}`)
    } catch {
      setError('تعذر إنشاء التسوية. حاول مرة أخرى')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <Link to="/settlements/history">
            <AppButton variant="secondary">سجل التسويات</AppButton>
          </Link>
        }
        description={
          selectedClubName
            ? `مراجعة وتسوية المبالغ غير المسواة داخل ${selectedClubName}`
            : 'مراجعة وتسوية المبالغ غير المسواة'
        }
        tone="brand"
        title="التسويات"
      />

      {!selectedClubSlug ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            اختر ناديًا أولًا لعرض التسويات
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug && !canSettle ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-danger)]">
            ليس لديك صلاحية إدارة التسويات.
          </p>
        </AppCard>
      ) : null}

      {selectedClubSlug && canSettle ? (
        <>
          <AppCard>
            <form className="grid gap-4 lg:grid-cols-4" onSubmit={handlePreviewSubmit}>
              <label className="space-y-2 text-sm font-semibold">
                <span>رقم الموظف</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  inputMode="numeric"
                  onChange={(event) => updateFilter('staff', event.target.value)}
                  value={filters.staff}
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>من تاريخ</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) =>
                    updateFilter('date_from', event.target.value)
                  }
                  type="date"
                  value={filters.date_from}
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>إلى تاريخ</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  onChange={(event) => updateFilter('date_to', event.target.value)}
                  type="date"
                  value={filters.date_to}
                />
              </label>
              <div className="flex items-end">
                <AppButton disabled={isLoading} fullWidth type="submit">
                  {isLoading
                    ? 'جاري العرض...'
                    : 'عرض المعاملات غير المسواة'}
                </AppButton>
              </div>
            </form>
          </AppCard>

          {isLoading ? (
            <AppCard>
              <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                جاري تحميل معاملات التسوية...
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

          {successMessage ? (
            <AppCard>
              <p className="text-sm font-bold text-[var(--sloty-primary-dark)]">
                {successMessage}
              </p>
            </AppCard>
          ) : null}

          {preview && !isLoading ? (
            <>
              <SettlementTotalsCard totals={preview.totals} />
              {isOwnPreview ? (
                <AppCard>
                  <p className="text-sm font-bold text-[var(--sloty-danger)]">
                    لا يمكن تسوية معاملاتك الشخصية من هذه الواجهة
                  </p>
                </AppCard>
              ) : null}
              <SettlementTransactionsList transactions={preview.transactions} />
              {hasTransactions ? (
                <AppCard className="space-y-4">
                  {!isConfirming ? (
                    <AppButton
                      disabled={isOwnPreview}
                      onClick={() => setIsConfirming(true)}
                    >
                      تأكيد التسوية
                    </AppButton>
                  ) : (
                    <div className="space-y-4">
                      <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-primary)]">
                        سيتم قفل هذه المعاملات بعد تأكيد التسوية.
                      </p>
                      <label className="block space-y-2 text-sm font-semibold">
                        <span>ملاحظات</span>
                        <textarea
                          className="min-h-24 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-2 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                          onChange={(event) => setNotes(event.target.value)}
                          value={notes}
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <AppButton
                          disabled={isSubmitting}
                          onClick={handleCreateSettlement}
                        >
                          {isSubmitting ? 'جاري التأكيد...' : 'تأكيد التسوية'}
                        </AppButton>
                        <AppButton
                          disabled={isSubmitting}
                          onClick={() => setIsConfirming(false)}
                          variant="secondary"
                        >
                          رجوع
                        </AppButton>
                      </div>
                    </div>
                  )}
                </AppCard>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
