import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getApiErrorMessage,
  getApiFieldErrors,
  getFirstFieldErrorMessage,
  isApiClientError,
} from '../../../../core/api/apiError.helpers'
import { useAuth } from '../../../../core/auth/useAuth'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../../shared/components/AppCard/AppCard'
import { AppSelect } from '../../../../shared/components/AppSelect/AppSelect'
import { settingsCopy } from '../../../../shared/copy/appCopy'
import {
  PricingPeriodsEditor,
  type PricingPeriodDraft,
} from '../PricingPeriodsEditor/PricingPeriodsEditor'
import {
  getCourtWorkingHours,
  saveCourtWorkingHours,
} from '../../courtWorkingHoursApi'
import type {
  CourtWorkingDay,
  CourtWorkingDayPayload,
  CourtWeekday,
} from '../../courtWorkingHours.types'
import {
  areTimesAlignedToSlotDuration,
  doPricingPeriodsOverlap,
  getWeekdayLabel,
  isTimeRangeOrdered,
  normalizeTimeString,
  sortPeriodsByStartTime,
  toApiTimeString,
  weekdays,
} from './courtWorkingHours.helpers'

interface WorkingDayDraft {
  weekday: CourtWeekday
  pricing_periods: PricingPeriodDraft[]
}

export interface CourtWorkingHoursSectionProps {
  clubSlug?: string
  courtId?: string
  isCreateMode: boolean
  canEdit?: boolean
  slotDurationMinutes?: number
}

let nextLocalId = 0

function createLocalId(prefix = 'period'): string {
  nextLocalId += 1

  return `${prefix}-${Date.now()}-${nextLocalId}`
}

function createPricingPeriodDraft(
  index: number,
  startsAt = '',
  endsAt = '',
  price = '',
): PricingPeriodDraft {
  return {
    localId: createLocalId(`period-${index}`),
    starts_at: startsAt ? normalizeTimeString(startsAt) : '',
    ends_at: endsAt ? normalizeTimeString(endsAt) : '',
    price,
  }
}

function createClosedDayDraft(weekday: CourtWeekday): WorkingDayDraft {
  return {
    weekday,
    pricing_periods: [],
  }
}

function createInitialDrafts(): Record<CourtWeekday, WorkingDayDraft> {
  return weekdays.reduce(
    (drafts, weekday) => ({
      ...drafts,
      [weekday]: createClosedDayDraft(weekday),
    }),
    {} as Record<CourtWeekday, WorkingDayDraft>,
  )
}

function clonePeriods(
  periods: PricingPeriodDraft[],
): PricingPeriodDraft[] {
  return periods.map((period, index) =>
    createPricingPeriodDraft(
      index,
      period.starts_at,
      period.ends_at,
      period.price,
    ),
  )
}

function draftFromRecord(record: CourtWorkingDay): WorkingDayDraft {
  return {
    weekday: record.weekday,
    pricing_periods: sortPeriodsByStartTime(
      record.pricing_periods.map((period, index) =>
        createPricingPeriodDraft(
          index,
          period.starts_at,
          period.ends_at,
          period.price,
        ),
      ),
    ),
  }
}

function buildDraftsFromRecords(
  records: CourtWorkingDay[],
): Record<CourtWeekday, WorkingDayDraft> {
  const nextDrafts = createInitialDrafts()

  records.forEach((record) => {
    nextDrafts[record.weekday] = draftFromRecord(record)
  })

  return nextDrafts
}

interface DayValidationResult {
  dayMessage: string | null
  periodErrors: Record<string, string>
}

function getDayValidationResult(
  draft: WorkingDayDraft,
  slotDurationMinutes?: number,
): DayValidationResult {
  const periodErrors: Record<string, string> = {}

  if (draft.pricing_periods.length === 0) {
    return { dayMessage: null, periodErrors }
  }

  for (const period of draft.pricing_periods) {
    if (!period.starts_at || !period.ends_at) {
      periodErrors[period.localId] = 'وقت بداية ونهاية فترة العمل مطلوبان'
      continue
    }

    if (!period.price) {
      periodErrors[period.localId] = 'السعر مطلوب'
      continue
    }

    const numericPrice = Number(period.price)

    if (!Number.isFinite(numericPrice)) {
      periodErrors[period.localId] = 'السعر يجب أن يكون رقمًا'
      continue
    }

    if (numericPrice < 0) {
      periodErrors[period.localId] = 'السعر لا يمكن أن يكون أقل من صفر'
      continue
    }

    if (!isTimeRangeOrdered(period)) {
      periodErrors[period.localId] =
        'وقت نهاية فترة العمل يجب أن يكون بعد وقت البداية'
      continue
    }

    if (
      !areTimesAlignedToSlotDuration(
        [period.starts_at, period.ends_at],
        slotDurationMinutes,
      )
    ) {
      periodErrors[period.localId] =
        'يجب أن تتوافق حدود فترات العمل والأسعار مع مدة الحجز'
    }
  }

  if (Object.keys(periodErrors).length > 0) {
    return { dayMessage: Object.values(periodErrors)[0] ?? null, periodErrors }
  }

  if (doPricingPeriodsOverlap(draft.pricing_periods)) {
    return {
      dayMessage: 'لا يمكن أن تتداخل فترات العمل والأسعار.',
      periodErrors,
    }
  }

  return { dayMessage: null, periodErrors }
}

function buildDayPayload(draft: WorkingDayDraft): CourtWorkingDayPayload {
  return {
    weekday: draft.weekday,
    pricing_periods: sortPeriodsByStartTime(draft.pricing_periods).map(
      (period) => ({
        starts_at: toApiTimeString(period.starts_at),
        ends_at: toApiTimeString(period.ends_at),
        price: period.price,
      }),
    ),
  }
}

/**
 * Court weekly work-and-pricing setup for one selected court.
 *
 * Each period defines both availability and price. Empty days are closed, and
 * backend slot generation remains the source of availability and slot prices.
 */
export function CourtWorkingHoursSection({
  clubSlug,
  courtId,
  canEdit = true,
  isCreateMode,
  slotDurationMinutes,
}: CourtWorkingHoursSectionProps) {
  const { refreshCurrentUser } = useAuth()
  const numericCourtId = Number(courtId)
  const canLoadWorkingHours =
    Boolean(clubSlug && courtId) && Number.isFinite(numericCourtId)
  const dayEditorRef = useRef<HTMLDivElement>(null)
  const [selectedWeekday, setSelectedWeekday] = useState<CourtWeekday>(5)
  const [drafts, setDrafts] =
    useState<Record<CourtWeekday, WorkingDayDraft>>(createInitialDrafts)
  const [lastSavedDrafts, setLastSavedDrafts] =
    useState<Record<CourtWeekday, WorkingDayDraft>>(createInitialDrafts)
  const [isLoading, setIsLoading] = useState(canLoadWorkingHours && !isCreateMode)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(
    canLoadWorkingHours || isCreateMode ? null : 'رابط الملعب غير صحيح',
  )
  const [rowErrors, setRowErrors] = useState<
    Partial<Record<CourtWeekday, string>>
  >({})
  const [periodErrors, setPeriodErrors] = useState<
    Partial<Record<CourtWeekday, Record<string, string>>>
  >({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const weeklyPayload = useMemo(
    () => weekdays.map((weekday) => buildDayPayload(drafts[weekday])),
    [drafts],
  )

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
          const nextDrafts = buildDraftsFromRecords(response.working_hours)

          setDrafts(nextDrafts)
          setLastSavedDrafts(nextDrafts)
        }
      } catch (error) {
        if (isActive) {
          setError(getApiErrorMessage(error, 'تعذر تحميل فترات العمل والأسعار'))
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

  function resetMessages(): void {
    setError(null)
    setSuccessMessage(null)
  }

  function updateDraft(
    weekday: CourtWeekday,
    nextDraft: Partial<WorkingDayDraft>,
  ): void {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [weekday]: {
        ...currentDrafts[weekday],
        ...nextDraft,
      },
    }))
    setRowErrors((currentErrors) => ({
      ...currentErrors,
      [weekday]: undefined,
    }))
    setPeriodErrors((currentErrors) => ({
      ...currentErrors,
      [weekday]: undefined,
    }))
    resetMessages()
  }

  function openDay(weekday: CourtWeekday): void {
    updateDraft(weekday, {
      pricing_periods: [createPricingPeriodDraft(0)],
    })
  }

  function closeDay(weekday: CourtWeekday): void {
    updateDraft(weekday, {
      pricing_periods: [],
    })
  }

  function addPricingPeriod(weekday: CourtWeekday): void {
    const draft = drafts[weekday]
    const sortedPeriods = sortPeriodsByStartTime(draft.pricing_periods)
    const lastPeriod = sortedPeriods[sortedPeriods.length - 1]

    updateDraft(weekday, {
      pricing_periods: [
        ...draft.pricing_periods,
        createPricingPeriodDraft(
          draft.pricing_periods.length,
          lastPeriod?.ends_at ?? '',
        ),
      ],
    })
  }

  function updatePricingPeriod(
    weekday: CourtWeekday,
    localId: string,
    nextPeriod: Partial<Omit<PricingPeriodDraft, 'localId'>>,
  ): void {
    updateDraft(weekday, {
      pricing_periods: drafts[weekday].pricing_periods.map((period) =>
        period.localId === localId
          ? {
              ...period,
              ...nextPeriod,
              ...(nextPeriod.starts_at !== undefined
                ? { starts_at: normalizeTimeString(nextPeriod.starts_at) }
                : {}),
              ...(nextPeriod.ends_at !== undefined
                ? { ends_at: normalizeTimeString(nextPeriod.ends_at) }
                : {}),
            }
          : period,
      ),
    })
  }

  function removePricingPeriod(weekday: CourtWeekday, localId: string): void {
    updateDraft(weekday, {
      pricing_periods: drafts[weekday].pricing_periods.filter(
        (period) => period.localId !== localId,
      ),
    })
  }

  function copySelectedDayToRest(): void {
    const sourceDraft = drafts[selectedWeekday]

    setDrafts(
      weekdays.reduce((nextDrafts, weekday) => {
        return {
          ...nextDrafts,
          [weekday]: {
            weekday,
            pricing_periods: clonePeriods(sourceDraft.pricing_periods),
          },
        }
      }, {} as Record<CourtWeekday, WorkingDayDraft>),
    )
    setRowErrors({})
    setPeriodErrors({})
    resetMessages()
  }

  function closeAllDays(): void {
    setDrafts(createInitialDrafts())
    setRowErrors({})
    setPeriodErrors({})
    resetMessages()
  }

  function resetChanges(): void {
    setDrafts(lastSavedDrafts)
    setRowErrors({})
    setPeriodErrors({})
    resetMessages()
  }

  async function handleSave(): Promise<void> {
    if (!clubSlug || !canLoadWorkingHours) {
      setError('رابط الملعب غير صحيح')
      return
    }

    if (!canEdit) {
      setError('ليس لديك صلاحية تعديل فترات العمل والأسعار.')
      return
    }

    const nextErrors = weekdays.reduce(
      (errors, weekday) => {
        const { dayMessage } = getDayValidationResult(
          drafts[weekday],
          slotDurationMinutes,
        )

        return dayMessage
          ? {
              ...errors,
              [weekday]: dayMessage,
            }
          : errors
      },
      {} as Partial<Record<CourtWeekday, string>>,
    )
    const nextPeriodErrors = weekdays.reduce(
      (errors, weekday) => {
        const { periodErrors } = getDayValidationResult(
          drafts[weekday],
          slotDurationMinutes,
        )

        return Object.keys(periodErrors).length > 0
          ? {
              ...errors,
              [weekday]: periodErrors,
            }
          : errors
      },
      {} as Partial<Record<CourtWeekday, Record<string, string>>>,
    )
    const firstErrorWeekday = weekdays.find((weekday) => nextErrors[weekday])

    if (firstErrorWeekday !== undefined) {
      setSelectedWeekday(firstErrorWeekday)
      setRowErrors(nextErrors)
      setPeriodErrors(nextPeriodErrors)
      setError(settingsCopy.workingHoursSaveSummary)
      setSuccessMessage(null)
      window.requestAnimationFrame(() => {
        dayEditorRef.current?.scrollIntoView?.({
          block: 'nearest',
          behavior: 'smooth',
        })

        const firstInvalidPeriodId = Object.keys(
          nextPeriodErrors[firstErrorWeekday] ?? {},
        )[0]
        const firstInvalidMessage =
          nextPeriodErrors[firstErrorWeekday]?.[firstInvalidPeriodId] ?? ''

        if (!firstInvalidPeriodId) {
          return
        }

        const startsField = document.getElementById(
          `working-hours-period-${firstInvalidPeriodId}-starts`,
        )
        const endsField = document.getElementById(
          `working-hours-period-${firstInvalidPeriodId}-ends`,
        )
        const priceField = document.getElementById(
          `working-hours-period-${firstInvalidPeriodId}-price`,
        )
        const field = firstInvalidMessage.includes('سعر')
          ? priceField
          : firstInvalidMessage.includes('نهاية')
            ? endsField
            : startsField ?? priceField

        field?.focus()
      })
      return
    }

    setIsSaving(true)
    setError(null)
    setRowErrors({})
    setPeriodErrors({})
    setSuccessMessage(null)

    try {
      const response = await saveCourtWorkingHours(clubSlug, numericCourtId, {
        working_hours: weeklyPayload,
      })
      const nextDrafts = buildDraftsFromRecords(response.working_hours)

      setDrafts(nextDrafts)
      setLastSavedDrafts(nextDrafts)
      setSuccessMessage('تم تحديث مواعيد العمل بنجاح')
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error)
      const backendFieldMessage =
        getFirstFieldErrorMessage(fieldErrors, 'working_hours') ??
        getFirstFieldErrorMessage(fieldErrors, 'pricing_periods')

      setError(
        backendFieldMessage ??
          getApiErrorMessage(error, 'تعذر حفظ فترات العمل والأسعار'),
      )

      if (isApiClientError(error) && error.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (isCreateMode) {
    return (
      <AppCard>
        <p className="text-sm font-semibold text-[var(--sloty-text-primary)]">
          يمكن ضبط فترات العمل والأسعار بعد إنشاء الملعب
        </p>
      </AppCard>
    )
  }

  return (
    <AppCard className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
          فترات العمل والأسعار
        </h2>
        <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
          كل فترة تعني أن الملعب متاح للحجز خلالها بهذا السعر. أي وقت خارج
          الفترات يكون غير متاح.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--sloty-text-muted)]">
          جاري تحميل فترات العمل والأسعار...
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
          ليس لديك صلاحية تعديل فترات العمل والأسعار.
        </p>
      ) : null}

      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <AppButton onClick={copySelectedDayToRest} variant="secondary">
            {settingsCopy.copyDayToRest(getWeekdayLabel(selectedWeekday))}
          </AppButton>
          <AppButton onClick={closeAllDays} variant="secondary">
            إغلاق كل الأيام
          </AppButton>
          <AppButton onClick={resetChanges} variant="secondary">
            إلغاء التغييرات
          </AppButton>
        </div>
      ) : null}

      <AppSelect
        label="اليوم"
        onChange={(value) => setSelectedWeekday(Number(value) as CourtWeekday)}
        options={weekdays.map((weekday) => ({
          value: String(weekday),
          label: getWeekdayLabel(weekday),
        }))}
        value={String(selectedWeekday)}
      />

      {(() => {
        const draft = drafts[selectedWeekday]
        const isClosed = draft.pricing_periods.length === 0

        return (
          <div
            className="grid gap-4 rounded-2xl border border-[var(--sloty-border)] bg-white p-3 lg:grid-cols-[12rem_1fr] lg:items-start"
            ref={dayEditorRef}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-bold">
                  <span className="block text-[var(--sloty-text-primary)]">
                    {getWeekdayLabel(selectedWeekday)}
                  </span>
                  <span
                    className={[
                      'mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black',
                      isClosed
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]',
                    ].join(' ')}
                  >
                    {isClosed ? 'مغلق' : 'مفتوح'}
                  </span>
                  {rowErrors[selectedWeekday] ? (
                    <span className="mt-2 block text-xs text-[var(--sloty-danger)]">
                      {rowErrors[selectedWeekday]}
                    </span>
                  ) : null}
                </div>

                {isClosed ? (
                  <AppButton
                    disabled={!canEdit}
                    onClick={() => openDay(selectedWeekday)}
                    type="button"
                    variant="secondary"
                  >
                    فتح اليوم
                  </AppButton>
                ) : (
                  <AppButton
                    disabled={!canEdit}
                    onClick={() => closeDay(selectedWeekday)}
                    type="button"
                    variant="secondary"
                  >
                    إغلاق اليوم
                  </AppButton>
                )}
              </div>
            </div>

            {isClosed ? (
              <div className="space-y-3">
                <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
                  لا توجد فترات عمل لهذا اليوم.
                </p>
              </div>
            ) : (
              <PricingPeriodsEditor
                disabled={!canEdit}
                errors={periodErrors[selectedWeekday]}
                onAdd={() => addPricingPeriod(selectedWeekday)}
                onRemove={(localId) =>
                  removePricingPeriod(selectedWeekday, localId)
                }
                onUpdate={(localId, nextPeriod) =>
                  updatePricingPeriod(selectedWeekday, localId, nextPeriod)
                }
                periods={draft.pricing_periods}
              />
            )}
          </div>
        )
      })()}

      <div className="flex flex-col gap-2 sm:flex-row">
        <AppButton
          disabled={isSaving || isLoading || !canEdit}
          onClick={() => void handleSave()}
        >
          {isSaving ? 'جاري الحفظ...' : 'حفظ مواعيد الأسبوع'}
        </AppButton>
      </div>
    </AppCard>
  )
}
