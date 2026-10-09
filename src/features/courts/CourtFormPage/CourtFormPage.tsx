import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
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
import { SlotyPhoneNumberInput } from '../../../shared/components/PhoneNumberInput/PhoneNumberInput'
import { settingsCopy } from '../../../shared/copy/appCopy'
import { getPhoneValidationMessage } from '../../../shared/copy/phoneValidation'
import { validatePhoneNumber } from '../../../shared/validation/phone'
import { getClub, updateClub } from '../../clubs/clubsApi'
import type { Club } from '../../clubs/clubs.types'
import { CourtWorkingHoursSection } from '../components/CourtWorkingHoursSection/CourtWorkingHoursSection'
import {
  createCourt,
  getCourt,
  listCourtImages,
  replaceCourtPrimaryImage,
  updateCourt,
} from '../courtsApi'
import type { CourtImage, CourtPayload } from '../courts.types'

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
  'h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-base outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15 sm:text-sm'
const textareaClass =
  'min-h-24 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-2 text-right text-base outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15 sm:text-sm'

function optionalText(value: string): string | undefined {
  const trimmedValue = value.trim()
  return trimmedValue ? trimmedValue : undefined
}

function toSportType(value: string): SportType {
  return sportTypeValues.includes(value as SportType)
    ? (value as SportType)
    : 'FOOTBALL'
}

interface SelectedCourtImage {
  file: File
  /** Local `blob:` URL for the preview; revoked when replaced or unmounted. */
  previewUrl: string
}

const courtImageSavedWithoutImageMessage =
  'تم حفظ بيانات الملعب، لكن تعذر رفع الصورة.'

/**
 * Reads the image-upload failure carried from create mode to the new Court's
 * edit page (the Court already exists, so retrying there cannot duplicate it).
 */
function readCarriedCourtImageError(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) {
    return null
  }

  const courtImageError = (state as { courtImageError?: unknown })
    .courtImageError

  return typeof courtImageError === 'string' ? courtImageError : null
}

function getCourtImageErrorMessage(error: unknown): string {
  const reason =
    getFirstFieldErrorMessage(getApiFieldErrors(error), 'image') ??
    getApiErrorMessage(error, 'حاول مرة أخرى.')

  return `${courtImageSavedWithoutImageMessage} ${reason}`
}

function buildPayload(formState: CourtFormState): CourtPayload {
  return {
    name: formState.name.trim(),
    sport_type: formState.sport_type,
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
 *
 * `صورة الملعب` keeps one primary image per Court. Court create/update stay
 * JSON; a selected file is uploaded afterwards through the Court images
 * endpoint (multipart), and only then are previous images detached. Without a
 * new file, no image request is sent, so the existing image is untouched.
 */
export function CourtFormPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { clubSlug, courtId } = useParams()
  const isCreateMode = !courtId
  const [formState, setFormState] = useState<CourtFormState>(initialFormState)
  const [club, setClub] = useState<Club | null>(null)
  const [clubPhoneNumber, setClubPhoneNumber] = useState<string | undefined>(
    undefined,
  )
  const [currentImage, setCurrentImage] = useState<CourtImage | null>(null)
  const [currentImageLoadFailed, setCurrentImageLoadFailed] = useState(false)
  const [selectedImage, setSelectedImage] =
    useState<SelectedCourtImage | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(clubSlug ? null : 'رابط النادي غير صحيح')
  const [fieldErrors, setFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(clubSlug && !isCreateMode))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const nameFieldError = getFirstFieldErrorMessage(fieldErrors, 'name')
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
  const clubPhoneFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'phone_number',
  )
  const carriedImageError = isCreateMode
    ? null
    : readCarriedCourtImageError(location.state)
  const imageFieldError =
    imageError ?? (selectedImage ? null : carriedImageError)
  const currentImageUrl = currentImage?.image.thumbnail_url || null
  const imagePreviewUrl = selectedImage?.previewUrl ?? currentImageUrl

  useEffect(() => {
    const previewUrl = selectedImage?.previewUrl

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [selectedImage])

  useEffect(() => {
    if (!clubSlug) {
      return
    }

    let isActive = true
    const currentClubSlug = clubSlug

    async function loadClub(): Promise<void> {
      try {
        // The Club retrieve route accepts the slug used by the Court routes;
        // phone_number remains owned exclusively by that parent Club.
        const loadedClub = await getClub(currentClubSlug)

        if (isActive) {
          setClub(loadedClub)
          setClubPhoneNumber(loadedClub.phone_number)
        }
      } catch (error) {
        if (isActive) {
          setError(getApiErrorMessage(error, 'تعذر تحميل بيانات النادي'))
        }
      }
    }

    void loadClub()

    return () => {
      isActive = false
    }
  }, [clubSlug])

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
        // The image preview is optional: an image-list failure must never
        // block editing the Court itself.
        const [court, courtImages] = await Promise.all([
          getCourt(currentClubSlug, currentCourtId),
          listCourtImages(currentClubSlug, currentCourtId).catch(() => null),
        ])

        if (isActive) {
          setCurrentImage(courtImages?.[0] ?? null)
          setCurrentImageLoadFailed(courtImages === null)
          setFormState({
            name: court.name,
            sport_type: toSportType(court.sport_type),
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

  function handleImageChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null

    setSelectedImage(
      file ? { file, previewUrl: URL.createObjectURL(file) } : null,
    )
    setImageError(null)
  }

  function clearSelectedImage(): void {
    setSelectedImage(null)

    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  /**
   * Uploads the selected file after the Court itself was saved.
   *
   * Returns false when the upload failed. The Court is already saved then, so
   * create mode continues on the new Court's edit page (a retry there cannot
   * create a duplicate Court) and edit mode stays on the page with the error.
   */
  async function saveSelectedImage(
    currentClubSlug: string,
    savedCourtId: number,
    file: File,
  ): Promise<boolean> {
    try {
      const uploadedImage = await replaceCourtPrimaryImage(
        currentClubSlug,
        savedCourtId,
        file,
      )

      setCurrentImage(uploadedImage)
      setCurrentImageLoadFailed(false)
      clearSelectedImage()
      return true
    } catch (error) {
      const message = getCourtImageErrorMessage(error)

      setImageError(message)

      if (isCreateMode) {
        // The router may remount the page on the edit route, so the message
        // also travels in navigation state.
        navigate(`/admin/clubs/${currentClubSlug}/courts/${savedCourtId}`, {
          replace: true,
          state: { courtImageError: message },
        })
      }

      return false
    }
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

    if (!club) {
      setError('تعذر تحميل بيانات النادي')
      setFieldErrors(null)
      return
    }

    const phoneValidation = validatePhoneNumber(clubPhoneNumber)

    if (!phoneValidation.valid) {
      setError(getPhoneValidationMessage(phoneValidation.error))
      setFieldErrors(null)
      return
    }

    const minimumDeposit = Number(formState.minimum_deposit)
    const cancellationRefundNotice =
      formState.cancellation_refund_notice_days.trim() === ''
        ? null
        : Number(formState.cancellation_refund_notice_days)
    const slotDurationMinutes = Number(formState.slot_duration_minutes)
    const internalHoldExpiryHours = Number(formState.internal_hold_expiry_hours)
    const hasInvalidNumber =
      !Number.isFinite(minimumDeposit) ||
      !Number.isFinite(slotDurationMinutes) ||
      !Number.isFinite(internalHoldExpiryHours) ||
      minimumDeposit < 0 ||
      slotDurationMinutes <= 0 ||
      internalHoldExpiryHours <= 0

    if (hasInvalidNumber) {
      setError('مدة الحصة وانتهاء الحجز يجب أن تكون أرقاماً صحيحة، والحد الأدنى للعربون لا يقل عن صفر')
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
    setImageError(null)
    setIsSubmitting(true)

    try {
      const payload = buildPayload(formState)
      const normalizedClubPhone = clubPhoneNumber?.trim() || undefined
      const initialClubPhone = club.phone_number?.trim() || undefined

      if (normalizedClubPhone !== initialClubPhone) {
        try {
          await updateClub(club.id, { phone_number: normalizedClubPhone })
        } catch (error) {
          setError(getApiErrorMessage(error, 'تعذر حفظ رقم هاتف النادي'))
          setFieldErrors(getApiFieldErrors(error))
          return
        }
      }

      const savedCourt =
        isCreateMode || !courtId
          ? await createCourt(clubSlug, payload)
          : await updateCourt(clubSlug, courtId, payload)

      if (
        selectedImage &&
        !(await saveSelectedImage(clubSlug, savedCourt.id, selectedImage.file))
      ) {
        return
      }

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
            {/* Club-owned contact phone; never included in CourtPayload. */}
            <div className="space-y-2 text-sm font-semibold lg:col-span-2">
              <span>رقم هاتف النادي</span>
              <SlotyPhoneNumberInput
                ariaLabel="رقم هاتف النادي"
                disabled={isSubmitting}
                error={
                  error === getPhoneValidationMessage('INVALID_PHONE') ||
                  Boolean(clubPhoneFieldError)
                }
                onChange={(value) => {
                  setClubPhoneNumber(value)
                  setFieldErrors(null)
                }}
                value={clubPhoneNumber}
              />
              {clubPhoneFieldError ? (
                <p className="text-xs font-bold text-[var(--sloty-danger)]">
                  {clubPhoneFieldError}
                </p>
              ) : null}
            </div>

            {/* اسم الملعب */}
            <div>
              <label className="space-y-2 text-sm font-semibold">
                <span>اسم الملعب</span>
                <input
                  className={inputClass}
                  onChange={(event) => updateField('name', event.target.value)}
                  value={formState.name}
                />
              </label>
              {nameFieldError ? (
                <p className="mt-1 text-xs font-bold text-[var(--sloty-danger)]">
                  {nameFieldError}
                </p>
              ) : null}
            </div>

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

            {/* الحد الأدنى للعربون — zero is a valid business value */}
            <div>
              <label className="space-y-2 text-sm font-semibold">
                <span>الحد الأدنى للعربون</span>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  min="0"
                  onChange={(event) =>
                    updateField('minimum_deposit', event.target.value)
                  }
                  type="number"
                  value={formState.minimum_deposit}
                />
                <span className="block text-xs font-normal text-gray-500">
                  أقل عربون مطلوب لتأكيد الحجز.
                </span>
              </label>
              {minimumDepositFieldError ? (
                <p className="mt-1 text-xs font-bold text-[var(--sloty-danger)]">
                  {minimumDepositFieldError}
                </p>
              ) : null}
            </div>

            {/* سياسة استرداد التأمين */}
            <div>
              <label className="space-y-2 text-sm font-semibold">
                <span>سياسة استرداد التأمين</span>
                <div className="flex items-center gap-2">
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
                    placeholder="عدد الأيام"
                    type="number"
                    value={formState.cancellation_refund_notice_days}
                  />
                  <span className="shrink-0 text-sm font-bold text-gray-500">
                    أيام
                  </span>
                </div>
                <span className="block text-xs font-normal text-gray-500">
                  {formState.cancellation_refund_notice_days.trim()
                    ? `يسترد العميل التأمين عند الإلغاء قبل الموعد بـ ${formState.cancellation_refund_notice_days.trim()} أيام`
                    : 'يسترد العميل التأمين عند الإلغاء قبل الموعد بـ... أيام'}
                </span>
                <span className="block text-xs font-normal text-gray-500">
                  اتركها فارغة لو مفيش مهلة محددة.
                </span>
              </label>
              {cancellationRefundNoticeFieldError ? (
                <p className="mt-1 text-xs font-bold text-[var(--sloty-danger)]">
                  {cancellationRefundNoticeFieldError}
                </p>
              ) : null}
            </div>

            {/* مدة الفترة الواحدة */}
            <div>
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
                <p className="mt-1 text-xs font-bold text-[var(--sloty-danger)]">
                  {slotDurationFieldError}
                </p>
              ) : null}
            </div>

            {/* مدة انتظار الحجز بدون العربون */}
            <div>
              <label className="block space-y-2">
                <AppSelect
                  label="مدة انتظار الحجز بدون العربون"
                  onChange={(value) =>
                    updateField('internal_hold_expiry_hours', value)
                  }
                  options={holdExpiryOptions}
                  value={formState.internal_hold_expiry_hours}
                />

                <span className="block text-xs font-normal text-gray-500">
                  لو العربون متدفعش خلال المدة دي، الحجز هيتلغي تلقائيًا.
                </span>
              </label>
              {holdExpiryFieldError ? (
                <p className="mt-1 text-xs font-bold text-[var(--sloty-danger)]">
                  {holdExpiryFieldError}
                </p>
              ) : null}
            </div>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                checked={formState.is_active}
                onChange={(event) => updateField('is_active', event.target.checked)}
                type="checkbox"
              />
              الملعب نشط
            </label>

            <label className="flex items-start gap-3 text-sm font-semibold lg:col-span-2">
              <input
                checked={formState.requires_digital_payment_reference}
                className="mt-1"
                onChange={(event) =>
                  updateField(
                    'requires_digital_payment_reference',
                    event.target.checked,
                  )
                }
                type="checkbox"
              />
              <span>
                <span className="block">
                  {settingsCopy.requireDigitalPaymentReference}
                </span>
                <span className="mt-1 block text-xs font-bold leading-5 text-[var(--sloty-text-muted)]">
                  {settingsCopy.requireDigitalPaymentReferenceHelper}
                </span>
              </span>
            </label>

            <label className="space-y-2 text-sm font-semibold lg:col-span-2">
              <span>ملاحظات</span>
              <textarea
                className={textareaClass}
                onChange={(event) => updateField('notes', event.target.value)}
                value={formState.notes}
              />
            </label>

            {/* صورة الملعب — one primary image; Backend owns processing and storage */}
            <div className="space-y-2 lg:col-span-2">
              <label
                className="block text-sm font-semibold"
                htmlFor="court-image"
              >
                صورة الملعب
              </label>
              {imagePreviewUrl ? (
                <img
                  alt={
                    selectedImage
                      ? 'الصورة الجديدة للملعب'
                      : 'الصورة الحالية للملعب'
                  }
                  className="aspect-video w-full max-w-xs rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] object-cover"
                  src={imagePreviewUrl}
                />
              ) : null}
              {currentImageLoadFailed && !selectedImage ? (
                <p className="text-xs text-[var(--sloty-text-muted)]">
                  تعذر تحميل الصورة الحالية للملعب.
                </p>
              ) : null}
              <input
                accept="image/*"
                aria-describedby="court-image-helper"
                className="block w-full text-base text-[var(--sloty-text-muted)] file:me-3 file:rounded-lg file:border file:border-[var(--sloty-border)] file:bg-[var(--sloty-surface)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--sloty-text-primary)] disabled:opacity-60 sm:text-sm"
                disabled={isSubmitting}
                id="court-image"
                onChange={handleImageChange}
                ref={imageInputRef}
                type="file"
              />
              <p
                className="text-xs font-normal text-gray-500"
                id="court-image-helper"
              >
                اختر صورة واضحة للملعب
              </p>
              {imageFieldError ? (
                <p className="mt-1 text-xs font-bold text-[var(--sloty-danger)]">
                  {imageFieldError}
                </p>
              ) : null}
            </div>

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
