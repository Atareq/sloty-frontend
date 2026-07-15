import { useEffect, useMemo, useState } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import {
  getCourtWorkingHours,
  saveCourtWorkingHours,
} from '../../courtWorkingHoursApi'
import type {
  CourtWorkingHour,
  CourtWorkingHourPayload,
  CourtWeekday,
} from '../../courtWorkingHours.types'
import { getWeekdayLabel, weekdays } from './courtWorkingHours.helpers'

interface WorkingHourDraft {
  opens_at: string
  closes_at: string
  is_closed: boolean
}

export interface CourtWorkingHoursSectionProps {
  clubSlug?: string
  courtId?: string
  isCreateMode: boolean
}

const timeInputClass =
  'h-10 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15 disabled:cursor-not-allowed disabled:opacity-50'

function createEmptyDraft(): WorkingHourDraft {
  return {
    opens_at: '',
    closes_at: '',
    is_closed: true,
  }
}

function createInitialDrafts(): Record<CourtWeekday, WorkingHourDraft> {
  return weekdays.reduce(
    (drafts, weekday) => ({
      ...drafts,
      [weekday]: createEmptyDraft(),
    }),
    {} as Record<CourtWeekday, WorkingHourDraft>,
  )
}

function draftFromRecord(record: CourtWorkingHour): WorkingHourDraft {
  return {
    opens_at: record.opens_at ?? '',
    closes_at: record.closes_at ?? '',
    is_closed: record.is_closed,
  }
}

/**
 * Court weekly working-hours setup for one selected court.
 */
export function CourtWorkingHoursSection({
  clubSlug,
  courtId,
  isCreateMode,
}: CourtWorkingHoursSectionProps) {
  const numericCourtId = Number(courtId)
  const canLoadWorkingHours =
    Boolean(clubSlug && courtId) && Number.isFinite(numericCourtId)
  const [drafts, setDrafts] =
    useState<Record<CourtWeekday, WorkingHourDraft>>(createInitialDrafts)
  const [isLoading, setIsLoading] = useState(canLoadWorkingHours && !isCreateMode)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(
    canLoadWorkingHours || isCreateMode ? null : 'رابط الملعب غير صحيح',
  )
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const weeklyPayload = useMemo(() => {
    return weekdays.map((weekday): CourtWorkingHourPayload => {
      const draft = drafts[weekday]

      return {
        weekday,
        opens_at: draft.is_closed ? null : draft.opens_at,
        closes_at: draft.is_closed ? null : draft.closes_at,
        is_closed: draft.is_closed,
      }
    })
  }, [drafts])

  useEffect(() => {
    if (isCreateMode || !canLoadWorkingHours || !clubSlug) {
      return
    }

    let isActive = true
    const currentClubSlug = clubSlug
    const currentCourtId = numericCourtId

    async function loadWorkingHours(): Promise<void> {
      setIsLoading(true)
      setError(null)

      try {
        const response = await getCourtWorkingHours(
          currentClubSlug,
          currentCourtId,
        )

        if (isActive) {
          setDrafts(() => {
            const nextDrafts = createInitialDrafts()

            response.working_hours.forEach((record) => {
              nextDrafts[record.weekday] = draftFromRecord(record)
            })

            return nextDrafts
          })
        }
      } catch {
        if (isActive) {
          setError('تعذر تحميل مواعيد العمل')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadWorkingHours()

    return () => {
      isActive = false
    }
  }, [canLoadWorkingHours, clubSlug, isCreateMode, numericCourtId])

  function updateDraft(
    weekday: CourtWeekday,
    field: keyof WorkingHourDraft,
    value: string | boolean,
  ): void {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [weekday]: {
        ...currentDrafts[weekday],
        [field]: value,
        ...(field === 'is_closed' && value === true
          ? { opens_at: '', closes_at: '' }
          : {}),
      },
    }))
    setError(null)
    setSuccessMessage(null)
  }

  async function handleSave(): Promise<void> {
    if (!clubSlug || !canLoadWorkingHours) {
      setError('رابط الملعب غير صحيح')
      return
    }

    const invalidOpenDraft = weekdays.find(
      (weekday) => !drafts[weekday].is_closed && !drafts[weekday].opens_at,
    )

    if (invalidOpenDraft) {
      setError('وقت الفتح مطلوب')
      setSuccessMessage(null)
      return
    }

    const invalidCloseDraft = weekdays.find(
      (weekday) => !drafts[weekday].is_closed && !drafts[weekday].closes_at,
    )

    if (invalidCloseDraft) {
      setError('وقت الإغلاق مطلوب')
      setSuccessMessage(null)
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await saveCourtWorkingHours(clubSlug, numericCourtId, {
        working_hours: weeklyPayload,
      })

      setDrafts(() => {
        const nextDrafts = createInitialDrafts()

        response.working_hours.forEach((record) => {
          nextDrafts[record.weekday] = draftFromRecord(record)
        })

        return nextDrafts
      })
      setSuccessMessage('تم حفظ مواعيد العمل')
    } catch {
      setError('تعذر حفظ مواعيد العمل')
    } finally {
      setIsSaving(false)
    }
  }

  if (isCreateMode) {
    return (
      <AppCard>
        <p className="text-sm font-semibold text-[var(--sloty-text-primary)]">
          يمكن ضبط مواعيد العمل بعد إنشاء الملعب
        </p>
      </AppCard>
    )
  }

  return (
    <AppCard className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
          مواعيد العمل
        </h2>
        <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
          اضبط جدول الأسبوع المتكرر لهذا الملعب فقط. يتم حفظ الأسبوع كاملاً
          عند الضغط على زر الحفظ.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--sloty-text-muted)]">
          جاري تحميل مواعيد العمل...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--sloty-danger)]">
          {error}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-xl bg-[var(--sloty-soft-mint)] px-3 py-2 text-sm font-semibold text-[var(--sloty-primary-dark)]">
          {successMessage}
        </p>
      ) : null}

      <div className="space-y-3">
        {weekdays.map((weekday) => {
          const draft = drafts[weekday]

          return (
            <div
              className="grid gap-3 rounded-2xl border border-[var(--sloty-border)] bg-white p-3 sm:grid-cols-[minmax(7rem,1fr)_auto_auto] sm:items-end"
              key={weekday}
            >
              <label className="flex items-center justify-between gap-3 text-sm font-bold sm:block">
                <span className="block text-[var(--sloty-text-primary)]">
                  {getWeekdayLabel(weekday)}
                </span>
                <span className="flex items-center gap-2 text-xs text-[var(--sloty-text-muted)] sm:mt-2">
                  <input
                    checked={draft.is_closed}
                    onChange={(event) =>
                      updateDraft(weekday, 'is_closed', event.target.checked)
                    }
                    type="checkbox"
                  />
                  مغلق
                </span>
              </label>

              <label className="space-y-1 text-xs font-semibold text-[var(--sloty-text-muted)]">
                <span>يفتح</span>
                <input
                  className={timeInputClass}
                  disabled={draft.is_closed}
                  onChange={(event) =>
                    updateDraft(weekday, 'opens_at', event.target.value)
                  }
                  type="time"
                  value={draft.opens_at}
                />
              </label>

              <label className="space-y-1 text-xs font-semibold text-[var(--sloty-text-muted)]">
                <span>يغلق</span>
                <input
                  className={timeInputClass}
                  disabled={draft.is_closed}
                  onChange={(event) =>
                    updateDraft(weekday, 'closes_at', event.target.value)
                  }
                  type="time"
                  value={draft.closes_at}
                />
              </label>
            </div>
          )
        })}
      </div>

      <AppButton disabled={isSaving || isLoading} onClick={() => void handleSave()}>
        {isSaving ? 'جاري الحفظ...' : 'حفظ مواعيد الأسبوع'}
      </AppButton>
    </AppCard>
  )
}
