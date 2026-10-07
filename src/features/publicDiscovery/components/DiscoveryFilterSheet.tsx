import { useMemo } from 'react'
import {
  DayButton as DayPickerDayButton,
  DayPicker,
  getDefaultClassNames,
  type DayButtonProps,
} from '@daypicker/react'
import { arSA } from '@daypicker/react/locale'
import '@daypicker/react/style.css'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../shared/components/AppSheet/AppSheet'
import {
  addDays,
  formatArabicCompactDay,
  formatArabicDateWithWeekday,
  formatDateInputValue,
  getRollingDateValues,
} from '../../../shared/utils/date'
import { getEgyptToday } from '../../publicSchedule/publicSchedule.helpers'
import { formatTime12Hour } from '../../schedule/scheduleBoard.helpers'
import { courtDiscoveryCopy } from '../publicDiscovery.copy'
import { MAX_DISCOVERY_SELECTED_TIMES } from '../publicDiscovery.types'
import { DiscoveryClearSelectionButton } from './DiscoveryClearSelectionButton'

export type DiscoveryFilterSheetMode = 'day' | 'day-then-times' | 'times' | null

export interface DiscoveryFilterSheetProps {
  mode: DiscoveryFilterSheetMode
  selectedDate: string | null
  selectedTimes: readonly string[]
  onSelectDate: (date: string) => void
  onToggleTime: (time: string) => void
  /** Clears the day and its times; the sheet stays open. */
  onClearDate: () => void
  /** Clears all selected times and keeps the day; the sheet stays open. */
  onClearTimes: () => void
  onSwitchMode: (mode: DiscoveryFilterSheetMode) => void
  onClose: () => void
}

const dayPickerClassNames = getDefaultClassNames()
const DISCOVERY_DATE_WINDOW_DAYS = 31

const DISCOVERY_MORNING_TIMES: readonly string[] = Array.from(
  { length: 12 },
  (_, hour) => `${String(hour).padStart(2, '0')}:00`,
)

const DISCOVERY_EVENING_TIMES: readonly string[] = Array.from(
  { length: 12 },
  (_, hour) => `${String(hour + 12).padStart(2, '0')}:00`,
)

const schedulePeriodStyles = {
  am: {
    section:
      'border-amber-100/70 bg-amber-50/50 shadow-amber-950/5 ring-1 ring-amber-200/60',
    header:
      'border-amber-100/80 bg-white/90 text-amber-950 shadow-amber-950/5',
    kicker: 'text-amber-700',
  },
  pm: {
    section:
      'border-slate-300/35 bg-slate-900/80 shadow-slate-950/20 ring-1 ring-white/15',
    header:
      'border-slate-300/30 bg-slate-950/40 text-white shadow-slate-950/15',
    kicker: 'text-slate-200',
  },
} as const

function toValidDate(value: string | null | undefined, fallback: Date): Date {
  if (!value) {
    return fallback
  }

  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

function SlotyDiscoveryDayButton(props: DayButtonProps) {
  const { day, modifiers, ...buttonProps } = props

  const className = [
    'relative flex h-10 w-10 items-center justify-center',
    'rounded-xl border border-transparent',
    'text-sm font-black',
    'transition-colors duration-150',
    'focus-visible:outline-none',
    'focus-visible:ring-[var(--sloty-primary)]/25',
    modifiers.selected
      ? 'sloty-green-surface-button text-white'
      : 'text-[var(--sloty-text-primary)] hover:bg-[var(--sloty-soft-mint)]',
    modifiers.today && !modifiers.selected
      ? 'border-amber-400 bg-amber-100 text-amber-500 hover:bg-amber-50'
      : '',
    modifiers.outside ? 'opacity-30' : '',
    modifiers.disabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <DayPickerDayButton
      {...buttonProps}
      className={className}
      day={day}
      modifiers={modifiers}
    >
      <span>{day.date.getDate()}</span>
    </DayPickerDayButton>
  )
}

interface DiscoveryTimeSlotButtonProps {
  time: string
  isSelected: boolean
  isDisabled: boolean
  onToggle: (time: string) => void
}

/**
 * Time-slot button reusing the Sloty Schedule slot visual language
 * (`PublicSlotCard` / `BookingCard`) for discovery filtering only.
 */
function DiscoveryTimeSlotButton({
  time,
  isSelected,
  isDisabled,
  onToggle,
}: DiscoveryTimeSlotButtonProps) {
  const displayStartTime = formatTime12Hour(time)
  const secondaryLabel = isSelected ? courtDiscoveryCopy.slotSelectedLabel : time
  const accessibleLabel = `${displayStartTime} ${time}`

  return (
    <button
      aria-disabled={isDisabled ? 'true' : undefined}
      aria-label={accessibleLabel}
      aria-pressed={isSelected}
      className={[
        'relative flex min-h-16 w-full max-w-[88px] flex-col items-center justify-center justify-self-center rounded-xl border-2 px-1.5 py-2 text-center font-black shadow-lg transition focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-[var(--sloty-primary-dark)] sm:max-w-[96px] md:min-h-20 md:max-w-[108px]',
        isSelected
          ? 'cursor-pointer sloty-green-surface-button border-[var(--sloty-primary-dark)] text-white shadow-emerald-900/20 hover:-translate-y-0.5 hover:bg-[var(--sloty-primary-dark)]'
          : isDisabled
            ? 'cursor-not-allowed border-slate-300 bg-slate-100 text-[var(--sloty-text-muted)] opacity-70 shadow-slate-950/10'
            : 'cursor-pointer border-[#22C55E] bg-white text-[var(--sloty-primary-dark)] shadow-white/30 hover:-translate-y-0.5 hover:bg-[var(--sloty-soft-mint)]',
      ].join(' ')}
      data-testid={`discovery-time-slot-${time}`}
      disabled={isDisabled}
      onClick={() => {
        if (!isDisabled) {
          onToggle(time)
        }
      }}
      type="button"
    >
      <span className="text-sm md:text-base" dir="ltr">
        {displayStartTime}
      </span>
      <span className="mt-1 text-[10px] leading-tight sm:text-xs" dir="ltr">
        {secondaryLabel}
      </span>
    </button>
  )
}

/**
 * Modal / bottom-sheet for Phase 2 day and time selection.
 *
 * - Day selection (`mode === 'day'` or `'day-then-times'`): single-tap day
 *   selection using Sloty's rolling 7-day strip and calendar.
 * - Time selection (`mode === 'times'`): reuses the Schedule morning/evening
 *   slot visual language with a maximum of 5 selectable times.
 * - Every pick applies immediately; `×` only closes. The sticky footer's
 *   `مسح الاختيار` clears the current step (day, or times).
 */
export function DiscoveryFilterSheet({
  mode,
  selectedDate,
  selectedTimes,
  onSelectDate,
  onToggleTime,
  onClearDate,
  onClearTimes,
  onSwitchMode,
  onClose,
}: DiscoveryFilterSheetProps) {
  const isOpen = mode !== null
  const isTimeStep = mode === 'times' && selectedDate !== null

  const todayDate = useMemo(() => getEgyptToday(), [])
  const minDateValue = useMemo(
    () => formatDateInputValue(todayDate),
    [todayDate],
  )
  const maxDateValue = useMemo(
    () => formatDateInputValue(addDays(todayDate, DISCOVERY_DATE_WINDOW_DAYS - 1)),
    [todayDate],
  )
  const quickDateValues = useMemo(
    () => getRollingDateValues(todayDate, 7),
    [todayDate],
  )

  const selectedDateObj = useMemo(
    () => toValidDate(selectedDate, todayDate),
    [selectedDate, todayDate],
  )

  const isMaxTimesReached =
    selectedTimes.length >= MAX_DISCOVERY_SELECTED_TIMES

  function handlePickDate(dateValue: string): void {
    if (dateValue < minDateValue || dateValue > maxDateValue) {
      return
    }

    onSelectDate(dateValue)

    if (mode === 'day-then-times') {
      onSwitchMode('times')
    } else {
      onClose()
    }
  }

  function handleCalendarSelect(nextDate: Date | undefined): void {
    if (!nextDate) {
      return
    }

    handlePickDate(formatDateInputValue(nextDate))
  }

  if (!isOpen) {
    return null
  }

  const sheetTitle = isTimeStep
    ? courtDiscoveryCopy.chooseTimes
    : courtDiscoveryCopy.chooseDay

  return (
    <AppSheet
      className={isTimeStep ? 'md:max-w-2xl' : 'md:max-w-md'}
      footer={
        isTimeStep ? (
          <DiscoveryClearSelectionButton
            disabled={selectedTimes.length === 0}
            onClear={onClearTimes}
          />
        ) : (
          <DiscoveryClearSelectionButton
            disabled={selectedDate === null}
            onClear={onClearDate}
          />
        )
      }
      isOpen={isOpen}
      onRequestClose={onClose}
      title={sheetTitle}
    >
      {isTimeStep && selectedDate ? (
        <div className="space-y-4 p-4 sm:p-5" dir="rtl">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--sloty-text-primary)]">
              <CalendarDays
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-[var(--sloty-primary)]"
              />
              <span>{formatArabicDateWithWeekday(selectedDate)}</span>
            </div>
            <button
              className="text-xs font-bold text-[var(--sloty-primary)] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/30"
              onClick={() => onSwitchMode('day-then-times')}
              type="button"
            >
              {courtDiscoveryCopy.changeDayAction}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
              {isMaxTimesReached
                ? courtDiscoveryCopy.fiveTimesSelected
                : courtDiscoveryCopy.timeSelectionHint}
            </p>
            {selectedTimes.length > 0 ? (
              <span
                className="text-xs font-black text-[var(--sloty-primary-dark)]"
                dir="ltr"
              >
                {selectedTimes.join(' • ')}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Morning Period */}
            <div
              className={[
                'rounded-3xl border p-3 shadow-sm sm:p-4',
                schedulePeriodStyles.am.section,
              ].join(' ')}
              data-testid="discovery-time-period-am"
            >
              <div
                className={[
                  'mb-3 rounded-2xl border px-3 py-2 shadow-sm',
                  schedulePeriodStyles.am.header,
                ].join(' ')}
              >
                <p
                  className={[
                    'text-xs font-black',
                    schedulePeriodStyles.am.kicker,
                  ].join(' ')}
                >
                  {courtDiscoveryCopy.morningPeriodKicker}
                </p>
                <p className="mt-0.5 text-base font-black">
                  {courtDiscoveryCopy.morningPeriodTitle}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {DISCOVERY_MORNING_TIMES.map((time) => {
                  const isSelected = selectedTimes.includes(time)
                  const isDisabled = isMaxTimesReached && !isSelected

                  return (
                    <DiscoveryTimeSlotButton
                      isDisabled={isDisabled}
                      isSelected={isSelected}
                      key={time}
                      onToggle={onToggleTime}
                      time={time}
                    />
                  )
                })}
              </div>
            </div>

            {/* Evening Period */}
            <div
              className={[
                'rounded-3xl border p-3 shadow-sm sm:p-4',
                schedulePeriodStyles.pm.section,
              ].join(' ')}
              data-testid="discovery-time-period-pm"
            >
              <div
                className={[
                  'mb-3 rounded-2xl border px-3 py-2 shadow-sm',
                  schedulePeriodStyles.pm.header,
                ].join(' ')}
              >
                <p
                  className={[
                    'text-xs font-black',
                    schedulePeriodStyles.pm.kicker,
                  ].join(' ')}
                >
                  {courtDiscoveryCopy.eveningPeriodKicker}
                </p>
                <p className="mt-0.5 flex items-center justify-between text-base font-black">
                  <span>{courtDiscoveryCopy.eveningPeriodTitle}</span>
                  <span aria-hidden="true">🌙</span>
                </p>
              </div>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {DISCOVERY_EVENING_TIMES.map((time) => {
                  const isSelected = selectedTimes.includes(time)
                  const isDisabled = isMaxTimesReached && !isSelected

                  return (
                    <DiscoveryTimeSlotButton
                      isDisabled={isDisabled}
                      isSelected={isSelected}
                      key={time}
                      onToggle={onToggleTime}
                      time={time}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <AppButton
              className="w-full sm:w-auto"
              data-testid="discovery-time-sheet-done"
              onClick={onClose}
            >
              {courtDiscoveryCopy.doneSelectingTimes}
            </AppButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-4 sm:p-5" dir="rtl">
          {mode === 'day-then-times' ? (
            <p
              className="rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-soft-mint)] px-3.5 py-2.5 text-xs font-bold text-[var(--sloty-primary-dark)]"
              data-testid="discovery-choose-day-first-hint"
            >
              {courtDiscoveryCopy.chooseDayFirstHint}
            </p>
          ) : null}

          {/* Quick 7-day rolling selector */}
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-1.5">
              {quickDateValues.map((dateValue) => {
                const compact = formatArabicCompactDay(dateValue)
                const fullLabel = formatArabicDateWithWeekday(dateValue)
                const isSelected = selectedDate === dateValue

                return (
                  <button
                    aria-label={fullLabel}
                    aria-pressed={isSelected}
                    className={[
                      'flex h-[66px] min-w-[62px] cursor-pointer flex-col items-center justify-center rounded-2xl px-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sloty-primary)]/25',
                      isSelected
                        ? 'sloty-green-surface-button text-white shadow-sm'
                        : 'bg-[var(--sloty-bg)] text-[var(--sloty-text-muted)] hover:bg-[var(--sloty-soft-mint)] hover:text-[var(--sloty-text-primary)]',
                    ].join(' ')}
                    data-date={dateValue}
                    data-testid={`discovery-day-option-${dateValue}`}
                    key={dateValue}
                    onClick={() => handlePickDate(dateValue)}
                    type="button"
                  >
                    <span
                      className={[
                        'text-xs font-bold',
                        isSelected
                          ? 'text-white/85'
                          : 'text-[var(--sloty-text-muted)]',
                      ].join(' ')}
                    >
                      {compact.weekday}
                    </span>
                    <span className="mt-1 text-xl font-black">
                      {compact.day}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Full month calendar */}
          <DayPicker
            classNames={{
              root: `${dayPickerClassNames.root} w-full`,
              months: `${dayPickerClassNames.months} w-full`,
              month: `${dayPickerClassNames.month} w-full`,
              month_caption: `${dayPickerClassNames.month_caption} mb-4`,
              caption_label: `${dayPickerClassNames.caption_label} text-base font-black text-[var(--sloty-text-primary)]`,
              nav: `${dayPickerClassNames.nav} flex items-center gap-1.5`,
              button_previous: `${dayPickerClassNames.button_previous} flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] text-[var(--sloty-primary)] transition-colors duration-150 hover:bg-[var(--sloty-soft-mint)]`,
              button_next: `${dayPickerClassNames.button_next} flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] text-[var(--sloty-primary)] transition-colors duration-150 hover:bg-[var(--sloty-soft-mint)]`,
              month_grid: `${dayPickerClassNames.month_grid} w-full table-fixed border-collapse`,
              weekdays: dayPickerClassNames.weekdays,
              weekday: `${dayPickerClassNames.weekday} h-9 text-center text-xs font-bold text-[var(--sloty-text-muted)]`,
              week: dayPickerClassNames.week,
              day: `${dayPickerClassNames.day} h-11 p-0 text-center align-middle`,
              selected: dayPickerClassNames.selected,
              today: dayPickerClassNames.today,
              outside: dayPickerClassNames.outside,
              disabled: dayPickerClassNames.disabled,
              chevron: `${dayPickerClassNames.chevron} fill-none text-[var(--sloty-primary)]`,
            }}
            components={{
              DayButton: SlotyDiscoveryDayButton,
              Chevron: ({ className, orientation, size }) =>
                orientation === 'right' ? (
                  <ChevronRight
                    aria-hidden="true"
                    className={className}
                    size={size}
                    strokeWidth={1.8}
                  />
                ) : (
                  <ChevronLeft
                    aria-hidden="true"
                    className={className}
                    size={size}
                    strokeWidth={1.8}
                  />
                ),
            }}
            defaultMonth={selectedDateObj}
            dir="rtl"
            disabled={(date: Date) => {
              const dateStr = formatDateInputValue(date)
              return dateStr < minDateValue || dateStr > maxDateValue
            }}
            fixedWeeks
            locale={arSA}
            mode="single"
            onSelect={handleCalendarSelect}
            selected={selectedDate ? selectedDateObj : undefined}
          />
        </div>
      )}
    </AppSheet>
  )
}
