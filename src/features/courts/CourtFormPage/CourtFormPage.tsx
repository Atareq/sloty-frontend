import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { createCourt, getCourt, updateCourt } from '../courtsApi'
import type { CourtPayload } from '../courts.types'

interface CourtFormState {
  name: string
  sport_type: string
  default_price: string
  slot_duration_minutes: string
  is_active: boolean
  requires_digital_payment_reference: boolean
  internal_hold_expiry_hours: string
  notes: string
}

const initialFormState: CourtFormState = {
  name: '',
  sport_type: 'FOOTBALL',
  default_price: '',
  slot_duration_minutes: '60',
  is_active: true,
  requires_digital_payment_reference: false,
  internal_hold_expiry_hours: '12',
  notes: '',
}

const inputClass =
  'h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15'
const textareaClass =
  'min-h-24 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-2 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15'

function optionalText(value: string): string | undefined {
  const trimmedValue = value.trim()
  return trimmedValue ? trimmedValue : undefined
}

function buildPayload(formState: CourtFormState): CourtPayload {
  return {
    name: formState.name.trim(),
    sport_type: formState.sport_type.trim() || 'FOOTBALL',
    default_price: formState.default_price.trim(),
    slot_duration_minutes: Number(formState.slot_duration_minutes),
    is_active: formState.is_active,
    requires_digital_payment_reference:
      formState.requires_digital_payment_reference,
    internal_hold_expiry_hours: Number(formState.internal_hold_expiry_hours),
    notes: optionalText(formState.notes),
  }
}

/**
 * Create/edit form for court setup under a club.
 *
 * The working-hours card is intentionally a placeholder because Sprint 2B will
 * own that API flow and detailed schedule rules.
 */
export function CourtFormPage() {
  const navigate = useNavigate()
  const { clubSlug, courtId } = useParams()
  const isCreateMode = !courtId
  const [formState, setFormState] = useState<CourtFormState>(initialFormState)
  const [error, setError] = useState<string | null>(clubSlug ? null : 'رابط النادي غير صحيح')
  const [isLoading, setIsLoading] = useState(Boolean(clubSlug && !isCreateMode))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const title = useMemo(
    () => (isCreateMode ? 'إضافة ملعب' : 'تعديل الملعب'),
    [isCreateMode],
  )

  useEffect(() => {
    if (isCreateMode || !clubSlug || !courtId) {
      return
    }

    let isActive = true
    const currentClubSlug = clubSlug
    const currentCourtId = courtId

    async function loadCourt(): Promise<void> {
      setIsLoading(true)
      setError(null)

      try {
        const court = await getCourt(currentClubSlug, currentCourtId)

        if (isActive) {
          setFormState({
            name: court.name,
            sport_type: court.sport_type,
            default_price: String(court.default_price),
            slot_duration_minutes: String(court.slot_duration_minutes),
            is_active: court.is_active,
            requires_digital_payment_reference:
              court.requires_digital_payment_reference,
            internal_hold_expiry_hours: String(court.internal_hold_expiry_hours),
            notes: court.notes ?? '',
          })
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
  }, [clubSlug, courtId, isCreateMode])

  function updateField(field: keyof CourtFormState, value: string | boolean): void {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!clubSlug) {
      setError('رابط النادي غير صحيح')
      return
    }

    if (
      !formState.name.trim() ||
      !formState.default_price.trim() ||
      Number(formState.slot_duration_minutes) <= 0
    ) {
      setError('اسم الملعب والسعر ومدة الحصة مطلوبة')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const payload = buildPayload(formState)
      const savedCourt =
        isCreateMode || !courtId
          ? await createCourt(clubSlug, payload)
          : await updateCourt(clubSlug, courtId, payload)

      navigate(
        isCreateMode
          ? `/admin/clubs/${clubSlug}/courts`
          : `/admin/clubs/${clubSlug}/courts/${savedCourt.id}`,
      )
    } catch {
      setError('تعذر حفظ بيانات الملعب')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          clubSlug ? (
            <Link to={`/admin/clubs/${clubSlug}/courts`}>
              <AppButton variant="secondary">العودة للملاعب</AppButton>
            </Link>
          ) : null
        }
        description="بيانات الملعب الأساسية التي يعتمد عليها جدول الحجز لاحقاً."
        title={title}
      />

      <AppCard>
        {isLoading ? (
          <p className="text-sm text-[var(--sloty-text-muted)]">
            جاري تحميل بيانات الملعب...
          </p>
        ) : (
          <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
            <label className="space-y-2 text-sm font-semibold">
              <span>اسم الملعب</span>
              <input
                className={inputClass}
                onChange={(event) => updateField('name', event.target.value)}
                value={formState.name}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>نوع الرياضة</span>
              <input
                className={inputClass}
                dir="ltr"
                onChange={(event) =>
                  updateField('sport_type', event.target.value)
                }
                value={formState.sport_type}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>السعر الافتراضي</span>
              <input
                className={inputClass}
                inputMode="decimal"
                onChange={(event) =>
                  updateField('default_price', event.target.value)
                }
                value={formState.default_price}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>مدة الحصة بالدقائق</span>
              <input
                className={inputClass}
                inputMode="numeric"
                onChange={(event) =>
                  updateField('slot_duration_minutes', event.target.value)
                }
                value={formState.slot_duration_minutes}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>انتهاء الحجز الداخلي بالساعات</span>
              <input
                className={inputClass}
                inputMode="numeric"
                onChange={(event) =>
                  updateField('internal_hold_expiry_hours', event.target.value)
                }
                value={formState.internal_hold_expiry_hours}
              />
            </label>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                checked={formState.is_active}
                onChange={(event) => updateField('is_active', event.target.checked)}
                type="checkbox"
              />
              الملعب نشط
            </label>

            <label className="flex items-center gap-3 text-sm font-semibold lg:col-span-2">
              <input
                checked={formState.requires_digital_payment_reference}
                onChange={(event) =>
                  updateField(
                    'requires_digital_payment_reference',
                    event.target.checked,
                  )
                }
                type="checkbox"
              />
              يتطلب مرجع دفع رقمي
            </label>

            <label className="space-y-2 text-sm font-semibold lg:col-span-2">
              <span>ملاحظات</span>
              <textarea
                className={textareaClass}
                onChange={(event) => updateField('notes', event.target.value)}
                value={formState.notes}
              />
            </label>

            {error ? (
              <p className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--sloty-danger)] lg:col-span-2">
                {error}
              </p>
            ) : null}

            <div className="lg:col-span-2">
              <AppButton disabled={isSubmitting} type="submit">
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ الملعب'}
              </AppButton>
            </div>
          </form>
        )}
      </AppCard>

      <AppCard>
        <p className="text-sm font-semibold text-[var(--sloty-text-primary)]">
          إعدادات ساعات العمل ستضاف في الخطوة التالية
        </p>
      </AppCard>
    </div>
  )
}
