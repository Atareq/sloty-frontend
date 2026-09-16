import { AlertCircle, Clock, Plus, Trash2 } from 'lucide-react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { settingsCopy } from '../../../../shared/copy/appCopy'
import { formatTime12Hour } from '../../../schedule/scheduleBoard.helpers'
import { normalizeTimeString } from '../CourtWorkingHoursSection/courtWorkingHours.helpers'

export interface PricingPeriodDraft {
  localId: string
  starts_at: string
  ends_at: string
  price: string
}

export interface PricingPeriodsEditorProps {
  disabled?: boolean
  errors?: Record<string, string>
  periods: PricingPeriodDraft[]
  onAdd: () => void
  onRemove: (localId: string) => void
  onUpdate: (
    localId: string,
    nextPeriod: Partial<Omit<PricingPeriodDraft, 'localId'>>,
  ) => void
}

const inputClass =
  'h-10 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm font-semibold text-[var(--sloty-text-primary)] outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15 disabled:cursor-not-allowed disabled:opacity-50'

function formatPeriodSummary(
  startsAt: string,
  endsAt: string,
  price: string,
): string | null {
  if (!startsAt && !endsAt && !price) {
    return null
  }

  const parts: string[] = []

  if (startsAt && endsAt) {
    const formattedStart = formatTime12Hour(startsAt)
    const formattedEnd =
      normalizeTimeString(endsAt) === '00:00'
        ? '12:00 منتصف الليل'
        : formatTime12Hour(endsAt)
    parts.push(`من ${formattedStart} إلى ${formattedEnd}`)
  } else if (startsAt) {
    parts.push(`من ${formatTime12Hour(startsAt)}`)
  }

  if (price && Number(price) >= 0) {
    parts.push(`${price} ج.م`)
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * Modernized presentational work-and-price period cards used inside Court settings.
 * API loading, validation orchestration, and save state stay owned by CourtWorkingHoursSection.
 */
export function PricingPeriodsEditor({
  disabled = false,
  errors = {},
  onAdd,
  onRemove,
  onUpdate,
  periods,
}: PricingPeriodsEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-[var(--sloty-text-primary)]">
            فترات العمل والأسعار
          </h3>
          <p className="text-xs text-[var(--sloty-text-muted)]">
            حدد فترات إتاحة الملعب للحجز وسعر الساعة لكل فترة
          </p>
        </div>
        <span className="rounded-full border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-2.5 py-0.5 text-xs font-bold text-[var(--sloty-text-muted)]">
          {periods.length} {periods.length === 1 ? 'فترة' : 'فترات'}
        </span>
      </div>

      {periods.length === 0 ? (
        <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
          لا توجد فترات عمل لهذا اليوم.
        </p>
      ) : null}

      <div className="space-y-3">
        {periods.map((period, index) => {
          const hasError = Boolean(errors[period.localId])
          const summary = formatPeriodSummary(
            period.starts_at,
            period.ends_at,
            period.price,
          )

          return (
            <div
              className={[
                'group relative space-y-3 rounded-2xl border bg-white p-3.5 shadow-2xs transition-shadow hover:shadow-xs sm:p-4',
                hasError
                  ? 'border-[var(--sloty-danger)] ring-1 ring-[var(--sloty-danger)]/20'
                  : 'border-[var(--sloty-border)]',
              ].join(' ')}
              key={period.localId}
            >
              {/* Period Header: Index, Summary Pill & Delete */}
              <div className="flex items-center justify-between gap-2 border-b border-[var(--sloty-border)]/60 pb-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-6 shrink-0 items-center justify-center rounded-lg border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-2.5 text-xs font-black text-[var(--sloty-text-primary)]">
                    فترة {index + 1}
                  </span>
                  {summary ? (
                    <span className="truncate rounded-full bg-[var(--sloty-soft-mint)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--sloty-primary-dark)]">
                      {summary}
                    </span>
                  ) : null}
                </div>

                <AppButton
                  className="shrink-0 text-xs py-1 px-2.5"
                  disabled={disabled}
                  onClick={() => onRemove(period.localId)}
                  type="button"
                  variant="danger"
                >
                  <Trash2
                    aria-hidden="true"
                    className="ml-1 inline h-3.5 w-3.5"
                  />
                  حذف الفترة
                </AppButton>
              </div>

              {/* Period Inputs Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block space-y-1.5 text-xs font-bold text-[var(--sloty-text-muted)]">
                  <span className="flex items-center gap-1.5 text-[var(--sloty-text-primary)]">
                    <Clock className="h-3.5 w-3.5 text-[var(--sloty-text-muted)]" />
                    <span>من</span>
                  </span>
                  <input
                    aria-label={`فترة العمل ${index + 1} من`}
                    className={inputClass}
                    disabled={disabled}
                    id={`working-hours-period-${period.localId}-starts`}
                    onChange={(event) =>
                      onUpdate(period.localId, {
                        starts_at: event.target.value,
                      })
                    }
                    type="time"
                    value={period.starts_at}
                  />
                </label>

                <label className="block space-y-1.5 text-xs font-bold text-[var(--sloty-text-muted)]">
                  <span className="flex items-center gap-1.5 text-[var(--sloty-text-primary)]">
                    <Clock className="h-3.5 w-3.5 text-[var(--sloty-text-muted)]" />
                    <span>إلى</span>
                  </span>
                  <input
                    aria-label={`فترة العمل ${index + 1} إلى`}
                    className={inputClass}
                    disabled={disabled}
                    id={`working-hours-period-${period.localId}-ends`}
                    onChange={(event) =>
                      onUpdate(period.localId, { ends_at: event.target.value })
                    }
                    type="time"
                    value={period.ends_at}
                  />
                  {normalizeTimeString(period.ends_at) === '00:00' ? (
                    <span className="block text-[11px] font-normal text-[var(--sloty-text-muted)]">
                      00:00 تعني نهاية اليوم
                    </span>
                  ) : null}
                </label>

                <label className="block space-y-1.5 text-xs font-bold text-[var(--sloty-text-muted)]">
                  <span className="flex items-center gap-1.5 text-[var(--sloty-text-primary)]">
                    <span>السعر</span>
                  </span>
                  <div className="relative">
                    <input
                      aria-label={`فترة العمل ${index + 1} السعر`}
                      className={`${inputClass} pl-10`}
                      disabled={disabled}
                      id={`working-hours-period-${period.localId}-price`}
                      min="0"
                      onChange={(event) =>
                        onUpdate(period.localId, {
                          price: event.target.value,
                        })
                      }
                      placeholder="0"
                      type="number"
                      value={period.price}
                    />
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-black text-[var(--sloty-text-muted)]">
                      ج.م
                    </span>
                  </div>
                </label>
              </div>

              {/* Period Validation Error */}
              {errors[period.localId] ? (
                <div className="flex items-center gap-2 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-xs font-bold text-[var(--sloty-danger)]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errors[period.localId]}</span>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div>
        <AppButton
          className="w-full sm:w-auto"
          disabled={disabled}
          onClick={onAdd}
          type="button"
          variant="secondary"
        >
          <span className="inline-flex items-center gap-1.5 font-bold">
            <Plus aria-hidden="true" className="h-4 w-4" />
            {settingsCopy.addPricingPeriod}
          </span>
        </AppButton>
      </div>
    </div>
  )
}
