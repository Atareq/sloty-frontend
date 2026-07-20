import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  getApiErrorMessage,
  getApiFieldErrors,
  getFirstFieldErrorMessage,
} from '../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../core/api/apiClient'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { SlotyPhoneNumberInput } from '../../../shared/components/PhoneNumberInput/PhoneNumberInput'
import { isValidSlotyPhoneNumber } from '../../../shared/validation/phone'
import { fetchEgyptLocations } from '../../locations/egyptLocationsApi'
import { findGovernorateByCode } from '../../locations/egyptLocations.helpers'
import type { EgyptLocationsResponse } from '../../locations/egyptLocations.types'
import { createClub, getClub, updateClub } from '../clubsApi'
import {
  buildClubPayload,
  type ClubFormState,
} from './clubForm.helpers'

const initialFormState: ClubFormState = {
  name: '',
  slug: '',
  governorate: '',
  city: '',
  address: '',
  phone_number: undefined,
  notes: '',
  is_active: true,
}

const inputClass =
  'h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15'
const selectClass =
  'h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15 disabled:cursor-not-allowed disabled:opacity-60'
const textareaClass =
  'min-h-24 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-2 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15'

/**
 * Create/edit form for the minimal club setup contract.
 *
 * It does not parse memberships or create owner assignment flows; those belong
 * to later user-management work.
 */
export function ClubFormPage() {
  const navigate = useNavigate()
  const { clubId } = useParams()
  const isCreateMode = !clubId
  const [formState, setFormState] = useState<ClubFormState>(initialFormState)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [isLoading, setIsLoading] = useState(!isCreateMode)
  const [locations, setLocations] = useState<EgyptLocationsResponse | null>(
    null,
  )
  const [locationsError, setLocationsError] = useState<string | null>(null)
  const [isLocationsLoading, setIsLocationsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const selectedGovernorate = findGovernorateByCode(
    locations,
    formState.governorate,
  )
  const title = useMemo(
    () => (isCreateMode ? 'إضافة نادي' : 'تعديل النادي'),
    [isCreateMode],
  )
  const nameFieldError = getFirstFieldErrorMessage(fieldErrors, 'name')
  const slugFieldError = getFirstFieldErrorMessage(fieldErrors, 'slug')
  const governorateFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'governorate',
  )
  const cityFieldError = getFirstFieldErrorMessage(fieldErrors, 'city')
  const addressFieldError = getFirstFieldErrorMessage(fieldErrors, 'address')
  const phoneFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'phone_number',
  )

  useEffect(() => {
    let isActive = true

    async function loadLocations(): Promise<void> {
      setIsLocationsLoading(true)
      setLocationsError(null)

      try {
        const response = await fetchEgyptLocations()

        if (isActive) {
          setLocations(response)
        }
      } catch (error) {
        if (isActive) {
          setLocations(null)
          setLocationsError(
            getApiErrorMessage(error, 'تعذر تحميل المحافظات والمدن'),
          )
        }
      } finally {
        if (isActive) {
          setIsLocationsLoading(false)
        }
      }
    }

    void loadLocations()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (isCreateMode || !clubId) {
      return
    }

    let isActive = true
    const currentClubId = clubId

    async function loadClub(): Promise<void> {
      setIsLoading(true)
      setError(null)
      setFieldErrors(null)

      try {
        const club = await getClub(currentClubId)

        if (isActive) {
          setFormState({
            name: club.name,
            slug: club.slug,
            governorate: club.governorate ?? '',
            city: club.city,
            address: club.address ?? '',
            phone_number: club.phone_number,
            notes: club.notes ?? '',
            is_active: club.is_active,
          })
        }
      } catch (error) {
        if (isActive) {
          setError(getApiErrorMessage(error, 'تعذر تحميل بيانات النادي'))
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadClub()

    return () => {
      isActive = false
    }
  }, [clubId, isCreateMode])

  function updateField(field: keyof ClubFormState, value: string | boolean): void {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
    setFieldErrors(null)
  }

  function handleGovernorateChange(governorateCode: string): void {
    setFormState((current) => ({
      ...current,
      governorate: governorateCode,
      city: '',
    }))
    setFieldErrors(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (
      !formState.name.trim() ||
      !formState.governorate ||
      !formState.city
    ) {
      setError('اسم النادي والمحافظة والمدينة/المركز مطلوبة')
      setFieldErrors(null)
      return
    }

    if (
      formState.phone_number &&
      !isValidSlotyPhoneNumber(formState.phone_number)
    ) {
      setError('رقم هاتف النادي غير صحيح')
      setFieldErrors(null)
      return
    }

    setError(null)
    setFieldErrors(null)
    setIsSubmitting(true)

    try {
      const payload = buildClubPayload(formState, isCreateMode)
      const savedClub =
        isCreateMode || !clubId
          ? await createClub(payload)
          : await updateClub(clubId, payload)

      navigate(isCreateMode ? '/admin/clubs' : `/admin/clubs/${savedClub.id}`)
    } catch (error) {
      setError(getApiErrorMessage(error, 'تعذر حفظ بيانات النادي'))
      setFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        tone="brand"
        actions={
          <Link
            className="w-full sm:w-auto"
            to="/admin/clubs"
          >
            <AppButton fullWidth variant="secondary">
              العودة للأندية
            </AppButton>
          </Link>
        }
        description="بيانات النادي الأساسية."
        title={title}
      />
      <AppCard>
        {isLoading || isLocationsLoading ? (
          <p className="text-sm text-[var(--sloty-text-muted)]">
            {isLocationsLoading
              ? 'جاري تحميل المحافظات والمدن...'
              : 'جاري تحميل بيانات النادي...'}
          </p>
        ) : (
          <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
            <label className="space-y-2 text-sm font-semibold">
              <span>اسم النادي</span>
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

            {isCreateMode ? (
              <label className="space-y-2 text-sm font-semibold">
                <span>slug</span>
                <input
                  className={inputClass}
                  dir="ltr"
                  onChange={(event) => updateField('slug', event.target.value)}
                  value={formState.slug}
                />
              </label>
            ) : null}
            {isCreateMode && slugFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {slugFieldError}
              </p>
            ) : null}

            <label className="space-y-2 text-sm font-semibold">
              <span>المحافظة</span>
              <select
                className={selectClass}
                onChange={(event) =>
                  handleGovernorateChange(event.target.value)
                }
                value={formState.governorate}
              >
                <option value="">اختر المحافظة</option>
                {locations?.governorates.map((governorate) => (
                  <option key={governorate.code} value={governorate.code}>
                    {governorate.name_ar}
                  </option>
                ))}
              </select>
            </label>
            {governorateFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {governorateFieldError}
              </p>
            ) : null}

            <label className="space-y-2 text-sm font-semibold">
              <span>المدينة/المركز</span>
              <select
                className={selectClass}
                disabled={!formState.governorate || !selectedGovernorate}
                onChange={(event) => updateField('city', event.target.value)}
                value={formState.city}
              >
                <option value="">اختر المدينة/المركز</option>
                {selectedGovernorate?.cities.map((city) => (
                  <option key={city.code} value={city.code}>
                    {city.name_ar}
                  </option>
                ))}
              </select>
              {selectedGovernorate &&
              selectedGovernorate.cities.length === 0 ? (
                <span className="block text-xs font-bold text-[var(--sloty-text-muted)]">
                  لا توجد مدن أو مراكز مسجلة لهذه المحافظة
                </span>
              ) : null}
            </label>
            {cityFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {cityFieldError}
              </p>
            ) : null}

            <label className="space-y-2 text-sm font-semibold lg:col-span-2">
              <span>العنوان</span>
              <input
                className={inputClass}
                onChange={(event) => updateField('address', event.target.value)}
                value={formState.address}
              />
            </label>
            {addressFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)] lg:col-span-2">
                {addressFieldError}
              </p>
            ) : null}

            <div className="space-y-2 text-sm font-semibold">
              <span>رقم الهاتف</span>
              <SlotyPhoneNumberInput
                error={
                  error === 'رقم هاتف النادي غير صحيح' ||
                  Boolean(phoneFieldError)
                }
                disabled={isSubmitting}
                onChange={(value) => {
                  setFormState((current) => ({
                    ...current,
                    phone_number: value,
                  }))
                  setFieldErrors(null)
                }}
                value={formState.phone_number}
              />
            </div>
            {phoneFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {phoneFieldError}
              </p>
            ) : null}

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                checked={formState.is_active}
                onChange={(event) => updateField('is_active', event.target.checked)}
                type="checkbox"
              />
              النادي نشط
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

            {locationsError ? (
              <p className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--sloty-danger)] lg:col-span-2">
                {locationsError}
              </p>
            ) : null}

            <div className="lg:col-span-2">
              <AppButton disabled={isSubmitting} type="submit">
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ النادي'}
              </AppButton>
            </div>
          </form>
        )}
      </AppCard>
    </div>
  )
}
