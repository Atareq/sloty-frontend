import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { createClub, getClub, updateClub } from '../clubsApi'
import type { ClubPayload } from '../clubs.types'

interface ClubFormState {
  name: string
  slug: string
  city: string
  area: string
  address: string
  phone_number: string
  notes: string
  is_active: boolean
  manager_can_settle_transactions: boolean
  manager_can_change_pricing: boolean
}

const initialFormState: ClubFormState = {
  name: '',
  slug: '',
  city: '',
  area: '',
  address: '',
  phone_number: '',
  notes: '',
  is_active: true,
  manager_can_settle_transactions: false,
  manager_can_change_pricing: false,
}

const inputClass =
  'h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15'
const textareaClass =
  'min-h-24 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-2 text-right text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15'

function optionalText(value: string): string | undefined {
  const trimmedValue = value.trim()
  return trimmedValue ? trimmedValue : undefined
}

function buildPayload(formState: ClubFormState, isCreateMode: boolean): ClubPayload {
  return {
    name: formState.name.trim(),
    ...(isCreateMode ? { slug: optionalText(formState.slug) } : {}),
    city: formState.city.trim(),
    area: formState.area.trim(),
    address: optionalText(formState.address),
    phone_number: optionalText(formState.phone_number),
    notes: optionalText(formState.notes),
    is_active: formState.is_active,
    manager_can_settle_transactions:
      formState.manager_can_settle_transactions,
    manager_can_change_pricing: formState.manager_can_change_pricing,
  }
}

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
  const [isLoading, setIsLoading] = useState(!isCreateMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const title = useMemo(
    () => (isCreateMode ? 'إضافة نادي' : 'تعديل النادي'),
    [isCreateMode],
  )

  useEffect(() => {
    if (isCreateMode || !clubId) {
      return
    }

    let isActive = true
    const currentClubId = clubId

    async function loadClub(): Promise<void> {
      setIsLoading(true)
      setError(null)

      try {
        const club = await getClub(currentClubId)

        if (isActive) {
          setFormState({
            name: club.name,
            slug: club.slug,
            city: club.city,
            area: club.area,
            address: club.address ?? '',
            phone_number: club.phone_number ?? '',
            notes: club.notes ?? '',
            is_active: club.is_active,
            manager_can_settle_transactions:
              club.manager_can_settle_transactions,
            manager_can_change_pricing: club.manager_can_change_pricing,
          })
        }
      } catch {
        if (isActive) {
          setError('تعذر تحميل بيانات النادي')
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
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!formState.name.trim() || !formState.city.trim() || !formState.area.trim()) {
      setError('اسم النادي والمدينة والمنطقة مطلوبة')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const payload = buildPayload(formState, isCreateMode)
      const savedClub =
        isCreateMode || !clubId
          ? await createClub(payload)
          : await updateClub(clubId, payload)

      navigate(isCreateMode ? '/admin/clubs' : `/admin/clubs/${savedClub.id}`)
    } catch {
      setError('تعذر حفظ بيانات النادي')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <Link to="/admin/clubs">
            <AppButton variant="secondary">العودة للأندية</AppButton>
          </Link>
        }
        description="بيانات النادي الأساسية وأعلام صلاحيات المدير."
        title={title}
      />

      <AppCard>
        {isLoading ? (
          <p className="text-sm text-[var(--sloty-text-muted)]">
            جاري تحميل بيانات النادي...
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

            <label className="space-y-2 text-sm font-semibold">
              <span>المدينة</span>
              <input
                className={inputClass}
                onChange={(event) => updateField('city', event.target.value)}
                value={formState.city}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>المنطقة</span>
              <input
                className={inputClass}
                onChange={(event) => updateField('area', event.target.value)}
                value={formState.area}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold lg:col-span-2">
              <span>العنوان</span>
              <input
                className={inputClass}
                onChange={(event) => updateField('address', event.target.value)}
                value={formState.address}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>رقم الهاتف</span>
              <input
                className={inputClass}
                inputMode="tel"
                onChange={(event) =>
                  updateField('phone_number', event.target.value)
                }
                value={formState.phone_number}
              />
            </label>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                checked={formState.is_active}
                onChange={(event) => updateField('is_active', event.target.checked)}
                type="checkbox"
              />
              النادي نشط
            </label>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                checked={formState.manager_can_settle_transactions}
                onChange={(event) =>
                  updateField(
                    'manager_can_settle_transactions',
                    event.target.checked,
                  )
                }
                type="checkbox"
              />
              المدير يمكنه تسوية المعاملات
            </label>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                checked={formState.manager_can_change_pricing}
                onChange={(event) =>
                  updateField('manager_can_change_pricing', event.target.checked)
                }
                type="checkbox"
              />
              المدير يمكنه تغيير التسعير
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
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ النادي'}
              </AppButton>
            </div>
          </form>
        )}
      </AppCard>
    </div>
  )
}
