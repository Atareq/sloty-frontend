import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  getApiErrorMessage,
  getApiFieldErrors,
  getFirstFieldErrorMessage,
} from '../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../core/api/apiClient'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { AppSelect } from '../../../shared/components/AppSelect/AppSelect'
import { PageActions } from '../../../shared/components/PageActions/PageActions'
import { CourtWorkingHoursSection } from '../components/CourtWorkingHoursSection/CourtWorkingHoursSection'
import { createCourt, getCourt, updateCourt } from '../courtsApi'
import type { CourtPayload } from '../courts.types'

type SportType =
  | 'FOOTBALL'
  | 'PADEL'
  | 'TENNIS'

const sportTypeChoices: Array<{
  value: SportType
  label: string
}> = [
  {
    value: 'FOOTBALL',
    label: 'كرة القدم',
  },
  {
    value: 'PADEL',
    label: 'بادل',
  },
  {
    value: 'TENNIS',
    label: 'تنس',
  },

]
const sportTypeValues = sportTypeChoices.map((sport) => sport.value)

type CourtFormState = {
  name: string
  sport_type: SportType
  default_price: string
  minimum_deposit: string
  cancellation_refund_notice_days: string
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
  minimum_deposit: '',
  cancellation_refund_notice_days: '',
  slot_duration_minutes: '60',
  is_active: true,
  requires_digital_payment_reference: false,
  internal_hold_expiry_hours: '12',
  notes: '',
}

const slotDurationOptions = [
  { value: '30', label: '30 دقيقة' },
  { value: '45', label: '45 دقيقة' },
  { value: '60', label: 'ساعة واحدة' },
  { value: '90', label: 'ساعة ونصف' },
  { value: '120', label: 'ساعتان' },
]

const holdExpiryOptions = [
  { value: '1', label: 'ساعة واحدة' },
  { value: '2', label: 'ساعتان' },
  { value: '6', label: '6 ساعات' },
  { value: '12', label: '12 ساعة' },
  { value: '16', label: '16 ساعة' },
  { value: '24', label: '24 ساعة' },
]

const inputClass =
  'h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15'
const textareaClass =
  'min-h-24 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-2 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15'

function optionalText(value: string): string | undefined {
  const trimmedValue = value.trim()
  return trimmedValue ? trimmedValue : undefined
}

function toSportType(value: string): SportType {
  return sportTypeValues.includes(value as SportType)
    ? (value as SportType)
    : 'FOOTBALL'
}

function buildPayload(formState: CourtFormState): CourtPayload {
  return {
    name: formState.name.trim(),
    sport_type: formState.sport_type,
    default_price: formState.default_price.trim(),
    minimum_deposit: formState.minimum_deposit.trim(),
    cancellation_refund_notice_days:
      formState.cancellation_refund_notice_days.trim() === ''
        ? null
        : Number(formState.cancellation_refund_notice_days),
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
 * Working-hours setup is mounted below the court form, but booking-slot
 * generation still belongs to a later booking integration sprint.
 */
export function CourtFormPage() {
  const navigate = useNavigate()
  const { clubSlug, courtId } = useParams()
  const isCreateMode = !courtId
  const [formState, setFormState] = useState<CourtFormState>(initialFormState)
  const [error, setError] = useState<string | null>(clubSlug ? null : 'رابط النادي غير صحيح')
  const [fieldErrors, setFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(clubSlug && !isCreateMode))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const nameFieldError = getFirstFieldErrorMessage(fieldErrors, 'name')
  const defaultPriceFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'default_price',
  )
  const minimumDepositFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'minimum_deposit',
  )
  const cancellationRefundNoticeFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'cancellation_refund_notice_days',
  )
  const slotDurationFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'slot_duration_minutes',
  )
  const holdExpiryFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'internal_hold_expiry_hours',
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
      setFieldErrors(null)

      try {
        const court = await getCourt(currentClubSlug, currentCourtId)

        if (isActive) {
          setFormState({
            name: court.name,
            sport_type: toSportType(court.sport_type),
            default_price: String(court.default_price),
            minimum_deposit: String(court.minimum_deposit),
            cancellation_refund_notice_days:
              court.cancellation_refund_notice_days === null
                ? ''
                : String(court.cancellation_refund_notice_days),
            slot_duration_minutes: String(court.slot_duration_minutes),
            is_active: court.is_active,
            requires_digital_payment_reference:
              court.requires_digital_payment_reference,
            internal_hold_expiry_hours: String(court.internal_hold_expiry_hours),
            notes: court.notes ?? '',
          })
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
  }, [clubSlug, courtId, isCreateMode])

  function updateField(field: keyof CourtFormState, value: string | boolean): void {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
    setFieldErrors(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!clubSlug) {
      setError('رابط النادي غير صحيح')
      setFieldErrors(null)
      return
    }

    if (!formState.name.trim()) {
      setError('اسم الملعب مطلوب')
      setFieldErrors(null)
      return
    }

    const defaultPrice = Number(formState.default_price)
    const minimumDeposit = Number(formState.minimum_deposit)
    const cancellationRefundNotice =
      formState.cancellation_refund_notice_days.trim() === ''
        ? null
        : Number(formState.cancellation_refund_notice_days)
    const slotDurationMinutes = Number(formState.slot_duration_minutes)
    const internalHoldExpiryHours = Number(formState.internal_hold_expiry_hours)
    const hasInvalidNumber =
      !Number.isFinite(defaultPrice) ||
      !Number.isFinite(minimumDeposit) ||
      !Number.isFinite(slotDurationMinutes) ||
      !Number.isFinite(internalHoldExpiryHours) ||
      defaultPrice <= 0 ||
      minimumDeposit < 0 ||
      slotDurationMinutes <= 0 ||
      internalHoldExpiryHours <= 0

    if (hasInvalidNumber) {
      setError('السعر ومدة الحصة وانتهاء الحجز يجب أن تكون أرقاماً صحيحة، والحد الأدنى للعربون لا يقل عن صفر')
      setFieldErrors(null)
      return
    }

    if (
      cancellationRefundNotice !== null &&
      (!Number.isInteger(cancellationRefundNotice) ||
        cancellationRefundNotice < 0 ||
        cancellationRefundNotice > 30)
    ) {
      setError('مهلة استرداد العربون يجب أن تكون فارغة أو رقمًا من 0 إلى 30')
      setFieldErrors(null)
      return
    }

    setError(null)
    setFieldErrors(null)
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
    } catch (error) {
      setError(getApiErrorMessage(error, 'تعذر حفظ بيانات الملعب'))
      setFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {clubSlug ? (
        <PageActions>
          <Link to={`/admin/clubs/${clubSlug}/courts`}>
            <AppButton variant="secondary">العودة للملاعب</AppButton>
          </Link>
        </PageActions>
      ) : null}

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
            {nameFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {nameFieldError}
              </p>
            ) : null}

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">
                نوع الرياضة
              </legend>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {sportTypeChoices.map((sport) => {
                  const isSelected = formState.sport_type === sport.value

                  return (
                    <label
                      key={sport.value}
                      className={[
                        'shrink-0 cursor-pointer rounded-lg border px-4 py-2',
                        'text-sm font-medium transition-colors',
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="sport_type"
                        value={sport.value}
                        checked={isSelected}
                        onChange={() =>
                          updateField('sport_type', sport.value)
                        }
                        className="sr-only"
                      />

                      {sport.label}
                    </label>
                  )
                })}
              </div>

            </fieldset>

            <label className="space-y-2 text-sm font-semibold">
              <span>سعر الفترة الواحده</span>
              <input
                className={inputClass}
                inputMode="decimal"
                onChange={(event) =>
                  updateField('default_price', event.target.value)
                }
                value={formState.default_price}
              />
            </label>
            {defaultPriceFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {defaultPriceFieldError}
              </p>
            ) : null}

            <label className="space-y-2 text-sm font-semibold">
              <span>الحد الأدنى للعربون</span>
              <input
                className={inputClass}
                inputMode="decimal"
                onChange={(event) =>
                  updateField('minimum_deposit', event.target.value)
                }
                value={formState.minimum_deposit}
              />
              <span className="block text-xs font-normal text-gray-500">
                تتحقق الخلفية من أول دفعة حسب قيمة الحجز وسياسة الملعب.
              </span>
            </label>
            {minimumDepositFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {minimumDepositFieldError}
              </p>
            ) : null}

            <label className="space-y-2 text-sm font-semibold">
              <span>مهلة استرداد العربون عند الإلغاء</span>
              <input
                className={inputClass}
                inputMode="numeric"
                max="30"
                min="0"
                onChange={(event) =>
                  updateField(
                    'cancellation_refund_notice_days',
                    event.target.value,
                  )
                }
                placeholder="بدون مهلة"
                type="number"
                value={formState.cancellation_refund_notice_days}
              />
              <span className="block text-xs font-normal text-gray-500">
                اتركه فارغًا إذا لم توجد مهلة، أو استخدم رقمًا من 0 إلى 30.
              </span>
            </label>
            {cancellationRefundNoticeFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {cancellationRefundNoticeFieldError}
              </p>
            ) : null}

            <label className="block space-y-2">
              <AppSelect
                label="مدة الفترة الواحدة"
                onChange={(value) => updateField('slot_duration_minutes', value)}
                options={slotDurationOptions}
                value={formState.slot_duration_minutes}
              />

              <span className="block text-xs font-normal text-gray-500">
                يتم حفظ مدة الفترة ولا يمكن تغييرها بعد ذلك.
              </span>
            </label>
            {slotDurationFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {slotDurationFieldError}
              </p>
            ) : null}
            <label className="block space-y-2">
              <AppSelect
                label="مدة الاحتفاظ بالحجز بدون دفع"
                onChange={(value) =>
                  updateField('internal_hold_expiry_hours', value)
                }
                options={holdExpiryOptions}
                value={formState.internal_hold_expiry_hours}
              />

              <span className="block text-xs font-normal text-gray-500">
                المدة التي يظل فيها الحجز محفوظاً قبل إلغائه في حالة عدم الدفع.
              </span>
            </label>
            {holdExpiryFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {holdExpiryFieldError}
              </p>
            ) : null}

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
              إيصال الدفع إلزامي
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

      <CourtWorkingHoursSection
        clubSlug={clubSlug}
        courtId={courtId}
        isCreateMode={isCreateMode}
      />
    </div>
  )
}
