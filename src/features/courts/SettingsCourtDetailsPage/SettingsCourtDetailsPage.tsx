import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import {
  getApiErrorMessage,
  isApiClientError,
} from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import {
  canManageCancellationRefundPolicy,
  canManageWorkingHours,
} from '../../../core/auth/auth.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageActions } from '../../../shared/components/PageActions/PageActions'
import { CourtWorkingHoursSection } from '../components/CourtWorkingHoursSection/CourtWorkingHoursSection'
import { getCourt, updateCourt } from '../courtsApi'
import type { Court } from '../courts.types'

export function SettingsCourtDetailsPage() {
  const { courtId } = useParams()
  const {
    refreshCurrentUser,
    role,
    selectedClubSlug,
    selectedMembership,
  } = useAuth()
  const [court, setCourt] = useState<Court | null>(null)
  const [minimumDeposit, setMinimumDeposit] = useState('')
  const [refundNoticeDays, setRefundNoticeDays] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingPolicy, setIsSavingPolicy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [policyMessage, setPolicyMessage] = useState<string | null>(null)
  const canEditWorkingHours = canManageWorkingHours(selectedMembership, role)
  const canEditRefundPolicy = canManageCancellationRefundPolicy(
    selectedMembership,
    role,
  )

  useEffect(() => {
    let isActive = true

    async function loadCourt(): Promise<void> {
      if (!selectedClubSlug || !courtId) {
        setIsLoading(false)
        setError('رابط الملعب غير صحيح')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await getCourt(selectedClubSlug, courtId)

        if (isActive) {
          setCourt(response)
          setMinimumDeposit(response.minimum_deposit)
          setRefundNoticeDays(
            response.cancellation_refund_notice_days === null
              ? ''
              : String(response.cancellation_refund_notice_days),
          )
        }
      } catch (error) {
        if (isActive) {
          setError(getApiErrorMessage(error, 'تعذر تحميل بيانات الملعب'))
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadCourt()

    return () => {
      isActive = false
    }
  }, [courtId, selectedClubSlug])

  async function handleSavePolicy(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!selectedClubSlug || !courtId || !court) {
      return
    }

    if (!canEditRefundPolicy) {
      setPolicyMessage('ليست لديك صلاحية تعديل سياسة الحجز والإلغاء.')
      return
    }

    const parsedMinimumDeposit = Number(minimumDeposit)
    const parsedRefundNoticeDays =
      refundNoticeDays.trim() === '' ? null : Number(refundNoticeDays)

    if (
      !Number.isFinite(parsedMinimumDeposit) ||
      parsedMinimumDeposit < 0 ||
      (parsedRefundNoticeDays !== null &&
        (!Number.isInteger(parsedRefundNoticeDays) ||
          parsedRefundNoticeDays < 0 ||
          parsedRefundNoticeDays > 30))
    ) {
      setPolicyMessage(
        'الحد الأدنى للعربون يجب ألا يقل عن صفر، ومهلة الاسترداد من 0 إلى 30 أو فارغة.',
      )
      return
    }

    setIsSavingPolicy(true)
    setPolicyMessage(null)

    try {
      const savedCourt = await updateCourt(selectedClubSlug, courtId, {
        name: court.name,
        sport_type: court.sport_type,
        default_price: court.default_price,
        minimum_deposit: minimumDeposit,
        cancellation_refund_notice_days: parsedRefundNoticeDays,
        slot_duration_minutes: court.slot_duration_minutes,
        is_active: court.is_active,
        requires_digital_payment_reference:
          court.requires_digital_payment_reference,
        internal_hold_expiry_hours: court.internal_hold_expiry_hours,
        notes: court.notes,
      })

      setCourt(savedCourt)
      setMinimumDeposit(savedCourt.minimum_deposit)
      setRefundNoticeDays(
        savedCourt.cancellation_refund_notice_days === null
          ? ''
          : String(savedCourt.cancellation_refund_notice_days),
      )
      setPolicyMessage('تم حفظ سياسة الحجز والإلغاء')
    } catch (error) {
      setPolicyMessage(
        getApiErrorMessage(error, 'تعذر حفظ سياسة الحجز والإلغاء'),
      )

      if (isApiClientError(error) && error.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setIsSavingPolicy(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageActions>
        <Link to="/settings/courts">
          <AppButton variant="secondary">العودة للملاعب</AppButton>
        </Link>
      </PageActions>

      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل بيانات الملعب...
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

      {court && !isLoading ? (
        <>
          <AppCard className="space-y-4">
            <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
              سياسة الحجز والإلغاء
            </h2>
            {!canEditRefundPolicy ? (
              <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
                سياسة استرداد التأمين للعرض فقط في هذا الحساب.
              </p>
            ) : null}
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSavePolicy}>
              <label className="space-y-2 text-sm font-semibold">
                <span>الحد الأدنى للعربون</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-base outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15 disabled:opacity-60 sm:text-sm"
                  disabled={!canEditRefundPolicy}
                  inputMode="decimal"
                  onChange={(event) => setMinimumDeposit(event.target.value)}
                  value={minimumDeposit}
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>سياسة استرداد التأمين</span>
                <span className="block text-xs font-normal text-[var(--sloty-text-muted)]">
                  يسترد العميل التأمين عند الإلغاء قبل الموعد بـ
                </span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-base outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15 disabled:opacity-60 sm:text-sm"
                  disabled={!canEditRefundPolicy}
                  inputMode="numeric"
                  max="30"
                  min="0"
                  onChange={(event) => setRefundNoticeDays(event.target.value)}
                  placeholder="عدد الأيام"
                  type="number"
                  value={refundNoticeDays}
                />
              </label>
              <p className="text-xs font-bold text-[var(--sloty-text-muted)] md:col-span-2">
                الأيام بتتحسب قبل موعد الحجز، وسياسة الاسترداد المحفوظة هي اللي بتظهر وقت الإلغاء.
              </p>
              <div className="flex items-end md:col-span-2">
                <AppButton
                  disabled={!canEditRefundPolicy || isSavingPolicy}
                  type="submit"
                >
                  {isSavingPolicy ? 'جاري الحفظ...' : 'حفظ سياسة الحجز'}
                </AppButton>
              </div>
            </form>
            {policyMessage ? (
              <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                {policyMessage}
              </p>
            ) : null}
          </AppCard>

          <CourtWorkingHoursSection
            canEdit={canEditWorkingHours}
            clubSlug={selectedClubSlug ?? undefined}
            courtId={courtId}
            isCreateMode={false}
            slotDurationMinutes={court.slot_duration_minutes}
          />
        </>
      ) : null}
    </div>
  )
}
