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
  canEdit?: boolean
}

const timeInputClass =
  'h-10 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15 disabled:cursor-not-allowed disabled:opacity-50'

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)

  return hours * 60 + minutes
}

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
  canEdit = true,
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
  const [rowErrors, setRowErrors] = useState<
    Partial<Record<CourtWeekday, string>>
  >({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const weeklyPayload = useMemo(() => {
    return weekdays.map((weekday): CourtWorkingHourPayload => {
      const draft = drafts[weekday]

      return {
        weekday,
        opens_at: draft.is_closed ? null : normalizeTime(draft.opens_at),
        closes_at: draft.is_closed ? null : normalizeTime(draft.closes_at),
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
    setRowErrors((currentErrors) => ({
      ...currentErrors,
      [weekday]: undefined,
    }))
    setError(null)
    setSuccessMessage(null)
  }

  function setDayState(weekday: CourtWeekday, isClosed: boolean): void {
    updateDraft(weekday, 'is_closed', isClosed)
  }

  function applySaturdayToAllDays(): void {
    const saturdayDraft = drafts[5]

    setDrafts(
      weekdays.reduce(
        (nextDrafts, weekday) => ({
          ...nextDrafts,
          [weekday]: { ...saturdayDraft },
        }),
        {} as Record<CourtWeekday, WorkingHourDraft>,
      ),
    )
    setRowErrors({})
    setError(null)
    setSuccessMessage(null)
  }

  function setAllDaysClosed(isClosed: boolean): void {
    setDrafts(
      weekdays.reduce(
        (nextDrafts, weekday) => ({
          ...nextDrafts,
          [weekday]: {
            opens_at: '',
            closes_at: '',
            is_closed: isClosed,
          },
        }),
        {} as Record<CourtWeekday, WorkingHourDraft>,
      ),
    )
    setRowErrors({})
    setError(null)
    setSuccessMessage(null)
  }

  async function handleSave(): Promise<void> {
    if (!clubSlug || !canLoadWorkingHours) {
      setError('رابط الملعب غير صحيح')
      return
    }

    if (!canEdit) {
      setError('ليس لديك صلاحية تعديل مواعيد العمل.')
      return
    }

    const invalidOpenDraft = weekdays.find(
      (weekday) => !drafts[weekday].is_closed && !drafts[weekday].opens_at,
    )

    if (invalidOpenDraft) {
      setRowErrors({ [invalidOpenDraft]: 'وقت الفتح مطلوب' })
      setError('وقت الفتح مطلوب')
      setSuccessMessage(null)
      return
    }

    const invalidCloseDraft = weekdays.find(
      (weekday) => !drafts[weekday].is_closed && !drafts[weekday].closes_at,
    )

    if (invalidCloseDraft) {
      setRowErrors({ [invalidCloseDraft]: 'وقت الإغلاق مطلوب' })
      setError('وقت الإغلاق مطلوب')
      setSuccessMessage(null)
      return
    }

    const invalidRangeDraft = weekdays.find((weekday) => {
      const draft = drafts[weekday]

      return (
        !draft.is_closed &&
        timeToMinutes(draft.closes_at) <= timeToMinutes(draft.opens_at)
      )
    })

    if (invalidRangeDraft) {
      setRowErrors({
        [invalidRangeDraft]: 'وقت الإغلاق يجب أن يكون بعد وقت الفتح',
      })
      setError('وقت الإغلاق يجب أن يكون بعد وقت الفتح')
      setSuccessMessage(null)
      return
    }

    setIsSaving(true)
    setError(null)
    setRowErrors({})
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

      {!canEdit ? (
        <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
          ليس لديك صلاحية تعديل مواعيد العمل.
        </p>
      ) : null}

      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <AppButton onClick={applySaturdayToAllDays} variant="secondary">
            تطبيق مواعيد السبت على باقي الأيام
          </AppButton>
          <AppButton onClick={() => setAllDaysClosed(false)} variant="secondary">
            فتح كل الأيام
          </AppButton>
          <AppButton onClick={() => setAllDaysClosed(true)} variant="secondary">
            إغلاق كل الأيام
          </AppButton>
        </div>
      ) : null}

      <div className="space-y-3">
        {weekdays.map((weekday) => {
          const draft = drafts[weekday]

          return (
            <div
              className="grid gap-3 rounded-2xl border border-[var(--sloty-border)] bg-white p-3 lg:grid-cols-[8rem_11rem_1fr_1fr] lg:items-end"
              key={weekday}
            >
              <div className="text-sm font-bold">
                <span className="block text-[var(--sloty-text-primary)]">
                  {getWeekdayLabel(weekday)}
                </span>
                {rowErrors[weekday] ? (
                  <span className="mt-1 block text-xs text-[var(--sloty-danger)]">
                    {rowErrors[weekday]}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-2 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-1">
                <button
                  className={[
                    'rounded-lg px-3 py-2 text-sm font-bold transition',
                    !draft.is_closed
                      ? 'sloty-green-surface-button text-white'
                      : 'text-[var(--sloty-text-muted)]',
                  ].join(' ')}
                  disabled={!canEdit}
                  onClick={() => setDayState(weekday, false)}
                  type="button"
                >
                  مفتوح
                </button>
                <button
                  className={[
                    'rounded-lg px-3 py-2 text-sm font-bold transition',
                    draft.is_closed
                      ? 'bg-slate-200 text-[var(--sloty-text-primary)]'
                      : 'text-[var(--sloty-text-muted)]',
                  ].join(' ')}
                  disabled={!canEdit}
                  onClick={() => setDayState(weekday, true)}
                  type="button"
                >
                  مغلق
                </button>
              </div>

              {draft.is_closed ? (
                <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)] lg:col-span-2">
                  مغلق طوال اليوم
                </p>
              ) : (
                <>
                  <label className="space-y-1 text-xs font-semibold text-[var(--sloty-text-muted)]">
                    <span>يفتح</span>
                    <input
                      className={timeInputClass}
                      disabled={!canEdit}
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
                      disabled={!canEdit}
                      onChange={(event) =>
                        updateDraft(weekday, 'closes_at', event.target.value)
                      }
                      type="time"
                      value={draft.closes_at}
                    />
                  </label>
                </>
              )}
            </div>
          )
        })}
      </div>

      <AppButton
        disabled={isSaving || isLoading || !canEdit}
        onClick={() => void handleSave()}
      >
        {isSaving ? 'جاري الحفظ...' : 'حفظ مواعيد الأسبوع'}
      </AppButton>
    </AppCard>
  )
}
