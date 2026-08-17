import { AppButton } from '../../../../shared/components/AppButton/AppButton'

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

const timeInputClass =
  'h-10 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15 disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Presentational work-and-price period rows used inside the Court settings
 * card. API loading and save state stay owned by CourtWorkingHoursSection.
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-[var(--sloty-text-primary)]">
          فترات العمل والأسعار
        </h3>
        <AppButton disabled={disabled} onClick={onAdd} variant="secondary">
          + إضافة فترة
        </AppButton>
      </div>

      {periods.length === 0 ? (
        <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
          لا توجد فترات عمل لهذا اليوم.
        </p>
      ) : null}

      <div className="space-y-2">
        {periods.map((period, index) => (
          <div
            className="grid gap-2 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
            key={period.localId}
          >
            <label className="space-y-1 text-xs font-semibold text-[var(--sloty-text-muted)]">
              <span>من</span>
              <input
                aria-label={`فترة العمل ${index + 1} من`}
                className={timeInputClass}
                disabled={disabled}
                onChange={(event) =>
                  onUpdate(period.localId, { starts_at: event.target.value })
                }
                type="time"
                value={period.starts_at}
              />
            </label>

            <label className="space-y-1 text-xs font-semibold text-[var(--sloty-text-muted)]">
              <span>إلى</span>
              <input
                aria-label={`فترة العمل ${index + 1} إلى`}
                className={timeInputClass}
                disabled={disabled}
                onChange={(event) =>
                  onUpdate(period.localId, { ends_at: event.target.value })
                }
                type="time"
                value={period.ends_at}
              />
            </label>

            <label className="space-y-1 text-xs font-semibold text-[var(--sloty-text-muted)]">
              <span>السعر</span>
              <input
                aria-label={`فترة العمل ${index + 1} السعر`}
                className={timeInputClass}
                disabled={disabled}
                min="0"
                onChange={(event) =>
                  onUpdate(period.localId, { price: event.target.value })
                }
                type="number"
                value={period.price}
              />
            </label>

            <div className="flex items-end">
              <AppButton
                disabled={disabled}
                fullWidth
                onClick={() => onRemove(period.localId)}
                variant="danger"
              >
                حذف الفترة
              </AppButton>
            </div>

            {errors[period.localId] ? (
              <p className="text-xs font-bold text-[var(--sloty-danger)] md:col-span-4">
                {errors[period.localId]}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
