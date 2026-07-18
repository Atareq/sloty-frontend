import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
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
import {
  doBlocksOverlap,
  getWeekdayLabel,
  isSameDayValidBlock,
  minutesToTime,
  normalizeTimeString,
  sortBlocksByStartTime,
  timeToMinutes,
  weekdays,
} from './courtWorkingHours.helpers'

export interface WorkingHourBlockDraft {
  localId: string
  start_time: string
  end_time: string
}

interface WorkingHourDraft {
  is_closed: boolean
  blocks: WorkingHourBlockDraft[]
}

export interface CourtWorkingHoursSectionProps {
  clubSlug?: string
  courtId?: string
  isCreateMode: boolean
  canEdit?: boolean
}

const timeInputClass =
  'h-10 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15 disabled:cursor-not-allowed disabled:opacity-50'

function createBlockDraft(
  weekday: CourtWeekday,
  index: number,
  startTime = '08:00',
  endTime = '09:00',
): WorkingHourBlockDraft {
  return {
    localId: `${weekday}-${index}-${startTime}-${endTime}`,
    start_time: normalizeTimeString(startTime),
    end_time: normalizeTimeString(endTime),
  }
}

function createClosedDraft(): WorkingHourDraft {
  return {
    is_closed: true,
    blocks: [],
  }
}

function createInitialDrafts(): Record<CourtWeekday, WorkingHourDraft> {
  return weekdays.reduce(
    (drafts, weekday) => ({
      ...drafts,
      [weekday]: createClosedDraft(),
    }),
    {} as Record<CourtWeekday, WorkingHourDraft>,
  )
}

function getNextDefaultBlock(
  weekday: CourtWeekday,
  blocks: WorkingHourBlockDraft[],
): WorkingHourBlockDraft {
  const sortedBlocks = sortBlocksByStartTime(blocks)
  const lastBlock = sortedBlocks[sortedBlocks.length - 1]

  if (!lastBlock) {
    return createBlockDraft(weekday, 0)
  }

  const lastEndMinutes = timeToMinutes(lastBlock.end_time)

  if (!Number.isFinite(lastEndMinutes) || lastEndMinutes >= 23 * 60) {
    return createBlockDraft(weekday, blocks.length)
  }

  const startMinutes = lastEndMinutes
  const endMinutes = startMinutes + 60

  return {
    localId: `new-${Date.now()}-${blocks.length}`,
    start_time: minutesToTime(startMinutes),
    end_time: minutesToTime(endMinutes),
  }
}

function draftFromRecord(record: CourtWorkingHour): WorkingHourDraft {
  const blocks = sortBlocksByStartTime(
    (Array.isArray(record.blocks) ? record.blocks : []).map((block, index) =>
      createBlockDraft(record.weekday, index, block.start_time, block.end_time),
    ),
  )

  return {
    is_closed: record.is_closed,
    blocks: record.is_closed ? [] : blocks,
  }
}

function getDayValidationMessage(draft: WorkingHourDraft): string | null {
  if (draft.is_closed) {
    return null
  }

  if (draft.blocks.length === 0) {
    return 'أضف فترة عمل واحدة على الأقل'
  }

  const missingStartBlock = draft.blocks.find((block) => !block.start_time)

  if (missingStartBlock) {
    return 'وقت البداية مطلوب'
  }

  const missingEndBlock = draft.blocks.find((block) => !block.end_time)

  if (missingEndBlock) {
    return 'وقت النهاية مطلوب'
  }

  const invalidBlock = draft.blocks.find((block) => !isSameDayValidBlock(block))

  if (invalidBlock) {
    return 'وقت النهاية يجب أن يكون بعد وقت البداية في نفس اليوم'
  }

  if (doBlocksOverlap(draft.blocks)) {
    return 'لا يمكن تداخل فترات العمل في نفس اليوم'
  }

  return null
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
  const navigate = useNavigate()
  const numericCourtId = Number(courtId)
  const canLoadWorkingHours =
    Boolean(clubSlug && courtId) && Number.isFinite(numericCourtId)
  const [drafts, setDrafts] =
    useState<Record<CourtWeekday, WorkingHourDraft>>(createInitialDrafts)
  const [lastSavedDrafts, setLastSavedDrafts] =
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
        is_closed: draft.is_closed,
        blocks: draft.is_closed
          ? []
          : sortBlocksByStartTime(draft.blocks).map((block) => ({
              start_time: normalizeTimeString(block.start_time),
              end_time: normalizeTimeString(block.end_time),
            })),
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
          const nextDrafts = createInitialDrafts()

          response.working_hours.forEach((record) => {
            nextDrafts[record.weekday] = draftFromRecord(record)
          })

          setDrafts(nextDrafts)
          setLastSavedDrafts(nextDrafts)
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

  function resetMessages(): void {
    setError(null)
    setSuccessMessage(null)
  }

  function updateDraft(
    weekday: CourtWeekday,
    nextDraft: Partial<WorkingHourDraft>,
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
    resetMessages()
  }

  function setDayState(weekday: CourtWeekday, isClosed: boolean): void {
    const defaultBlock = createBlockDraft(weekday, 0)

    updateDraft(
      weekday,
      isClosed
        ? createClosedDraft()
        : {
            is_closed: false,
            blocks: [defaultBlock],
          },
    )
  }

  function addBlock(weekday: CourtWeekday): void {
    const nextBlock = getNextDefaultBlock(weekday, drafts[weekday].blocks)

    updateDraft(weekday, {
      is_closed: false,
      blocks: [...drafts[weekday].blocks, nextBlock],
    })
  }

  function updateBlock(
    weekday: CourtWeekday,
    localId: string,
    nextBlock: Partial<WorkingHourBlockDraft>,
  ): void {
    updateDraft(weekday, {
      blocks: drafts[weekday].blocks.map((block) =>
        block.localId === localId
          ? {
              ...block,
              ...nextBlock,
              ...(nextBlock.start_time
                ? { start_time: normalizeTimeString(nextBlock.start_time) }
                : {}),
              ...(nextBlock.end_time
                ? { end_time: normalizeTimeString(nextBlock.end_time) }
                : {}),
            }
          : block,
      ),
    })
  }

  function removeBlock(weekday: CourtWeekday, localId: string): void {
    const nextBlocks = drafts[weekday].blocks.filter(
      (block) => block.localId !== localId,
    )

    updateDraft(weekday, {
      blocks: nextBlocks,
    })
  }

  function applySaturdayToAllDays(): void {
    const saturdayDraft = drafts[5]

    setDrafts(
      weekdays.reduce((nextDrafts, weekday) => {
        const blocks = saturdayDraft.blocks.map((block, index) =>
          createBlockDraft(weekday, index, block.start_time, block.end_time),
        )

        return {
          ...nextDrafts,
          [weekday]: {
            is_closed: saturdayDraft.is_closed,
            blocks,
          },
        }
      }, {} as Record<CourtWeekday, WorkingHourDraft>),
    )
    setRowErrors({})
    resetMessages()
  }

  function setAllDaysClosed(isClosed: boolean): void {
    setDrafts(
      weekdays.reduce((nextDrafts, weekday) => {
        const block = createBlockDraft(weekday, 0)

        return {
          ...nextDrafts,
          [weekday]: isClosed
            ? createClosedDraft()
            : {
                is_closed: false,
                blocks: [block],
              },
        }
      }, {} as Record<CourtWeekday, WorkingHourDraft>),
    )
    setRowErrors({})
    resetMessages()
  }

  function resetChanges(): void {
    setDrafts(lastSavedDrafts)
    setRowErrors({})
    resetMessages()
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

    const nextErrors = weekdays.reduce(
      (errors, weekday) => {
        const message = getDayValidationMessage(drafts[weekday])

        return message
          ? {
              ...errors,
              [weekday]: message,
            }
          : errors
      },
      {} as Partial<Record<CourtWeekday, string>>,
    )
    const firstErrorWeekday = weekdays.find((weekday) => nextErrors[weekday])

    if (firstErrorWeekday !== undefined) {
      const message = nextErrors[firstErrorWeekday] ?? 'الفترة مكررة أو غير صحيحة'

      setRowErrors(nextErrors)
      setError(message)
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
      const nextDrafts = createInitialDrafts()

      response.working_hours.forEach((record) => {
        nextDrafts[record.weekday] = draftFromRecord(record)
      })

      setDrafts(nextDrafts)
      setLastSavedDrafts(nextDrafts)
      navigate('/dashboard', {
        state: { flashMessage: 'تم تحديث مواعيد العمل بنجاح' },
      })
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
          حدد فترات العمل لكل يوم. يمكن إضافة أكثر من فترة في اليوم الواحد.
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
            تطبيق السبت على باقي الأيام
          </AppButton>
          <AppButton onClick={() => setAllDaysClosed(false)} variant="secondary">
            فتح كل الأيام
          </AppButton>
          <AppButton onClick={() => setAllDaysClosed(true)} variant="secondary">
            إغلاق كل الأيام
          </AppButton>
          <AppButton onClick={resetChanges} variant="secondary">
            إلغاء التغييرات
          </AppButton>
        </div>
      ) : null}

      <div className="space-y-3">
        {weekdays.map((weekday) => {
          const draft = drafts[weekday]

          return (
            <div
              className="grid gap-4 rounded-2xl border border-[var(--sloty-border)] bg-white p-3 lg:grid-cols-[12rem_1fr] lg:items-start"
              key={weekday}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
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
                </div>
              </div>

              {draft.is_closed ? (
                <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
                  مغلق طوال اليوم
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-[var(--sloty-text-primary)]">
                      الفترات المختارة
                    </h3>
                    <AppButton
                      disabled={!canEdit}
                      onClick={() => addBlock(weekday)}
                      variant="secondary"
                    >
                      إضافة فترة
                    </AppButton>
                  </div>

                  {draft.blocks.length === 0 ? (
                    <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
                      أضف فترة عمل واحدة على الأقل
                    </p>
                  ) : null}

                  <div className="space-y-2">
                    {sortBlocksByStartTime(draft.blocks).map((block) => (
                      <div
                        className="grid gap-2 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-3 md:grid-cols-[1fr_1fr_auto]"
                        key={block.localId}
                      >
                        <label className="space-y-1 text-xs font-semibold text-[var(--sloty-text-muted)]">
                          <span>من</span>
                          <input
                            aria-label={`${getWeekdayLabel(weekday)} من`}
                            className={timeInputClass}
                            disabled={!canEdit}
                            onChange={(event) =>
                              updateBlock(weekday, block.localId, {
                                start_time: event.target.value,
                              })
                            }
                            type="time"
                            value={block.start_time}
                          />
                        </label>

                        <label className="space-y-1 text-xs font-semibold text-[var(--sloty-text-muted)]">
                          <span>إلى</span>
                          <input
                            aria-label={`${getWeekdayLabel(weekday)} إلى`}
                            className={timeInputClass}
                            disabled={!canEdit}
                            onChange={(event) =>
                              updateBlock(weekday, block.localId, {
                                end_time: event.target.value,
                              })
                            }
                            type="time"
                            value={block.end_time}
                          />
                        </label>

                        <div className="flex items-end">
                          <AppButton
                            disabled={!canEdit}
                            fullWidth
                            onClick={() => removeBlock(weekday, block.localId)}
                            variant="danger"
                          >
                            حذف الفترة
                          </AppButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
