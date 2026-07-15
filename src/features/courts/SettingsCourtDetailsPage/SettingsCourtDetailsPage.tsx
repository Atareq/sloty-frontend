import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../../core/auth/useAuth'
import { canManagePricing, canManageWorkingHours } from '../../../core/auth/auth.types'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { CourtWorkingHoursSection } from '../components/CourtWorkingHoursSection/CourtWorkingHoursSection'
import { getCourt, updateCourt } from '../courtsApi'
import type { Court } from '../courts.types'

export function SettingsCourtDetailsPage() {
  const { courtId } = useParams()
  const { selectedClubSlug, selectedMembership } = useAuth()
  const [court, setCourt] = useState<Court | null>(null)
  const [price, setPrice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingPrice, setIsSavingPrice] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [priceMessage, setPriceMessage] = useState<string | null>(null)
  const canEditPrice = canManagePricing(selectedMembership)
  const canEditWorkingHours = canManageWorkingHours(selectedMembership)

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
          setPrice(response.default_price)
        }
      } catch {
        if (isActive) {
          setError('تعذر تحميل بيانات الملعب')
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

  async function handleSavePrice(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!selectedClubSlug || !courtId || !court) {
      return
    }

    if (!canEditPrice) {
      setPriceMessage('ليس لديك صلاحية تعديل سعر الملعب.')
      return
    }

    setIsSavingPrice(true)
    setPriceMessage(null)

    try {
      const savedCourt = await updateCourt(selectedClubSlug, courtId, {
        name: court.name,
        sport_type: court.sport_type,
        default_price: price,
        slot_duration_minutes: court.slot_duration_minutes,
        is_active: court.is_active,
        requires_digital_payment_reference:
          court.requires_digital_payment_reference,
        internal_hold_expiry_hours: court.internal_hold_expiry_hours,
        notes: court.notes,
      })

      setCourt(savedCourt)
      setPrice(savedCourt.default_price)
      setPriceMessage('تم حفظ سعر الملعب')
    } catch {
      setPriceMessage('تعذر حفظ سعر الملعب')
    } finally {
      setIsSavingPrice(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <Link to="/settings/courts">
            <AppButton variant="secondary">العودة للملاعب</AppButton>
          </Link>
        }
        description="تعديل سعر الملعب ومواعيد العمل حسب صلاحيات عضويتك"
        tone="brand"
        title={court?.name ?? 'إعدادات الملعب'}
      />

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
              سعر الملعب
            </h2>
            {!canEditPrice ? (
              <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
                ليس لديك صلاحية تعديل سعر الملعب.
              </p>
            ) : null}
            <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleSavePrice}>
              <label className="space-y-2 text-sm font-semibold">
                <span>سعر الفترة الواحدة</span>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15 disabled:opacity-60"
                  disabled={!canEditPrice}
                  inputMode="decimal"
                  onChange={(event) => setPrice(event.target.value)}
                  value={price}
                />
              </label>
              <div className="flex items-end">
                <AppButton disabled={!canEditPrice || isSavingPrice} type="submit">
                  {isSavingPrice ? 'جاري الحفظ...' : 'حفظ السعر'}
                </AppButton>
              </div>
            </form>
            {priceMessage ? (
              <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                {priceMessage}
              </p>
            ) : null}
          </AppCard>

          <CourtWorkingHoursSection
            canEdit={canEditWorkingHours}
            clubSlug={selectedClubSlug ?? undefined}
            courtId={courtId}
            isCreateMode={false}
          />
        </>
      ) : null}
    </div>
  )
}
