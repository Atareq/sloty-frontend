import { useEffect, useMemo, useState } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import {
  createCourtWorkingHour,
  listCourtWorkingHours,
  updateCourtWorkingHour,
} from '../../courtWorkingHoursApi'
import type {
  CourtWorkingHour,
  CourtWorkingHourPayload,
  Weekday,
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
    is_closed: false,
  }
}

function createInitialDrafts(): Record<Weekday, WorkingHourDraft> {
  return weekdays.reduce(
    (drafts, weekday) => ({
      ...drafts,
      [weekday]: createEmptyDraft(),
    }),
    {} as Record<Weekday, WorkingHourDraft>,
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
 * Court working-hours setup for the platform-admin court edit flow.
 *
 * The backend list endpoint is club-scoped, so this component filters records
 * client-side by the current court id and saves each weekday independently.
 */
export function CourtWorkingHoursSection({
  clubSlug,
  courtId,
  isCreateMode,
}: CourtWorkingHoursSectionProps) {
  const numericCourtId = Number(courtId)
  const canLoadWorkingHours =
    Boolean(clubSlug && courtId) && Number.isFinite(numericCourtId)
  const [records, setRecords] = useState<CourtWorkingHour[]>([])
  const [drafts, setDrafts] =
    useState<Record<Weekday, WorkingHourDraft>>(createInitialDrafts)
  const [isLoading, setIsLoading] = useState(canLoadWorkingHours && !isCreateMode)
  const [savingWeekday, setSavingWeekday] = useState<Weekday | null>(null)
  const [error, setError] = useState<string | null>(
    canLoadWorkingHours || isCreateMode ? null : 'رابط الملعب غير صحيح',
  )
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const recordsByWeekday = useMemo(() => {
    return records.reduce(
      (mappedRecords, record) => ({
        ...mappedRecords,
        [record.weekday]: record,
      }),
      {} as Partial<Record<Weekday, CourtWorkingHour>>,
    )
  }, [records])

  useEffect(() => {
    if (isCreateMode || !canLoadWorkingHours || !clubSlug) {
      return
    }

    let isActive = true
    const currentClubSlug = clubSlug

    async function loadWorkingHours(): Promise<void> {
      setIsLoading(true)
      setError(null)

      try {
        const response = await listCourtWorkingHours(currentClubSlug)
        const courtRecords = response.results.filter(
          (record) => record.court === numericCourtId,
        )

        if (isActive) {
          setRecords(courtRecords)
          setDrafts((currentDrafts) => {
            const nextDrafts = { ...currentDrafts }

            courtRecords.forEach((record) => {
              nextDrafts[record.weekday] = draftFromRecord(record)
            })

            return nextDrafts
          })
        }
      } catch {
        if (isActive) {
          setError('تعذر تحميل ساعات العمل')
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
    weekday: Weekday,
    field: keyof WorkingHourDraft,
    value: string | boolean,
  ): void {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [weekday]: {
        ...currentDrafts[weekday],
        [field]: value,
      },
    }))
  }

  async function handleSave(weekday: Weekday): Promise<void> {
    if (!clubSlug || !canLoadWorkingHours) {
      setError('رابط الملعب غير صحيح')
      return
    }

    const draft = drafts[weekday]

    if (!draft.is_closed && (!draft.opens_at || !draft.closes_at)) {
      setError('وقت الفتح والإغلاق مطلوبان عند تفعيل اليوم')
      setSuccessMessage(null)
      return
    }

    const payload: CourtWorkingHourPayload = {
      court: numericCourtId,
      weekday,
      opens_at: draft.is_closed ? null : draft.opens_at,
      closes_at: draft.is_closed ? null : draft.closes_at,
      is_closed: draft.is_closed,
    }
    const existingRecord = recordsByWeekday[weekday]

    setSavingWeekday(weekday)
    setError(null)
    setSuccessMessage(null)

    try {
      const savedRecord = existingRecord
        ? await updateCourtWorkingHour(clubSlug, existingRecord.id, payload)
        : await createCourtWorkingHour(clubSlug, payload)

      setRecords((currentRecords) => {
        const otherRecords = currentRecords.filter(
          (record) => record.weekday !== savedRecord.weekday,
        )

        return [...otherRecords, savedRecord].sort(
          (firstRecord, secondRecord) =>
            firstRecord.weekday - secondRecord.weekday,
        )
      })
      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [savedRecord.weekday]: draftFromRecord(savedRecord),
      }))
      setSuccessMessage('تم حفظ ساعات العمل')
    } catch {
      setError('تعذر حفظ ساعات العمل')
    } finally {
      setSavingWeekday(null)
    }
  }

  if (isCreateMode) {
    return (
      <AppCard>
        <p className="text-sm font-semibold text-[var(--sloty-text-primary)]">
          احفظ بيانات الملعب أولاً ثم أضف ساعات العمل.
        </p>
      </AppCard>
    )
  }

  return (
    <AppCard className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
          ساعات العمل
        </h2>
        <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
          اضبط مواعيد كل يوم لهذا الملعب فقط. لا يتم إنشاء حجوزات أو خانات
          حقيقية من هذه البيانات في هذه الخطوة.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--sloty-text-muted)]">
          جاري تحميل ساعات العمل...
        </p>
      ) : null}

      {!isLoading && records.length === 0 ? (
        <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm text-[var(--sloty-text-muted)]">
          لم يتم ضبط ساعات عمل لهذا الملعب بعد.
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
          const isSaving = savingWeekday === weekday

          return (
            <div
              className="grid gap-3 rounded-2xl border border-[var(--sloty-border)] bg-white p-3 sm:grid-cols-[minmax(7rem,1fr)_auto_auto_auto] sm:items-end"
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

              <AppButton
                disabled={isSaving}
                onClick={() => void handleSave(weekday)}
                variant="secondary"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ'}
              </AppButton>
            </div>
          )
        })}
      </div>
    </AppCard>
  )
}
