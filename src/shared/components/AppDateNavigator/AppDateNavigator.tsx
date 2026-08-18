import { useMemo, useState } from 'react'
import {
  DayButton as DayPickerDayButton,
  DayPicker,
  getDefaultClassNames,
  type DayButtonProps,
} from '@daypicker/react'
import { arSA } from '@daypicker/react/locale'
import '@daypicker/react/style.css'
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'

import {
  formatArabicCompactDay,
  formatDateInputValue,
  getRollingDateValues,
} from '../../utils/date'

export interface AppDateNavigatorProps {
  value: string
  onChange: (date: string) => void
  days?: number
}

const dayPickerClassNames = getDefaultClassNames()

function toValidDate(value: string | undefined): Date {
  const date = value ? new Date(`${value}T00:00:00`) : new Date()

  return Number.isNaN(date.getTime()) ? new Date() : date
}

function formatSelectedDateLabel(value: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(toValidDate(value))
}

/**
 * Sloty calendar day.
 *
 * The actual DayPicker button is reused so keyboard/focus/accessibility
 * behavior stays intact, while the visual state follows Sloty's design.
 */
function SlotyCalendarDayButton(props: DayButtonProps) {
  const { day, modifiers, ...buttonProps } = props

  const className = [
    'relative flex h-10 w-10 items-center justify-center',
    'rounded-xl border border-transparent',
    'text-sm font-black',
    'transition-colors duration-150',
    'focus-visible:outline-none',
    // 'focus-visible:ring-2',
    'focus-visible:ring-[var(--sloty-primary)]/25',

    modifiers.selected
      ? 'sloty-green-surface-button text-white'
      : 'text-[var(--sloty-text-primary)] hover:bg-[var(--sloty-soft-mint)]',

    // Today, when it is not selected:
    // reuse the exact HOLD / waiting-for-deposit palette.
    modifiers.today && !modifiers.selected
      ? 'border-amber-400 bg-amber-100 text-amber-500 hover:bg-amber-50'
      : '',

    modifiers.outside ? 'opacity-30' : '',

    modifiers.disabled
      ? 'cursor-not-allowed opacity-30'
      : 'cursor-pointer',
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

      {modifiers.today ? (
        <span
          aria-hidden="true"
          className={[
            'absolute right-1 top-1',
            // 'h-1.5 w-1.5 rounded-sm',
            'border border-amber-400',
            'bg-amber-100',
          ].join(' ')}
        />
      ) : null}
    </DayPickerDayButton>
  )
}

/**
 * Shared rolling date strip with an in-app calendar picker.
 *
 * Selecting a visible date changes only the selected day.
 * Selecting a date outside the visible range rebuilds the rolling range
 * from the newly selected date.
 */
export function AppDateNavigator({
  days = 7,
  onChange,
  value,
}: AppDateNavigatorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const [visibleStartValue, setVisibleStartValue] = useState(
    formatDateInputValue(toValidDate(value)),
  )

  const stateDateValues = useMemo(
    () => getRollingDateValues(toValidDate(visibleStartValue), days),
    [visibleStartValue, days],
  )

  const effectiveVisibleStartValue =
    value && !stateDateValues.includes(value)
      ? value
      : visibleStartValue

  const dateValues = useMemo(
    () =>
      getRollingDateValues(
        toValidDate(effectiveVisibleStartValue),
        days,
      ),
    [effectiveVisibleStartValue, days],
  )

  const selectedDate = toValidDate(value)

  const selectedDateLabel = formatSelectedDateLabel(
    value || formatDateInputValue(new Date()),
  )

  function handleDateClick(dateValue: string): void {
    setVisibleStartValue(effectiveVisibleStartValue)
    onChange(dateValue)
  }

  function handleCalendarChange(nextDate: Date | undefined): void {
    if (!nextDate) {
      return
    }

    const nextValue = formatDateInputValue(nextDate)

    // A date inside the current 7-day window changes selection only.
    // An outside date starts a new visible 7-day window.
    if (!dateValues.includes(nextValue)) {
      setVisibleStartValue(nextValue)
    }

    onChange(nextValue)
    setIsCalendarOpen(false)
  }

  return (
    <>
      <div className="space-y-3">
        {/* Rolling 7-day navigator */}
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-1.5">
            {dateValues.map((dateValue) => {
              const label = formatArabicCompactDay(dateValue)
              const isSelected = dateValue === value

              return (
                <button
                  aria-label={formatSelectedDateLabel(dateValue)}
                  aria-pressed={isSelected}
                  className={[
                    'flex h-[66px] min-w-[62px]',
                    'flex-col items-center justify-center',
                    'rounded-2xl px-3',
                    'transition-colors duration-150',
                    'focus-visible:outline-none',
                    'focus-visible:ring-2',
                    'focus-visible:ring-[var(--sloty-primary)]/25',
                    isSelected
                      ? 'sloty-green-surface-button text-white shadow-sm'
                      : [
                          'text-[var(--sloty-text-muted)]',
                          'hover:bg-[var(--sloty-bg)]',
                          'hover:text-[var(--sloty-text-primary)]',
                        ].join(' '),
                  ].join(' ')}
                  key={dateValue}
                  onClick={() => handleDateClick(dateValue)}
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
                    {label.weekday}
                  </span>

                  <span className="mt-1 text-xl font-black">
                    {label.day}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Fully clickable calendar trigger */}
        <button
          aria-label="فتح تقويم تاريخ الحجز"
          aria-expanded={isCalendarOpen}
          aria-haspopup="dialog"
          className={[
            'flex w-full items-center justify-between gap-3',
            'rounded-2xl',
            'border border-[var(--sloty-border)]',
            'bg-[var(--sloty-bg)]',
            'px-3 py-2.5',
            'text-right',
            'transition-colors duration-150',
            'hover:border-[var(--sloty-primary)]',
            'hover:bg-[var(--sloty-soft-mint)]',
            'focus-visible:outline-none',
            'focus-visible:ring-2',
            'focus-visible:ring-[var(--sloty-primary)]/20',
          ].join(' ')}
          onClick={() => setIsCalendarOpen(true)}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span
              className={[
                'flex h-10 w-10 shrink-0',
                'items-center justify-center',
                'rounded-xl',
                'bg-[var(--sloty-soft-mint)]',
                'text-[var(--sloty-primary)]',
              ].join(' ')}
            >
              <CalendarDays
                aria-hidden="true"
                className="h-5 w-5"
                strokeWidth={1.8}
              />
            </span>

            <span className="min-w-0">
              <span className="block text-xs font-bold text-[var(--sloty-text-muted)]">
                تاريخ الحجز
              </span>

              <span className="mt-0.5 block truncate text-sm font-black text-[var(--sloty-text-primary)]">
                {selectedDateLabel}
              </span>
            </span>
          </span>

          <ChevronDown
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-[var(--sloty-text-muted)]"
            strokeWidth={1.8}
          />
        </button>
      </div>

      {/* Mobile bottom sheet / desktop modal */}
      {isCalendarOpen ? (
        <div
          className={[
            'fixed inset-0 z-50',
            'flex items-end justify-center',
            'sm:items-center sm:p-4',
          ].join(' ')}
        >
          {/* Backdrop */}
          <button
            aria-label="إغلاق التقويم"
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsCalendarOpen(false)}
            type="button"
          />

          <div
            aria-label="اختيار تاريخ الحجز"
            aria-modal="true"
            className={[
              'relative z-10',
              'w-full',
              'rounded-t-[28px]',
              'border border-[var(--sloty-border)]',
              'bg-[var(--sloty-surface)]',
              'px-4 pb-6 pt-3',
              'shadow-[var(--sloty-shadow)]',
              'sm:max-w-sm',
              'sm:rounded-[28px]',
              'sm:p-5',
            ].join(' ')}
            dir="rtl"
            role="dialog"
          >
            {/* Mobile sheet indicator */}
            <div
              aria-hidden="true"
              className={[
                'mx-auto mb-3 h-1 w-10',
                'rounded-full',
                'bg-[var(--sloty-border)]',
                'sm:hidden',
              ].join(' ')}
            />

            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
                  اختر تاريخ الحجز
                </h2>

                <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
                  {selectedDateLabel}
                </p>
              </div>

              <button
                aria-label="إغلاق التقويم"
                className={[
                  'flex h-9 w-9 shrink-0',
                  'items-center justify-center',
                  'rounded-xl',
                  'text-[var(--sloty-text-muted)]',
                  'transition-colors duration-150',
                  'hover:bg-[var(--sloty-bg)]',
                  'hover:text-[var(--sloty-text-primary)]',
                  'focus-visible:outline-none',
                  'focus-visible:ring-2',
                  'focus-visible:ring-[var(--sloty-primary)]/20',
                ].join(' ')}
                onClick={() => setIsCalendarOpen(false)}
                type="button"
              >
                <X
                  aria-hidden="true"
                  className="h-5 w-5"
                  strokeWidth={1.8}
                />
              </button>
            </div>

            <DayPicker
              classNames={{
                root: `${dayPickerClassNames.root} w-full`,
                months: `${dayPickerClassNames.months} w-full`,
                month: `${dayPickerClassNames.month} w-full`,

                month_caption: [
                  dayPickerClassNames.month_caption,
                  'mb-4',
                ].join(' '),

                caption_label: [
                  dayPickerClassNames.caption_label,
                  'text-base font-black',
                  'text-[var(--sloty-text-primary)]',
                ].join(' '),

                nav: [
                  dayPickerClassNames.nav,
                  'flex items-center gap-1.5',
                ].join(' '),

                button_previous: [
                  dayPickerClassNames.button_previous,
                  'flex h-9 w-9',
                  'items-center justify-center',
                  'rounded-xl',
                  'border border-[var(--sloty-border)]',
                  'bg-[var(--sloty-bg)]',
                  'text-[var(--sloty-primary)]',
                  'transition-colors duration-150',
                  'hover:bg-[var(--sloty-soft-mint)]',
                  'focus-visible:outline-none',
                  'focus-visible:ring-2',
                  'focus-visible:ring-[var(--sloty-primary)]/20',
                ].join(' '),

                button_next: [
                  dayPickerClassNames.button_next,
                  'flex h-9 w-9',
                  'items-center justify-center',
                  'rounded-xl',
                  'border border-[var(--sloty-border)]',
                  'bg-[var(--sloty-bg)]',
                  'text-[var(--sloty-primary)]',
                  'transition-colors duration-150',
                  'hover:bg-[var(--sloty-soft-mint)]',
                  'focus-visible:outline-none',
                  'focus-visible:ring-2',
                  'focus-visible:ring-[var(--sloty-primary)]/20',
                ].join(' '),

                month_grid: [
                  dayPickerClassNames.month_grid,
                  'w-full table-fixed border-collapse',
                ].join(' '),

                weekdays: dayPickerClassNames.weekdays,

                weekday: [
                  dayPickerClassNames.weekday,
                  'h-9 text-center',
                  'text-xs font-bold',
                  'text-[var(--sloty-text-muted)]',
                ].join(' '),

                week: dayPickerClassNames.week,

                day: [
                  dayPickerClassNames.day,
                  'h-11 p-0 text-center align-middle',
                ].join(' '),

                selected: dayPickerClassNames.selected,
                today: dayPickerClassNames.today,
                outside: dayPickerClassNames.outside,
                disabled: dayPickerClassNames.disabled,

                chevron: [
                  dayPickerClassNames.chevron,
                  'fill-none text-[var(--sloty-primary)]',
                ].join(' '),
              }}
              components={{
                DayButton: SlotyCalendarDayButton,

                Chevron: ({
                  className,
                  orientation,
                  size,
                }) => {
                  if (orientation === 'right') {
                    return (
                      <ChevronRight
                        aria-hidden="true"
                        className={className}
                        size={size}
                        strokeWidth={1.8}
                      />
                    )
                  }

                  return (
                    <ChevronLeft
                      aria-hidden="true"
                      className={className}
                      size={size}
                      strokeWidth={1.8}
                    />
                  )
                },
              }}
              defaultMonth={selectedDate}
              dir="rtl"
              fixedWeeks
              locale={arSA}
              mode="single"
              onSelect={handleCalendarChange}
              required
              selected={selectedDate}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
