import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  getApiErrorMessage,
  getFirstFieldErrorMessage,
} from '../../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../../core/api/apiClient'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppDateNavigator } from '../../../../shared/components/AppDateNavigator/AppDateNavigator'
import { AppSelect } from '../../../../shared/components/AppSelect/AppSelect'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { UnsavedChangesPrompt } from '../../../../shared/components/AppSheet/UnsavedChangesPrompt'
import { listCourts } from '../../../courts/courtsApi'
import type { Court } from '../../../courts/courts.types'
import type { ScheduleBooking } from '../../../schedule/schedule.types'
import {
  formatBookingDateTime,
  formatTime12Hour,
  getEgyptDateValueFromInstant,
  isPastSlot,
  mapBookingSlotsResponseToScheduleBookings,
} from '../../../schedule/scheduleBoard.helpers'
import { listBookingSlots } from '../../../schedule/scheduleApi'
import type {
  BookingListItem,
  BookingReschedulePayload,
} from '../../../schedule/scheduleApi.types'

export interface RescheduleBookingSheetProps {
  assignedCourtId: number | null
  booking: BookingListItem
  canChooseCourt: boolean
  clubSlug: string
  error: string | null
  fieldErrors?: Record<string, ApiFieldError[]> | null
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: BookingReschedulePayload) => Promise<void>
}

/**
 * Moves a HOLD/CONFIRMED booking to a backend-available slot.
 *
 * Availability and final validity stay on the slots/reschedule endpoints.
 */
export function RescheduleBookingSheet({
  assignedCourtId,
  booking,
  canChooseCourt,
  clubSlug,
  error,
  fieldErrors = null,
  isSubmitting,
  onClose,
  onSubmit,
}: RescheduleBookingSheetProps) {
  const lockedCourtId = assignedCourtId ?? booking.court
  const [selectedCourtId, setSelectedCourtId] = useState(String(lockedCourtId))
  const [selectedDate, setSelectedDate] = useState(
    getEgyptDateValueFromInstant(booking.start_time),
  )
  const [selectedSlot, setSelectedSlot] = useState<ScheduleBooking | null>(null)
  const [reason, setReason] = useState('')
  const [courts, setCourts] = useState<Court[]>([])
  const [slots, setSlots] = useState<ScheduleBooking[]>([])
  const [isSlotsLoading, setIsSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [courtsWarning, setCourtsWarning] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const [slotsRefreshKey, setSlotsRefreshKey] = useState(0)
  const courtFieldError = getFirstFieldErrorMessage(fieldErrors, 'court')
  const startFieldError = getFirstFieldErrorMessage(fieldErrors, 'start_time')
  const reasonFieldError = getFirstFieldErrorMessage(fieldErrors, 'reason')
  const courtId = Number(selectedCourtId)
  const isDirty = selectedSlot !== null || reason.length > 0
  const availableSlots = useMemo(
    () =>
      slots.filter(
        (slot) =>
          slot.isAvailable === true &&
          !isPastSlot(selectedDate, slot.endTime),
      ),
    [selectedDate, slots],
  )
  const amSlots = availableSlots.filter((slot) => slot.period === 'am')
  const pmSlots = availableSlots.filter((slot) => slot.period === 'pm')

  useEffect(() => {
    if (!canChooseCourt) {
      return
    }

    let cancelled = false

    async function loadCourts(): Promise<void> {
      try {
        const response = await listCourts(clubSlug)

        if (cancelled) {
          return
        }

        setCourts(response.results.filter((court) => court.is_active))
        setCourtsWarning(null)
      } catch (caught: unknown) {
        if (cancelled) {
          return
        }

        setCourtsWarning(
          getApiErrorMessage(caught, 'تعذر تحميل قائمة الملاعب.'),
        )
      }
    }

    void loadCourts()

    return () => {
      cancelled = true
    }
  }, [canChooseCourt, clubSlug])

  useEffect(() => {
    if (!Number.isFinite(courtId) || courtId <= 0) {
      return
    }

    let cancelled = false

    async function loadSlots(): Promise<void> {
      setIsSlotsLoading(true)
      setSlotsError(null)

      try {
        const response = await listBookingSlots(clubSlug, {
          court: courtId,
          date: selectedDate,
        })

        if (cancelled) {
          return
        }

        setSlots(mapBookingSlotsResponseToScheduleBookings(response))
        setIsSlotsLoading(false)
      } catch (caught: unknown) {
        if (cancelled) {
          return
        }

        setSlots([])
        setSlotsError(
          getApiErrorMessage(caught, 'تعذر تحميل المواعيد المتاحة.'),
        )
        setIsSlotsLoading(false)
      }
    }

    void loadSlots()

    return () => {
      cancelled = true
    }
  }, [clubSlug, courtId, selectedDate, slotsRefreshKey])

  function requestClose(): boolean | void {
    if (isDirty) {
      setIsDiscardPromptOpen(true)
      return false
    }

    onClose()
  }

  function handleDateChange(date: string): void {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  function handleCourtChange(value: string): void {
    setSelectedCourtId(value)
    setSelectedSlot(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedSlot) {
      setValidationError('اختار معاد متاح.')
      return
    }

    setValidationError(null)
    const payload: BookingReschedulePayload = {
      court: courtId,
      start_time: formatBookingDateTime(selectedDate, selectedSlot.startTime),
      end_time: formatBookingDateTime(selectedDate, selectedSlot.endTime),
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    }

    try {
      await onSubmit(payload)
    } catch {
      setSlotsRefreshKey((value) => value + 1)
    }
  }

  function renderSlotGroup(title: string, group: ScheduleBooking[]) {
    if (group.length === 0) {
      return null
    }

    return (
      <div className="space-y-2">
        <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
          {title}
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {group.map((slot) => {
            const isSelected = selectedSlot?.id === slot.id

            return (
              <button
                className={[
                  'rounded-2xl border px-2 py-3 text-sm font-black',
                  isSelected
                    ? 'sloty-green-surface-button border-[var(--sloty-primary-dark)] text-white'
                    : 'border-[#22C55E] bg-white text-[var(--sloty-primary-dark)]',
                ].join(' ')}
                disabled={isSubmitting}
                key={slot.id}
                onClick={() => setSelectedSlot(slot)}
                type="button"
              >
                {formatTime12Hour(slot.startTime)}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      <AppSheet ariaLabel="تغيير الموعد" onRequestClose={requestClose}>
        <form className="p-5 pt-14" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
              تغيير الموعد
            </h2>
            <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
              اختار ملعب وتاريخ وميعاد متاح. التأكيد النهائي من النظام.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {canChooseCourt ? (
              <AppSelect
                disabled={isSubmitting}
                label="الملعب"
                onChange={handleCourtChange}
                options={
                  courts.length > 0
                    ? courts.map((court) => ({
                        value: String(court.id),
                        label: court.name,
                      }))
                    : [
                        {
                          value: String(booking.court),
                          label: `ملعب #${booking.court}`,
                        },
                      ]
                }
                value={selectedCourtId}
              />
            ) : null}
            {courtsWarning ? (
              <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900">
                {courtsWarning}
              </p>
            ) : null}
            {courtFieldError ? (
              <p className="text-xs font-bold text-[var(--sloty-danger)]">
                {courtFieldError}
              </p>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-bold text-[var(--sloty-text-primary)]">
                التاريخ
              </p>
              <AppDateNavigator
                onChange={handleDateChange}
                value={selectedDate}
              />
            </div>

            {isSlotsLoading ? (
              <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
                جاري تحميل المواعيد...
              </p>
            ) : null}

            {slotsError ? (
              <p className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
                {slotsError}
              </p>
            ) : null}

            {!isSlotsLoading && !slotsError ? (
              availableSlots.length === 0 ? (
                <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
                  مفيش مواعيد متاحة في اليوم ده.
                </p>
              ) : (
                <div className="space-y-4">
                  {renderSlotGroup('صباحًا', amSlots)}
                  {renderSlotGroup('مساءً', pmSlots)}
                </div>
              )
            ) : null}
            {startFieldError ? (
              <p className="text-xs font-bold text-[var(--sloty-danger)]">
                {startFieldError}
              </p>
            ) : null}

            <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>سبب التغيير (اختياري)</span>
              <textarea
                className="sloty-mobile-safe-input min-h-20 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                disabled={isSubmitting}
                onChange={(event) => setReason(event.target.value)}
                value={reason}
              />
            </label>
            {reasonFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {reasonFieldError}
              </p>
            ) : null}
          </div>

          {validationError || error ? (
            <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
              {validationError ?? error}
            </p>
          ) : null}

          <div className="mt-5">
            <AppButton
              disabled={isSubmitting || !selectedSlot}
              fullWidth
              type="submit"
              variant="primary"
            >
              {isSubmitting ? 'جاري تغيير الموعد...' : 'تأكيد تغيير الموعد'}
            </AppButton>
          </div>
        </form>
      </AppSheet>
      <UnsavedChangesPrompt
        isOpen={isDiscardPromptOpen}
        onContinueEditing={() => setIsDiscardPromptOpen(false)}
        onDiscard={() => {
          setIsDiscardPromptOpen(false)
          onClose()
        }}
      />
    </>
  )
}
